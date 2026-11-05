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
import { useDashboardConfig } from '@/core/hooks/useDashboardConfig';
import { MobileDashboardRenderer } from '@/core/dashboard/MobileDashboardRenderer';
import { farmsAPI } from '@/modules/farm';
import { cropsAPI } from '@/modules/crop';
import { livestockAPI } from '@/modules/livestock';
import { poultryAPI } from '@/modules/poultry';
import { aquacultureAPI } from '@/modules/aquaculture';
import { financeAPI, profitabilityAPI } from '@/modules/finance';
import { tasksAPI } from '@/modules/worker';
import { attendanceAPI } from '@/modules/hr';
import { notificationsAPI } from '@/modules/notification';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
import { unwrapList, totalOf } from '@/core/utils/listPayload';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { formatCurrencyWithCode } from '@/core/utils/currency';

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

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const currency = useAppSelector((state) => state.auth.currency || '');
  const isOnline = useAppSelector((state) => state.sync.isOnline);
  const { logout } = useAuth();
  const { hasPermission } = usePermission();
  const { colors: themeColors, isDark } = useAppTheme();
  const { error: showError } = useToasts();
  const { visibleCards, workingConfig, toggleCard, reorderCard, setCardRoles, resetToDefaults, saveConfig } =
    useDashboardConfig();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalFarms: 0,
    totalCrops: 0,
    totalLivestock: 0,
    totalPoultry: 0,
    totalPonds: 0,
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
        pondsRes,
        salesRes,
        expensesRes,
        profitabilityRes,
        tasksRes,
        attendanceRes,
        notifsRes,
        unreadRes,
      ] = await Promise.allSettled([
        farmsAPI.list({ limit: 1 }),
        cropsAPI.list({ limit: 1 }),
        livestockAPI.list({ limit: 1 }),
        poultryAPI.list({ limit: 1 }),
        aquacultureAPI.listPonds({ page: 1, limit: 1 }),
        financeAPI.listSales({ limit: 1000 }),
        financeAPI.listExpenses({ limit: 1000 }),
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

      const farms = farmsRes.status === 'fulfilled' ? unwrapList(farmsRes.value?.data) : [];
      const crops = cropsRes.status === 'fulfilled' ? unwrapList(cropsRes.value?.data) : [];
      const livestock = livestockRes.status === 'fulfilled' ? unwrapList(livestockRes.value?.data) : [];
      const poultry = poultryRes.status === 'fulfilled' ? unwrapList(poultryRes.value?.data) : [];
      const pondsRows = pondsRes.status === 'fulfilled' ? unwrapList(pondsRes.value?.data) : [];

      setStats({
        totalFarms: totalOf(farmsRes, farms),
        totalCrops: totalOf(cropsRes, crops),
        totalLivestock: totalOf(livestockRes, livestock),
        totalPoultry: totalOf(poultryRes, poultry),
        totalPonds: totalOf(pondsRes, pondsRows),
      });

      const sales = salesRes.status === 'fulfilled' ? unwrapList(salesRes.value?.data) : [];
      const expenseRows = expensesRes.status === 'fulfilled' ? unwrapList(expensesRes.value?.data) : [];
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

      const tasks = tasksRes.status === 'fulfilled' ? unwrapList(tasksRes.value?.data) : [];
      const notifs = notifsRes.status === 'fulfilled' ? unwrapList(notifsRes.value?.data) : [];

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
      setPendingTasksTotal(totalOf(tasksRes, tasks));
      setAttendanceSummary(attendanceSummary);
      setRecentActivity(notifs.slice(0, 5));
      setUnreadNotifs(unreadRes.status === 'fulfilled' ? (unreadRes.value?.data?.count ?? 0) : 0);

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

  useFocusEffect(
    useCallback(() => {
      loadDashboardData(true);
    }, [loadDashboardData])
  );

  const wasOnlineRef = useRef(isOnline);
  useEffect(() => {
    const cameOnline = isOnline && !wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if (cameOnline && (loadError || Object.values(sectionErrors).some(Boolean))) {
      loadDashboardData(true);
    }
  }, [isOnline, loadError, sectionErrors, loadDashboardData]);

  const retryLoad = useCallback(() => {
    loadDashboardData(true);
  }, [loadDashboardData]);

  const firstName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

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

  const financeFailed =
    finance === null && sectionErrors.finance !== null;

  const data = {
    stats,
    statsLoading: loading,
    finance,
    financeFailed,
    firstFinanceFailure: null,
    pendingTasks,
    pendingTasksTotal,
    tasksFailed: sectionErrors.tasks !== null,
    attendanceSummary,
    attendanceFailed: sectionErrors.attendance !== null,
    unreadNotifs,
    recentActivity,
    activityFailed: sectionErrors.activity !== null,
    sectionErrors,
    currency,
    hasPermission,
    router,
    themeColors,
    isDark,
    onRetryFinance: retryLoad,
    onRetryTasks: retryLoad,
    onRetryAttendance: retryLoad,
    onRetryActivity: retryLoad,
    formatDueDate,
    formatActivityTime,
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }, styles.headerRow]}>
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
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }, styles.headerRow]}>
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
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
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
        <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }, styles.headerRow]}>
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
          <MobileDashboardRenderer data={data} visibleCards={visibleCards} />
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
});
