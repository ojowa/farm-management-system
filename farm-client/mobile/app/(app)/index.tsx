import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
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
import { useAppSelector, useAuth } from '@/modules/auth/hooks/useAuth';
import { usePermission } from '@/core/hooks/usePermission';
import { farmsAPI } from '@/modules/farm';
import { cropsAPI } from '@/modules/crop';
import { livestockAPI } from '@/modules/livestock';
import { poultryAPI } from '@/modules/poultry';
import { financeAPI, profitabilityAPI } from '@/modules/finance';
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

type FinanceSummary = {
  income: number;
  expenses: number;
  net: number;
};

type DashboardAlert = {
  key: string;
  severity: 'warning' | 'destructive';
  title: string;
  description: string;
  action: string;
  route: string;
};

// Create shortcuts mirroring the admin dashboard's quick actions, pointed at
// the mobile `add.tsx` routes and gated by the same permission strings the
// sidebar config / admin routePermissions use.
const QUICK_ACTIONS = [
  { key: 'farm', label: 'Add Farm', icon: '🌾', route: '/farms/add', permission: 'farm.write' },
  { key: 'crop', label: 'New Crop', icon: '🌱', route: '/crops/add', permission: 'crop.write' },
  { key: 'livestock', label: 'Add Livestock', icon: '🐄', route: '/livestock/add', permission: 'livestock.write' },
  { key: 'poultry', label: 'Add Poultry', icon: '🥚', route: '/poultry/add', permission: 'poultry.write' },
  { key: 'aquaculture', label: 'Stock Pond', icon: '🐟', route: '/aquaculture/add', permission: 'aquaculture.write' },
  { key: 'finance', label: 'Record Transaction', icon: '💰', route: '/finance/add', permission: 'finance.write' },
  { key: 'worker', label: 'Add Worker', icon: '👷', route: '/workers/add', permission: 'hr.write' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const isOnline = useAppSelector((state) => state.sync.isOnline);
  const { logout } = useAuth();
  const { hasPermission } = usePermission();
  const { colors: themeColors, isDark } = useAppTheme();
  const { error: showError } = useToasts();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    activeFarms: 0,
    totalCrops: 0,
    totalLivestock: 0,
    totalPoultry: 0,
  });
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [pendingTasksTotal, setPendingTasksTotal] = useState(0);
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
        expensesRes,
        profitabilityRes,
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
        financeAPI.listExpenses(),
        profitabilityAPI.summary(),
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
        const message = describeApiError(firstError, 'Couldn’t load your dashboard. Please try again.');
        setLoadError(message);
        return;
      }

      const farms = farmsRes.status === 'fulfilled' ? (farmsRes.value?.data || []) : [];
      const crops = cropsRes.status === 'fulfilled' ? (cropsRes.value?.data || []) : [];
      const livestock = livestockRes.status === 'fulfilled' ? (livestockRes.value?.data || []) : [];
      const poultry = poultryRes.status === 'fulfilled' ? (poultryRes.value?.data || []) : [];

      // Prefer the server's pagination total when present; fall back to the
      // loaded array length (list endpoints only paginate when `page` is sent,
      // so the array is normally the whole set anyway).
      const countOf = (res: PromiseSettledResult<any>, list: any[]) =>
        res.status === 'fulfilled' ? (res.value?.total ?? list.length) : list.length;

      const totalLivestock = livestock.reduce(
        (sum: number, item: any) => sum + (item.quantity || 0),
        0
      );
      const totalPoultry = poultry.reduce(
        (sum: number, item: any) => sum + (item.quantity || 0),
        0
      );

      setStats({
        activeFarms: farms.filter((f: any) => f.status === 'active').length,
        totalCrops: countOf(cropsRes, crops),
        totalLivestock,
        totalPoultry,
      });

      // ── Financial summary ──────────────────────────────────────────────
      // Primary source is GET /profitability/summary (same as the admin
      // dashboard). When that endpoint is unavailable (older server, or the
      // caller lacks finance scope), fall back to summing the raw sales and
      // expenses lists client-side. Sales store their value in `total` (or
      // quantity × price) — not `amount` — so a naive `amount` filter drops
      // every row and revenue always renders $0.
      const sales = salesRes.status === 'fulfilled' ? ((salesRes.value?.data as any[]) || []) : [];
      const expenseRows = expensesRes.status === 'fulfilled' ? ((expensesRes.value?.data as any[]) || []) : [];
      const salesSum = sales.reduce((sum: number, sale: any) => {
        const raw = sale?.total ?? (sale?.quantity || 0) * (sale?.price || 0);
        const amount = Math.abs(raw || 0);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0);
      const expenseSum = expenseRows.reduce(
        (sum: number, row: any) => sum + Math.abs(row?.amount || 0),
        0
      );
      const profitSummary =
        profitabilityRes.status === 'fulfilled' ? (profitabilityRes.value?.data ?? null) : null;
      const income = profitSummary?.totalRevenue ?? salesSum;
      const expenses = profitSummary?.totalExpenses ?? expenseSum;
      const net = profitSummary?.netProfit ?? income - expenses;
      const financeFailed =
        salesRes.status === 'rejected' &&
        expensesRes.status === 'rejected' &&
        profitabilityRes.status === 'rejected';

      setFinance(financeFailed ? null : { income, expenses, net });

      const tasks = tasksRes.status === 'fulfilled' ? (tasksRes.value?.data || []) : [];
      const notifs = notifsRes.status === 'fulfilled' ? (notifsRes.value?.data || []) : [];

      // GET /attendance/today answers `{ records, summary }`; older callers (and
      // this screen's tests) still hand back a bare array — accept both so a
      // shape change can never masquerade as "No attendance data".
      const todayPayload: any =
        attendanceRes.status === 'fulfilled' ? attendanceRes.value?.data : null;
      const attendanceList: any[] = Array.isArray(todayPayload)
        ? todayPayload
        : Array.isArray(todayPayload?.records)
        ? todayPayload.records
        : [];
      const serverSummary =
        !Array.isArray(todayPayload) && todayPayload?.summary ? todayPayload.summary : null;

      const attendanceSummary = serverSummary
        ? {
            total: serverSummary.total ?? attendanceList.length,
            present: serverSummary.present ?? 0,
            absent: serverSummary.absent ?? 0,
            late: serverSummary.late ?? 0,
          }
        : attendanceList.length > 0
        ? {
            total: attendanceList.length,
            present: attendanceList.filter((a: any) => a.status === 'PRESENT').length,
            absent: attendanceList.filter((a: any) => a.status === 'ABSENT').length,
            late: attendanceList.filter((a: any) => a.status === 'LATE').length,
          }
        : null;

      // Record per-section failures so each section can render its own
      // retryable error instead of pretending the data is simply empty.
      const firstFinanceFailure = [salesRes, expensesRes, profitabilityRes].find(
        (r) => r.status === 'rejected'
      ) as PromiseRejectedResult | undefined;
      setSectionErrors({
        finance: financeFailed && firstFinanceFailure
          ? describeApiError(firstFinanceFailure.reason, 'Couldn’t load your financial summary.')
          : null,
        tasks: tasksRes.status === 'rejected'
          ? describeApiError((tasksRes as PromiseRejectedResult).reason, 'Couldn’t load your pending tasks.')
          : null,
        attendance: attendanceRes.status === 'rejected'
          ? describeApiError((attendanceRes as PromiseRejectedResult).reason, 'Couldn’t load today’s attendance.')
          : null,
        activity: notifsRes.status === 'rejected'
          ? describeApiError((notifsRes as PromiseRejectedResult).reason, 'Couldn’t load recent activity.')
          : null,
      });

      setPendingTasks(tasks.slice(0, 5));
      setPendingTasksTotal(tasksRes.status === 'fulfilled' ? ((tasksRes.value as any)?.total ?? tasks.length) : 0);
      setAttendanceSummary(attendanceSummary);
      setRecentActivity(Array.isArray(notifs) ? notifs.slice(0, 5) : []);
      setUnreadNotifs(unreadRes.status === 'fulfilled' ? (unreadRes.value?.data?.count ?? 0) : 0);

      // Any successful load clears the full-screen error even when silent, so
      // a background retry (reconnect / refocus) can recover the dashboard
      // without the user tapping Retry.
      setLoadError(null);
    } catch (error) {
      const message = describeApiError(error, 'Couldn’t load your dashboard. Please try again.');
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

  // Same confirm-then-sign-out flow as the sidebar footer and settings screen.
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout?.();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

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

  // Operational alerts, mirroring the admin dashboard: absent workers,
  // tasks still pending, and spending more than the farm earns.
  const alerts: DashboardAlert[] = [];
  if (attendanceSummary && attendanceSummary.absent > 0) {
    alerts.push({
      key: 'absent',
      severity: 'warning',
      title: 'Workers absent today',
      description: `${attendanceSummary.absent} worker(s) marked absent`,
      action: 'Attendance',
      route: '/attendance',
    });
  }
  if (pendingTasksTotal > 0) {
    alerts.push({
      key: 'tasks',
      severity: 'warning',
      title: 'Tasks awaiting completion',
      description: `${pendingTasksTotal} pending task(s) assigned`,
      action: 'Tasks',
      route: '/tasks',
    });
  }
  if (finance && finance.net < 0 && finance.income > 0) {
    alerts.push({
      key: 'spend',
      severity: 'destructive',
      title: 'Expenses exceed income',
      description: 'Running costs are currently higher than revenue',
      action: 'Finance',
      route: '/finance',
    });
  }

  const permittedActions = QUICK_ACTIONS.filter((action) => hasPermission(action.permission));

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
    alertWarning: {
      backgroundColor: isDark ? '#3A2E07' : '#FFFBEB',
      borderColor: isDark ? '#92400E' : '#FDE68A',
    },
    alertDestructive: {
      backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
      borderColor: isDark ? '#991B1B' : '#FECACA',
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
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.headerGear}
              accessibilityRole="button"
              accessibilityLabel="Log out"
            >
              <Text style={styles.headerGearText}>🚪</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {/* Overview */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Overview</Text>
            <View style={styles.statsRow}>
              <Card
                style={[styles.statCard, dynamicStyles.cardBackground]}
                onPress={() => router.push('/farms')}
                accessibilityLabel={`Active Farms: ${stats.activeFarms}`}
              >
                <Text style={[styles.statLabel, dynamicStyles.statLabel]}>🌾 Active Farms</Text>
                <Text style={[styles.statValue, dynamicStyles.statValue]}>{stats.activeFarms}</Text>
              </Card>
              <Card
                style={[styles.statCard, dynamicStyles.cardBackground]}
                onPress={() => router.push('/crops')}
                accessibilityLabel={`Total Crops: ${stats.totalCrops}`}
              >
                <Text style={[styles.statLabel, dynamicStyles.statLabel]}>🌱 Total Crops</Text>
                <Text style={[styles.statValue, dynamicStyles.statValue]}>{stats.totalCrops}</Text>
              </Card>
            </View>
            <View style={styles.statsRow}>
              <Card
                style={[styles.statCard, dynamicStyles.cardBackground]}
                onPress={() => router.push('/livestock')}
                accessibilityLabel={`Livestock: ${stats.totalLivestock}`}
              >
                <Text style={[styles.statLabel, dynamicStyles.statLabel]}>🐄 Livestock</Text>
                <Text style={[styles.statValue, dynamicStyles.statValue]}>{stats.totalLivestock}</Text>
              </Card>
              <Card
                style={[styles.statCard, dynamicStyles.cardBackground]}
                onPress={() => router.push('/poultry')}
                accessibilityLabel={`Poultry: ${stats.totalPoultry}`}
              >
                <Text style={[styles.statLabel, dynamicStyles.statLabel]}>🥚 Poultry</Text>
                <Text style={[styles.statValue, dynamicStyles.statValue]}>{stats.totalPoultry}</Text>
              </Card>
            </View>
          </View>

          {/* Financial Summary */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Financial Summary</Text>
              <TouchableOpacity
                onPress={() => router.push('/finance/profitability')}
                accessibilityRole="button"
                accessibilityLabel="View profitability report"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ color: themeColors.primary, fontSize: 14, fontWeight: '600' }}>Profitability</Text>
              </TouchableOpacity>
            </View>
            <Card style={[styles.financeCard, dynamicStyles.cardBackground]}>
              <View style={styles.financeRow}>
                <Text style={[styles.quickActionDescription, dynamicStyles.actionDesc]}>Total Income</Text>
                <Text
                  style={[styles.financeValue, { color: '#16A34A' }]}
                  accessibilityLabel={finance ? `Total Income: ${formatCurrency(finance.income)}` : 'Total Income: unavailable'}
                >
                  {finance ? formatCurrency(finance.income) : '—'}
                </Text>
              </View>
              <View style={styles.financeDivider} />
              <View style={styles.financeRow}>
                <Text style={[styles.quickActionDescription, dynamicStyles.actionDesc]}>Total Expenses</Text>
                <Text
                  style={[styles.financeValue, { color: '#DC2626' }]}
                  accessibilityLabel={finance ? `Total Expenses: ${formatCurrency(finance.expenses)}` : 'Total Expenses: unavailable'}
                >
                  {finance ? formatCurrency(finance.expenses) : '—'}
                </Text>
              </View>
              <View style={styles.financeDivider} />
              <View style={styles.financeRow}>
                <Text style={[styles.quickActionDescription, dynamicStyles.actionDesc]}>Net Profit</Text>
                <Text
                  style={[
                    styles.financeValue,
                    { color: (finance?.net ?? 0) >= 0 ? '#16A34A' : '#DC2626' },
                  ]}
                  accessibilityLabel={finance ? `Net Profit: ${formatCurrency(finance.net)}` : 'Net Profit: unavailable'}
                >
                  {finance ? formatCurrency(finance.net) : '—'}
                </Text>
              </View>
            </Card>
            {sectionErrors.finance && (
              <>
                <Text
                  style={[
                    styles.quickActionDescription,
                    dynamicStyles.actionDesc,
                    { marginTop: 8 },
                  ]}
                >
                  {sectionErrors.finance}
                </Text>
                <TouchableOpacity
                  onPress={retryLoad}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading financial summary"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ color: themeColors.primary, fontSize: 14, fontWeight: '600', marginTop: 6 }}>
                    Retry
                  </Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              onPress={() => router.push('/finance')}
              style={[styles.viewAllButton, { borderColor: themeColors.border }]}
              accessibilityRole="button"
              accessibilityLabel="View finance"
            >
              <Text style={{ color: themeColors.primary, fontSize: 14, fontWeight: '600' }}>View Finance →</Text>
            </TouchableOpacity>
          </View>

          {/* Alerts */}
          {alerts.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Alerts</Text>
              {alerts.map((alert) => (
                <Card
                  key={alert.key}
                  style={[
                    styles.alertCard,
                    alert.severity === 'destructive'
                      ? dynamicStyles.alertDestructive
                      : dynamicStyles.alertWarning,
                  ]}
                  onPress={() => router.push(alert.route)}
                  accessibilityLabel={`${alert.title}. ${alert.description}`}
                >
                  <View style={styles.alertRow}>
                    <Text style={styles.alertIcon}>⚠️</Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: alert.severity === 'destructive' ? '#DC2626' : '#B45309',
                        }}
                      >
                        {alert.title}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: alert.severity === 'destructive' ? '#B91C1C' : '#92400E',
                          marginTop: 2,
                        }}
                      >
                        {alert.description}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: alert.severity === 'destructive' ? '#DC2626' : '#B45309',
                        marginLeft: 8,
                      }}
                    >
                      {alert.action} →
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          )}

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

          {/* Quick Actions — create shortcuts, permission-gated like admin */}
          {permittedActions.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Quick Actions</Text>
              <View style={styles.quickGrid}>
                {permittedActions.map((action) => (
                  <Card
                    key={action.key}
                    style={[styles.quickGridItem, dynamicStyles.cardBackground]}
                    onPress={() => router.push(action.route)}
                    accessibilityLabel={action.label}
                  >
                    <Text style={styles.quickGridIcon}>{action.icon}</Text>
                    <Text
                      style={[styles.quickGridLabel, dynamicStyles.actionTitle]}
                      numberOfLines={1}
                    >
                      {action.label}
                    </Text>
                  </Card>
                ))}
              </View>
            </View>
          )}

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
  financeCard: {
    padding: 16,
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  financeValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  financeDivider: {
    height: 1,
    opacity: 0.15,
    backgroundColor: '#9CA3AF',
    marginVertical: 2,
  },
  viewAllButton: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  alertCard: {
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertIcon: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 1,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickGridItem: {
    width: '47%',
    padding: 14,
    alignItems: 'flex-start',
  },
  quickGridIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  quickGridLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
