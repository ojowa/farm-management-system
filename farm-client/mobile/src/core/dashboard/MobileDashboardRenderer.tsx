import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Card } from '@/core/ui/UIComponents';
import { StateView } from '@/core/ui/feedback';
import { formatCurrencyWithCode } from '@/core/utils/currency';
import type { DashboardCardConfig } from './cardRegistry';

type MobileDashboardData = {
  stats: {
    totalFarms: number;
    totalCrops: number;
    totalLivestock: number;
    totalPoultry: number;
    totalPonds: number;
  };
  statsLoading: boolean;
  finance: {
    income: number;
    expenses: number;
    net: number;
  } | null;
  financeFailed: boolean;
  firstFinanceFailure: any;
  pendingTasks: any[];
  pendingTasksTotal: number;
  tasksFailed: boolean;
  attendanceSummary: {
    total: number;
    present: number;
    absent: number;
    late: number;
  } | null;
  attendanceFailed: boolean;
  unreadNotifs: number;
  recentActivity: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    createdAt: string;
  }>;
  activityFailed: boolean;
  sectionErrors: {
    finance: string | null;
    tasks: string | null;
    attendance: string | null;
    activity: string | null;
  };
  baseCurrency: string;
  hasPermission: (permission: string) => boolean;
  router: any;
  themeColors: any;
  isDark: boolean;
  onRetryFinance: () => void;
  onRetryTasks: () => void;
  onRetryAttendance: () => void;
  onRetryActivity: () => void;
  formatDueDate: (dateStr?: string) => string;
  formatActivityTime: (d?: string) => string;
};

type DashboardRendererProps = {
  data: MobileDashboardData;
  visibleCards: DashboardCardConfig[];
};

const hasCard = (cardIds: string[], id: string) => cardIds.includes(id);

