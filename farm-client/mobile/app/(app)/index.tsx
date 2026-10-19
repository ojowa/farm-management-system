import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MenuButton } from '@/core/ui/MenuButton';
import { useAppSelector } from '@/modules/auth/hooks/useAuth';
import { farmsAPI } from '@/modules/farm';
import { cropsAPI } from '@/modules/crop';
import { livestockAPI } from '@/modules/livestock';
import { poultryAPI } from '@/modules/poultry';
import { financeAPI } from '@/modules/finance';
import { tasksAPI } from '@/modules/worker';
import { attendanceAPI } from '@/modules/hr';
import { notificationsAPI } from '@/modules/notification';
import { Card } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { formatCurrency } from '@/core/utils/currency';

// Per-section load failures. These are kept separate from the full-screen
// `loadError` (which only triggers when every core list fails) so a dropped
// connection shows a retryable error in the affected section instead of
// masquerading as "No pending tasks" / "No attendance data".
type DashboardSectionErrors = {
  finance: string | null;
  tasks: string | null;
  attendance: string | null;
  activity: string | null;
};

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const isOnline = useAppSelector((state) => state.sync.isOnline);
  const { colors: themeColors, isDark } = useAppTheme();
  const { error: showError } = useToasts();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    activeFarms: 0,
    totalCrops: 0,
    totalLivestock: 0,
    totalRevenue: 0,
  });
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<{ total: number; present: number; absent: number; late: number } | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [recentActivity, setRecentActivity] = useState<{ id: string; title: string; message: string; type: string; createdAt: string }[]>([]);
  const [sectionErrors, setSectionErrors] = useState<DashboardSectionErrors>({
    finance: null,
    tasks: null,
    attendance: null,
    activity: null,
  });

  const loadDashboardData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoadError(null);

      const [
        farmsRes,
        cropsRes,
        livestockRes,
        poultryRes,
        salesRes,
        tasksRes,
        attendanceRes,
        notifsRes,
        unreadRes,
      ] = await Promise.allSettled([
        farmsAPI.list(),
        cropsAPI.list(),
        livestockAPI.list(),
        poultryAPI.list(),
        financeAPI.listSales(),
        tasksAPI.list({ status: 'PENDING', limit: 5 }),
        attendanceAPI.getToday(),
        user?.id ? notificationsAPI.list(user.id, { limit: 5 }) : Promise.resolve({ data: [] }),
        user?.id ? notificationsAPI.unreadCount(user.id) : Promise.resolve({ data: { count: 0 } }),
      ]);

      const allCoreFailed =
        farmsRes.status === 'rejected' &&
        cropsRes.status === 'rejected' &&
        livestockRes.status === 'rejected' &&
        poultryRes.status === 'rejected';

      if (allCoreFailed) {
        const firstError = (farmsRes as PromiseRejectedResult).reason;
        const message = describeApiError(firstError, 'Couldn\u2019t load your dashboard. Please try again.');
        setLoadError(message);
        return;
      }

      const farms = farmsRes.status === 'fulfilled' ? (farmsRes.value?.data || []) : [];
      const crops = cropsRes.status === 'fulfilled' ? (cropsRes.value?.data || []) : [];
      const livestock = livestockRes.status === 'fulfilled' ? (livestockRes.value?.data || []) : [];
      const poultry = poultryRes.status === 'fulfilled' ? (poultryRes.value?.data || []) : [];

      // Revenue is summed straight from GET /sales. The old code used
      // financeAPI.list() (raw expenses + sales merged) and filtered for
      // `type === 'income'`, but neither raw shape carries `type`, and sales
      // store their value in `total` (or quantity × price) — not `amount` —
      // so the filter dropped every row and revenue always rendered as $0.
      const sales = salesRes.status === 'fulfilled' ? ((salesRes.value?.data as any[]) || []) : [];
      const totalRevenue = sales.reduce((sum: number, sale: any) => {
        const raw = sale?.total ?? (sale?.quantity || 0) * (sale?.price || 0);
        const amount = Math.abs(raw || 0);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0);

      const totalLivestock = [...livestock, ...poultry].reduce(
        (sum: number, item: any) => sum + (item.quantity || 0),
        0
      );

      setStats({
        activeFarms: farms.filter((f: any) => f.status === 'active').length,
        totalCrops: crops.length,
        totalLivestock,
        totalRevenue,
      });

      const tasks = tasksRes.status === 'fulfilled' ? (tasksRes.value?.data || []) : [];
      const attendanceList = attendanceRes.status === 'fulfilled' ? (attendanceRes.value?.data || []) : [];
      const notifs = notifsRes.status === 'fulfilled' ? (notifsRes.value?.data || []) : [];

      const attendanceSummary = attendanceList.length > 0
        ? {
            total: attendanceList.length,
            present: attendanceList.filter((a: any) => a.status === 'PRESENT').length,
            absent: attendanceList.filter((a: any) => a.status === 'ABSENT').length,
            late: attendanceList.filter((a: any) => a.status === 'LATE').length,
          }
        : null;

      // Record per-section failures so each section can render its own
      // retryable error instead of pretending the data is simply empty.
      setSectionErrors({
        finance: salesRes.status === 'rejected'
          ? describeApiError((salesRes as PromiseRejectedResult).reason, 'Couldn\u2019t load your revenue.')
          : null,
        tasks: tasksRes.status === 'rejected'
          ? describeApiError((tasksRes as PromiseRejectedResult).reason, 'Couldn\u2019t load your pending tasks.')
          : null,
        attendance: attendanceRes.status === 'rejected'
          ? describeApiError((attendanceRes as PromiseRejectedResult).reason, 'Couldn\u2019t load today\u2019s attendance.')
          : null,
        activity: notifsRes.status === 'rejected'
          ? describeApiError((notifsRes as PromiseRejectedResult).reason, 'Couldn\u2019t load recent activity.')
          : null,
      });

      setPendingTasks(tasks.slice(0, 5));
      setAttendanceSummary(attendanceSummary);
      setRecentActivity(Array.isArray(notifs) ? notifs.slice(0, 5) : []);
      setUnreadNotifs(unreadRes.status === 'fulfilled' ? (unreadRes.value?.data?.count ?? 0) : 0);

      // Any successful load clears the full-screen error even when silent, so
      // a background retry (reconnect / refocus) can recover the dashboard
      // without the user tapping Retry.
      setLoadError(null);
    } catch (error) {
      const message = describeApiError(error, 'Couldn\u2019t load your dashboard. Please try again.');
      setLoadError(message);
      if (!isSilent) showError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, showError]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData(true);
  }, [loadDashboardData]);

  // Single trigger: useFocusEffect runs on mount and whenever the screen
  // regains focus, so a separate useEffect here would double-fetch on mount.
  useFocusEffect(
    useCallback(() => {
      loadDashboardData(true);
    }, [loadDashboardData])
  );

  // Reconnect self-heal: when NetInfo flips `isOnline` back to true, quietly
  // reload if the last load left any section (or the whole screen) in an
  // error state — otherwise the user would sit on "No connection…" cards
  // until they noticed the pull-to-refresh.
  const wasOnlineRef = useRef(isOnline);
  useEffect(() => {
    const cameOnline = isOnline && !wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if (cameOnline && (loadError || Object.values(sectionErrors).some(Boolean))) {
      loadDashboardData(true);
    }
  }, [isOnline, loadError, sectionErrors, loadDashboardData]);

  // Shared retry for the per-section error cards — reloads everything
  // quietly (the load is one batched request anyway).
  const retryLoad = useCallback(() => {
    loadDashboardData(true);
  }, [loadDashboardData]);

  const firstName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return ` · Due ${date.toLocaleDateString()}`;
    } catch {
      return '';
    }
  };

  const formatActivityTime = (d?: string) => {
    if (!d) return '';
    try {
      const date = new Date(d);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      if (isNaN(diffMs)) return '';
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const formatRevenue = (amount: number) => formatCurrency(amount);

  const dynamicStyles = {
    container: {
      backgroundColor: themeColors.background,
    },
    header: {
      backgroundColor: themeColors.headerBg || themeColors.primary,
    },
    sectionTitle: {
      color: themeColors.text,
    },
    cardBackground: {
      backgroundColor: themeColors.card,
      borderColor: isDark ? themeColors.border : 'transparent',
      borderWidth: isDark ? 1 : 0,
    },
    statLabel: {
      color: themeColors.textSecondary,
    },
    statValue: {
      color: themeColors.primary,
    },
    actionTitle: {
      color: themeColors.text,
    },
    actionDesc: {
      color: themeColors.textSecondary,
    },
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, dynamicStyles.header, styles.headerRow]}>
          <MenuButton />
          <View style={styles.headerTexts}>
            <Text style={styles.greeting}>Welcome back, {firstName}! 👋</Text>
            <Text style={styles.subtitle}>Here’s an overview of your farm</Text>
          </View>
        </View>
        <ScreenLoading message="Fetching your farm overview…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, dynamicStyles.header, styles.headerRow]}>
          <MenuButton />
          <View style={styles.headerTexts}>
            <Text style={styles.greeting}>Welcome back, {firstName}! 👋</Text>
            <Text style={styles.subtitle}>Here’s an overview of your farm</Text>
          </View>
        </View>
        <StateView
          variant="error"
          title="Couldn’t load your dashboard"
          message={loadError}
          onRetry={() => {
            setLoading(true);
            loadDashboardData();
          }}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[themeColors.primary]}
            tintColor={themeColors.primary}
          />
        }
      >
        <View style={[styles.header, dynamicStyles.header, styles.headerRow]}>
          <MenuButton />
          <View style={styles.headerTexts}>
          <Text style={styles.greeting}>Welcome back, {firstName}! 👋</Text>
          <Text style={styles.subtitle}>Here’s an overview of your farm</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={() => router.push('/notifications')}
              style={styles.headerGear}
              accessibilityRole="button"
              accessibilityLabel={
                unreadNotifs > 0
                  ? `Notifications, ${unreadNotifs} unread`
                  : 'Notifications'
              }
            >
              <Text style={styles.headerGearText}>🔔</Text>
              {unreadNotifs > 0 && (
                <View style={styles.headerBellBadge}>
                  <Text style={styles.headerBellBadgeText}>
                    {unreadNotifs > 99 ? '99+' : unreadNotifs}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/settings')}
              style={styles.headerGear}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Text style={styles.headerGearText}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {/* Quick Stats */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Overview</Text>
            <View style={styles.statsRow}>
              <Card style={[styles.statCard, dynamicStyles.cardBackground]} accessibilityLabel={`Active Farms: ${stats.activeFarms}`}>
                <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Active Farms</Text>
                <Text style={[styles.statValue, dynamicStyles.statValue]}>{stats.activeFarms}</Text>
              </Card>
              <Card style={[styles.statCard, dynamicStyles.cardBackground]} accessibilityLabel={`Total Crops: ${stats.totalCrops}`}>
                <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Total Crops</Text>
                <Text style={[styles.statValue, dynamicStyles.statValue]}>{stats.totalCrops}</Text>
              </Card>
            </View>
            <View style={styles.statsRow}>
              <Card style={[styles.statCard, dynamicStyles.cardBackground]} accessibilityLabel={`Livestock: ${stats.totalLivestock}`}>
                <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Livestock</Text>
                <Text style={[styles.statValue, dynamicStyles.statValue]}>{stats.totalLivestock}</Text>
              </Card>
              <Card
                style={[styles.statCard, dynamicStyles.cardBackground]}
                accessibilityLabel={
                  sectionErrors.finance
                    ? 'Revenue failed to load'
                    : `Revenue: ${formatRevenue(stats.totalRevenue)}`
                }
              >
                <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Revenue</Text>
                <Text style={[styles.statValue, dynamicStyles.statValue]}>
                  {sectionErrors.finance ? '—' : formatRevenue(stats.totalRevenue)}
                </Text>
              </Card>
            </View>
            {sectionErrors.finance && (
              <Card style={[styles.quickActionCard, dynamicStyles.cardBackground]}>
                <Text style={[styles.quickActionDescription, dynamicStyles.actionDesc]}>
                  {sectionErrors.finance}
                </Text>
                <TouchableOpacity
                  onPress={retryLoad}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading revenue"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ color: themeColors.primary, fontSize: 14, fontWeight: '600', marginTop: 6 }}>
                    Retry
                  </Text>
                </TouchableOpacity>
              </Card>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Quick Actions</Text>

            <Card
              style={[styles.quickActionCard, dynamicStyles.cardBackground]}
              onPress={() => router.push('/farms')}
              accessibilityLabel="Navigate to Farms"
            >
              <View style={styles.quickActionRow}>
                <View style={styles.quickActionText}>
                  <Text style={[styles.quickActionTitle, dynamicStyles.actionTitle]}>Manage Farms</Text>
                  <Text style={[styles.quickActionDescription, dynamicStyles.actionDesc]}>
                    View and manage all your farms
                  </Text>
                </View>
                <Text style={styles.quickActionIcon}>🌾</Text>
              </View>
            </Card>

            <Card
              style={[styles.quickActionCard, dynamicStyles.cardBackground]}
              onPress={() => router.push('/crops')}
              accessibilityLabel="Navigate to Crops"
            >
              <View style={styles.quickActionRow}>
                <View style={styles.quickActionText}>
                  <Text style={[styles.quickActionTitle, dynamicStyles.actionTitle]}>Monitor Crops</Text>
                  <Text style={[styles.quickActionDescription, dynamicStyles.actionDesc]}>
                    Track crop health and yield
                  </Text>
                </View>
                <Text style={styles.quickActionIcon}>🌱</Text>
              </View>
            </Card>

            <Card
              style={[styles.quickActionCard, dynamicStyles.cardBackground]}
              onPress={() => router.push('/livestock')}
              accessibilityLabel="Navigate to Livestock"
            >
              <View style={styles.quickActionRow}>
                <View style={styles.quickActionText}>
                  <Text style={[styles.quickActionTitle, dynamicStyles.actionTitle]}>Livestock Management</Text>
                  <Text style={[styles.quickActionDescription, dynamicStyles.actionDesc]}>
                    Manage animals and health records
                  </Text>
                </View>
                <Text style={styles.quickActionIcon}>🐄</Text>
              </View>
            </Card>

            <Card
              style={[styles.quickActionCard, dynamicStyles.cardBackground]}
              onPress={() => router.push('/aquaculture')}
              accessibilityLabel="Navigate to Aquaculture"
            >
              <View style={styles.quickActionRow}>
                <View style={styles.quickActionText}>
                  <Text style={[styles.quickActionTitle, dynamicStyles.actionTitle]}>Aquaculture</Text>
                  <Text style={[styles.quickActionDescription, dynamicStyles.actionDesc]}>
                    Manage ponds, stocking and harvests
                  </Text>
                </View>
                <Text style={styles.quickActionIcon}>🐟</Text>
              </View>
            </Card>

            <Card
              style={[styles.quickActionCard, dynamicStyles.cardBackground]}
              onPress={() => router.push('/finance')}
              accessibilityLabel="Navigate to Finance"
            >
              <View style={styles.quickActionRow}>
                <View style={styles.quickActionText}>
                  <Text style={[styles.quickActionTitle, dynamicStyles.actionTitle]}>Financial Reports</Text>
                  <Text style={[styles.quickActionDescription, dynamicStyles.actionDesc]}>
                    Review income and expenses
                  </Text>
                </View>
                <Text style={styles.quickActionIcon}>💰</Text>
              </View>
            </Card>
          </View>

          {/* Pending Tasks */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Pending Tasks</Text>
              <TouchableOpacity
                onPress={() => router.push('/tasks')}
                accessibilityRole="button"
                accessibilityLabel="View all pending tasks"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ color: themeColors.primary, fontSize: 14, fontWeight: '600' }}>View all</Text>
              </TouchableOpacity>
            </View>
            {sectionErrors.tasks ? (
              <StateView
                variant="error"
                title="Couldn’t load tasks"
                message={sectionErrors.tasks}
                onRetry={retryLoad}
                retryLabel="Retry"
                style={styles.sectionState}
              />
            ) : pendingTasks.length === 0 ? (
              <Card style={[styles.quickActionCard, dynamicStyles.cardBackground]}>
                <Text style={[styles.quickActionDescription, dynamicStyles.actionDesc]}>No pending tasks</Text>
              </Card>
            ) : (
              pendingTasks.map((task: any) => (
                <Card
                  key={task.id}
                  style={[styles.quickActionCard, dynamicStyles.cardBackground]}
                  onPress={() => router.push(`/tasks/${task.id}`)}
                  accessibilityLabel={`Task: ${task.title}, Priority: ${task.priority}`}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.quickActionTitle, dynamicStyles.actionTitle]} numberOfLines={1}>{task.title}</Text>
                      <Text style={[styles.quickActionDescription, dynamicStyles.actionDesc]}>
                        {task.assignedToName || 'Unassigned'}{formatDueDate(task.dueDate)}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: task.priority === 'URGENT'
                          ? (isDark ? '#7F1D1D' : '#FEE2E2')
                          : task.priority === 'HIGH'
                          ? (isDark ? '#7C2D12' : '#FFEDD5')
                          : (isDark ? '#374151' : '#F3F4F6'),
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: task.priority === 'URGENT'
                            ? (isDark ? '#FCA5A5' : '#DC2626')
                            : task.priority === 'HIGH'
                            ? (isDark ? '#FDBA74' : '#EA580C')
                            : (isDark ? '#D1D5DB' : '#6B7280'),
                        }}
                      >
                        {task.priority}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </View>

          {/* Today's Attendance */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Today's Attendance</Text>
              <TouchableOpacity
                onPress={() => router.push('/attendance')}
                accessibilityRole="button"
                accessibilityLabel="View all attendance records"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ color: themeColors.primary, fontSize: 14, fontWeight: '600' }}>View all</Text>
              </TouchableOpacity>
            </View>
            {sectionErrors.attendance ? (
              <StateView
                variant="error"
                title="Couldn’t load attendance"
                message={sectionErrors.attendance}
                onRetry={retryLoad}
                retryLabel="Retry"
                style={styles.sectionState}
              />
            ) : attendanceSummary ? (
              <>
                <View style={styles.statsRow}>
                  <Card style={[styles.statCard, dynamicStyles.cardBackground]} accessibilityLabel={`Present: ${attendanceSummary.present}`}>
                    <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Present</Text>
                    <Text style={[styles.statValue, { color: '#16A34A' }]}>{attendanceSummary.present}</Text>
                  </Card>
                  <Card style={[styles.statCard, dynamicStyles.cardBackground]} accessibilityLabel={`Absent: ${attendanceSummary.absent}`}>
                    <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Absent</Text>
                    <Text style={[styles.statValue, { color: '#DC2626' }]}>{attendanceSummary.absent}</Text>
                  </Card>
                </View>
                <View style={styles.statsRow}>
                  <Card style={[styles.statCard, dynamicStyles.cardBackground]} accessibilityLabel={`Late: ${attendanceSummary.late}`}>
                    <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Late</Text>
                    <Text style={[styles.statValue, { color: '#D97706' }]}>{attendanceSummary.late}</Text>
                  </Card>
                  <Card style={[styles.statCard, dynamicStyles.cardBackground]} accessibilityLabel={`Total records today: ${attendanceSummary.total}`}>
                    <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Total</Text>
                    <Text style={[styles.statValue, dynamicStyles.statValue]}>{attendanceSummary.total}</Text>
                  </Card>
                </View>
              </>
            ) : (
              <Card style={[styles.quickActionCard, dynamicStyles.cardBackground]}>
                <Text style={[styles.quickActionDescription, dynamicStyles.actionDesc]}>No attendance data</Text>
              </Card>
            )}
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Recent Activity</Text>
              <TouchableOpacity
                onPress={() => router.push('/notifications')}
                accessibilityRole="button"
                accessibilityLabel="View all notifications"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ color: themeColors.primary, fontSize: 14, fontWeight: '600' }}>View all</Text>
              </TouchableOpacity>
            </View>
            {sectionErrors.activity ? (
              <StateView
                variant="error"
                title="Couldn’t load activity"
                message={sectionErrors.activity}
                onRetry={retryLoad}
                retryLabel="Retry"
                style={styles.sectionState}
              />
            ) : recentActivity.length === 0 ? (
              <Card style={[styles.quickActionCard, dynamicStyles.cardBackground]}>
                <Text style={[styles.quickActionDescription, dynamicStyles.actionDesc]}>No recent activity</Text>
              </Card>
            ) : (
              recentActivity.map((item) => (
                <Card key={item.id} style={[styles.quickActionCard, dynamicStyles.cardBackground]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.quickActionTitle, dynamicStyles.actionTitle]}>{item.title}</Text>
                      <Text style={[styles.quickActionDescription, dynamicStyles.actionDesc]} numberOfLines={2}>{item.message}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: themeColors.textSecondary, marginLeft: 8 }}>
                      {formatActivityTime(item.createdAt)}
                    </Text>
                  </View>
                </Card>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTexts: {
    flex: 1,
  },
  headerGear: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerGearText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
  },
  headerBellBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  // Inline override for StateView inside a ScrollView section: neutralize
  // its flex:1 full-screen sizing so it renders as a compact section card.
  sectionState: {
    flex: 0,
    paddingVertical: 24,
  },
  quickActionCard: {
    padding: 16,
    marginBottom: 12,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickActionText: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  quickActionDescription: {
    fontSize: 13,
  },
  quickActionIcon: {
    fontSize: 24,
    marginLeft: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
});