export function MobileDashboardRenderer({ data, visibleCards }: DashboardRendererProps) {
  const cardIds = visibleCards.map((c) => c.id);
  const { themeColors, isDark, router, baseCurrency, hasPermission, formatDueDate, formatActivityTime } = data;
  const { finance, pendingTasks, attendanceSummary, recentActivity, sectionErrors, stats, unreadNotifs } = data;

  // Build alerts from data
  const alerts: Array<{
    key: string;
    severity: 'warning' | 'destructive';
    title: string;
    description: string;
    action: string;
    route: string;
  }> = [];
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
  if (data.pendingTasksTotal > 0) {
    alerts.push({
      key: 'tasks',
      severity: 'warning',
      title: 'Tasks awaiting completion',
      description: `${data.pendingTasksTotal} pending task(s) assigned`,
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

  // Quick actions (permission-filtered)
  const QUICK_ACTIONS = [
    { key: 'farm', label: 'Add Farm', icon: '🌾', route: '/farms/add', permission: 'farm.write' },
    { key: 'crop', label: 'New Crop', icon: '🌱', route: '/crops/add', permission: 'crop.write' },
    { key: 'livestock', label: 'Add Livestock', icon: '🐄', route: '/livestock/add', permission: 'livestock.write' },
    { key: 'poultry', label: 'Add Poultry', icon: '🥚', route: '/poultry/add', permission: 'poultry.write' },
    { key: 'aquaculture', label: 'Stock Pond', icon: '🐟', route: '/aquaculture/add', permission: 'aquaculture.write' },
    { key: 'finance', label: 'Record Transaction', icon: '💰', route: '/finance/add', permission: 'finance.write' },
    { key: 'worker', label: 'Add Worker', icon: '👷', route: '/workers/add', permission: 'worker.write' },
  ];
  const permittedActions = QUICK_ACTIONS.filter((action) => hasPermission(action.permission));

  const dynamicStyles = {
    cardBackground: {
      backgroundColor: themeColors.card,
      borderColor: isDark ? themeColors.border : 'transparent',
      borderWidth: isDark ? 1 : 0,
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

  return (
    <View>
      {/* Overview */}
      {hasCard(cardIds, 'overview') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsRow}>
            <Card
              style={[styles.statCard, dynamicStyles.cardBackground]}
              onPress={() => router.push('/farms')}
              accessibilityLabel={`Total Farms: ${stats.totalFarms}`}
            >
              <Text style={styles.statLabel}>🌾 Total Farms</Text>
              <Text style={styles.statValue}>{stats.totalFarms}</Text>
            </Card>
            <Card
              style={[styles.statCard, dynamicStyles.cardBackground]}
              onPress={() => router.push('/crops')}
              accessibilityLabel={`Total Crops: ${stats.totalCrops}`}
            >
              <Text style={styles.statLabel}>🌱 Total Crops</Text>
              <Text style={styles.statValue}>{stats.totalCrops}</Text>
            </Card>
          </View>
          <View style={styles.statsRow}>
            <Card
              style={[styles.statCard, dynamicStyles.cardBackground]}
              onPress={() => router.push('/livestock')}
              accessibilityLabel={`Livestock: ${stats.totalLivestock}`}
            >
              <Text style={styles.statLabel}>🐄 Livestock</Text>
              <Text style={styles.statValue}>{stats.totalLivestock}</Text>
            </Card>
            <Card
              style={[styles.statCard, dynamicStyles.cardBackground]}
              onPress={() => router.push('/poultry')}
              accessibilityLabel={`Poultry: ${stats.totalPoultry}`}
            >
              <Text style={styles.statLabel}>🥚 Poultry</Text>
              <Text style={styles.statValue}>{stats.totalPoultry}</Text>
            </Card>
          </View>
          {hasPermission('aquaculture.read') && (
            <View style={styles.statsRow}>
              <Card
                style={[styles.statCard, dynamicStyles.cardBackground]}
                onPress={() => router.push('/aquaculture')}
                accessibilityLabel={`Ponds: ${stats.totalPonds}`}
              >
                <Text style={styles.statLabel}>🐟 Ponds</Text>
                <Text style={styles.statValue}>{stats.totalPonds}</Text>
              </Card>
            </View>
          )}
        </View>
      )}

      {/* Financial Summary */}
      {hasCard(cardIds, 'financial-summary') && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Financial Summary</Text>
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
              <Text style={[styles.quickActionDescription]}>Total Income</Text>
              <Text
                style={[styles.financeValue, { color: '#16A34A' }]}
                accessibilityLabel={
                  finance
                    ? `Total Income: ${formatCurrencyWithCode(finance.income, baseCurrency)}`
                    : 'Total Income: unavailable'
                }
              >
                {finance ? formatCurrencyWithCode(finance.income, baseCurrency) : '—'}
              </Text>
            </View>
            <View style={styles.financeDivider} />
            <View style={styles.financeRow}>
              <Text style={[styles.quickActionDescription]}>Total Expenses</Text>
              <Text
                style={[styles.financeValue, { color: '#DC2626' }]}
                accessibilityLabel={
                  finance
                    ? `Total Expenses: ${formatCurrencyWithCode(finance.expenses, baseCurrency)}`
                    : 'Total Expenses: unavailable'
                }
              >
                {finance ? formatCurrencyWithCode(finance.expenses, baseCurrency) : '—'}
              </Text>
            </View>
            <View style={styles.financeDivider} />
            <View style={styles.financeRow}>
              <Text style={[styles.quickActionDescription]}>Net Profit</Text>
              <Text
                style={[
                  styles.financeValue,
                  { color: (finance?.net ?? 0) >= 0 ? '#16A34A' : '#DC2626' },
                ]}
                accessibilityLabel={
                  finance
                    ? `Net Profit: ${formatCurrencyWithCode(finance.net, baseCurrency)}`
                    : 'Net Profit: unavailable'
                }
              >
                {finance ? formatCurrencyWithCode(finance.net, baseCurrency) : '—'}
              </Text>
            </View>
          </Card>
          {sectionErrors.finance && (
            <View>
              <Text style={[styles.quickActionDescription, { marginTop: 8 }]}>
                {sectionErrors.finance}
              </Text>
              <TouchableOpacity
                onPress={data.onRetryFinance}
                accessibilityRole="button"
                accessibilityLabel="Retry loading financial summary"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ color: themeColors.primary, fontSize: 14, fontWeight: '600', marginTop: 6 }}>
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
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
      )}

      {/* Alerts */}
      {hasCard(cardIds, 'alerts') && alerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alerts</Text>
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
      {hasCard(cardIds, 'todays-attendance') && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Today's Attendance</Text>
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
              onRetry={data.onRetryAttendance}
              retryLabel="Retry"
              style={styles.sectionState}
            />
          ) : attendanceSummary ? (
            <>
              <View style={styles.statsRow}>
                <Card
                  style={[styles.statCard, dynamicStyles.cardBackground]}
                  accessibilityLabel={`Present: ${attendanceSummary.present}`}
                >
                  <Text style={styles.statLabel}>Present</Text>
                  <Text style={[styles.statValue, { color: '#16A34A' }]}>{attendanceSummary.present}</Text>
                </Card>
                <Card
                  style={[styles.statCard, dynamicStyles.cardBackground]}
                  accessibilityLabel={`Absent: ${attendanceSummary.absent}`}
                >
                  <Text style={styles.statLabel}>Absent</Text>
                  <Text style={[styles.statValue, { color: '#DC2626' }]}>{attendanceSummary.absent}</Text>
                </Card>
              </View>
              <View style={styles.statsRow}>
                <Card
                  style={[styles.statCard, dynamicStyles.cardBackground]}
                  accessibilityLabel={`Late: ${attendanceSummary.late}`}
                >
                  <Text style={styles.statLabel}>Late</Text>
                  <Text style={[styles.statValue, { color: '#D97706' }]}>{attendanceSummary.late}</Text>
                </Card>
                <Card
                  style={[styles.statCard, dynamicStyles.cardBackground]}
                  accessibilityLabel={`Total records today: ${attendanceSummary.total}`}
                >
                  <Text style={styles.statLabel}>Total</Text>
                  <Text style={styles.statValue}>{attendanceSummary.total}</Text>
                </Card>
              </View>
            </>
          ) : (
            <Card style={[styles.quickActionCard, dynamicStyles.cardBackground]}>
              <Text style={[styles.quickActionDescription]}>No attendance data</Text>
            </Card>
          )}
        </View>
      )}

      {/* Pending Tasks */}
      {hasCard(cardIds, 'pending-tasks') && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Pending Tasks</Text>
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
              onRetry={data.onRetryTasks}
              retryLabel="Retry"
              style={styles.sectionState}
            />
          ) : pendingTasks.length === 0 ? (
            <Card style={[styles.quickActionCard, dynamicStyles.cardBackground]}>
              <Text style={[styles.quickActionDescription]}>No pending tasks</Text>
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
                    <Text style={[styles.quickActionTitle]} numberOfLines={1}>{task.title}</Text>
                    <Text style={[styles.quickActionDescription]}>
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
      )}

      {/* Quick Actions */}
      {hasCard(cardIds, 'quick-actions') && permittedActions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
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
                  style={[styles.quickGridLabel]}
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
      {hasCard(cardIds, 'recent-activity') && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
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
              onRetry={data.onRetryActivity}
              retryLabel="Retry"
              style={styles.sectionState}
            />
          ) : recentActivity.length === 0 ? (
            <Card style={[styles.quickActionCard, dynamicStyles.cardBackground]}>
              <Text style={[styles.quickActionDescription]}>No recent activity</Text>
            </Card>
          ) : (
            recentActivity.map((item) => (
              <Card key={item.id} style={[styles.quickActionCard, dynamicStyles.cardBackground]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.quickActionTitle]}>{item.title}</Text>
                    <Text style={[styles.quickActionDescription]} numberOfLines={2}>
                      {item.message}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: themeColors.textSecondary, marginLeft: 8 }}>
                    {formatActivityTime(item.createdAt)}
                  </Text>
                </View>
              </Card>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionState: {
    flex: 0,
    paddingVertical: 24,
  },
  quickActionCard: {
    padding: 16,
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  quickActionDescription: {
    fontSize: 13,
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
