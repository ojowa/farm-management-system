'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import {
  Home,
  Sprout,
  Beef,
  Egg,
  Fish,
  Package,
  Users,
  Plus,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  ListTodo,
  BarChart2,
  AreaChart,
  PieChart,
  DollarSign,
  Mail,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChartCard, FarmAreaChart, FarmBarChart, FarmPieChart } from '@/components/charts';
import { formatCurrency } from '@/lib/formatters';
import type { DashboardCardConfig } from '@/lib/dashboard/cardRegistry';

type DashboardData = {
  stats: Array<{ name: string; value: string; icon: React.ComponentType<any>; color: string; href: string }>;
  statsLoading: boolean;
  monthlyFinancial: Array<{ name: string; income: number; expenses: number; profit: number }>;
  displayIncome: number;
  displayExpenses: number;
  displayProfit: number;
  expenseCategories: Array<{ name: string; value: number }>;
  pendingTasks: any[];
  pendingTasksTotal: number;
  attendanceSummary: { present: number; absent: number; late: number; total: number } | null;
  orgCurrency: string;
  canAddFarm: boolean;
  hasPermission: (permission: string) => boolean;
};

function StatCard({ stat }: { stat: { name: string; value: string; icon: any; color: string; href: string } }) {
  const Icon = stat.icon;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
          </div>
          <div className={`p-3 rounded-xl ${stat.color}`}><Icon className="h-6 w-6 text-white" /></div>
        </div>
        <div className="mt-4">
          <Link href={stat.href} className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 w-full">
            View Details <ArrowUpRight className="ml-1 h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionCard({ action }: { action: { name: string; href: string; icon: any; color: string } }) {
  const Icon = action.icon;
  return (
    <Link href={action.href} className="group">
      <Card className="h-full transition-all hover:shadow-md cursor-pointer">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center">
          <div className={`p-3 rounded-xl ${action.color} group-hover:scale-110 transition-transform`}>
            <Icon className="h-6 w-6" />
          </div>
          <span className="mt-3 font-medium text-sm">{action.name}</span>
        </CardContent>
      </Card>
    </Link>
  );
}

function TaskItem({ task }: { task: any }) {
  const priorityColors: Record<string, string> = {
    URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    LOW: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };
  const statusIcons: Record<string, React.ReactNode> = {
    PENDING: <Clock className="h-4 w-4 text-yellow-500" />,
    IN_PROGRESS: <Clock className="h-4 w-4 text-blue-500" />,
    COMPLETED: <CheckCircle className="h-4 w-4 text-green-500" />,
    CANCELLED: <AlertTriangle className="h-4 w-4 text-gray-400" />,
  };
  return (
    <Link href={`/tasks/${task.id}`} className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors">
      <div className="flex-shrink-0 mt-0.5">{statusIcons[task.status] || statusIcons.PENDING}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs px-1.5 py-0.5 rounded ${priorityColors[task.priority] || priorityColors.MEDIUM}`}>{task.priority}</span>
          {task.assignedToName && <span className="text-xs text-muted-foreground">{task.assignedToName}</span>}
          {task.dueDate && <span className="text-xs text-muted-foreground">Due {new Date(task.dueDate).toLocaleDateString()}</span>}
        </div>
      </div>
    </Link>
  );
}

function AlertCard({ alert }: { alert: { title: string; description: string; severity: string; action: string; href: string } }) {
  const severityColors = {
    warning: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    destructive: 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800',
  };
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${severityColors[alert.severity as keyof typeof severityColors] || severityColors.warning}`}>
      <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium">{alert.title}</p>
        <p className="text-sm opacity-90 mt-0.5">{alert.description}</p>
      </div>
      <Link href={alert.href} className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
        {alert.action}
      </Link>
    </div>
  );
}

export function DashboardRenderer({ data, visibleCards }: { data: DashboardData; visibleCards: DashboardCardConfig[] }) {
  const STAT_CARD_IDS: Record<string, string> = {
    'Total Farms': 'total-farms',
    'Total Crops': 'total-crops',
    Livestock: 'total-livestock',
    Poultry: 'total-poultry',
    Ponds: 'total-ponds',
  };

  const cardIds = visibleCards.map((c) => c.id);
  const hasCard = (id: string) => cardIds.includes(id);

  const quickActions = [
    { name: 'Add Farm', href: '/farms', permission: 'farm.write', icon: Home, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
    { name: 'New Crop', href: '/crops/new', permission: 'crop.write', icon: Sprout, color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
    { name: 'Add Livestock', href: '/livestock/new', permission: 'livestock.write', icon: Beef, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
    { name: 'New Task', href: '/tasks/new', permission: 'hr.write', icon: ListTodo, color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
    { name: 'Record Expense', href: '/finance/transactions/new', permission: 'finance.write', icon: Package, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
    { name: 'Add Worker', href: '/workers/new', permission: 'hr.write', icon: Users, color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
  ].filter((action) => data.hasPermission(action.permission));

  const alerts = [
    ...(data.attendanceSummary && data.attendanceSummary.absent > 0 && data.hasPermission('hr.read')
      ? [{ title: 'Workers Absent', description: `${data.attendanceSummary.absent} worker(s) absent today`, severity: 'warning', action: 'View Attendance', href: '/workers/attendance' }]
      : []),
    ...(data.pendingTasksTotal > 0 && data.hasPermission('hr.read')
      ? [{ title: 'Pending Tasks', description: `${data.pendingTasksTotal} task(s) awaiting completion`, severity: 'warning', action: 'View Tasks', href: '/tasks' }]
      : []),
    ...(data.displayExpenses > data.displayIncome && data.displayIncome > 0 && data.hasPermission('finance.read')
      ? [{ title: 'Expenses Exceed Income', description: 'Monthly expenses are higher than income', severity: 'destructive', action: 'View Finance', href: '/finance' }]
      : []),
  ];

  // ── Card component registry ─────────────────────────────────────────
  // Each card id maps to a component that receives the shared data object.
  const CardById: Record<string, React.ComponentType<any>> = {
    'total-farms': () => <StatCard stat={data.stats.find((s) => s.name === 'Total Farms')!} />,
    'total-crops': () => <StatCard stat={data.stats.find((s) => s.name === 'Total Crops')!} />,
    'total-livestock': () => <StatCard stat={data.stats.find((s) => s.name === 'Livestock')!} />,
    'total-poultry': () => <StatCard stat={data.stats.find((s) => s.name === 'Poultry')!} />,
    'total-ponds': () => <StatCard stat={data.stats.find((s) => s.name === 'Ponds')!} />,
    'financial-summary': () => (
      <Card>
        <CardHeader><CardTitle>Financial Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
            <span className="text-sm font-medium">Total Income</span>
            <span className="text-lg font-bold text-green-600">{formatCurrency(data.displayIncome, data.orgCurrency)}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
            <span className="text-sm font-medium">Total Expenses</span>
            <span className="text-lg font-bold text-red-600">{formatCurrency(data.displayExpenses, data.orgCurrency)}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <span className="text-sm font-medium">Net Profit</span>
            <span className={`text-lg font-bold ${data.displayProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(data.displayProfit, data.orgCurrency)}
            </span>
          </div>
          <Link href="/finance" className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 w-full">
            View Finance <ArrowUpRight className="ml-1 h-3 w-3" />
          </Link>
        </CardContent>
      </Card>
    ),
    'profit-trend': () => (
      <ChartCard title="Profit Trend" data={data.monthlyFinancial} empty={data.monthlyFinancial.every((m: any) => m.profit === 0)}>
        <FarmAreaChart
          data={data.monthlyFinancial}
          xKey="name"
          areas={[{ key: 'profit', name: 'Net Profit', color: '#3b82f6' }]}
        />
      </ChartCard>
    ),
    'expense-breakdown': () => (
      <ChartCard title="Expense Breakdown" data={data.expenseCategories} empty={data.expenseCategories.length === 0}>
        <FarmPieChart data={data.expenseCategories} />
      </ChartCard>
    ),
    'financial-chart': () => (
      <ChartCard title="Financial Summary" data={data.monthlyFinancial} empty={data.monthlyFinancial.every((m: any) => m.income === 0 && m.expenses === 0)}>
        <FarmBarChart
          data={data.monthlyFinancial}
          xKey="name"
          bars={[
            { key: 'income', name: 'Income', color: '#22c55e' },
            { key: 'expenses', name: 'Expenses', color: '#ef4444' },
          ]}
        />
      </ChartCard>
    ),
    "todays-attendance": () => (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-blue-600" />Today's Attendance</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <p className="text-2xl font-bold text-green-600">{data.attendanceSummary ? data.attendanceSummary.present : '—'}</p>
              <p className="text-xs text-muted-foreground">Present</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
              <p className="text-2xl font-bold text-red-600">{data.attendanceSummary ? data.attendanceSummary.absent : '—'}</p>
              <p className="text-xs text-muted-foreground">Absent</p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
              <p className="text-2xl font-bold text-yellow-600">{data.attendanceSummary ? data.attendanceSummary.late : '—'}</p>
              <p className="text-xs text-muted-foreground">Late</p>
            </div>
          </div>
          <Link href="/workers/attendance" className="mt-3 inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 w-full">
            View Attendance <ArrowUpRight className="ml-1 h-3 w-3" />
          </Link>
        </CardContent>
      </Card>
    ),
    'pending-tasks': () => (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><ListTodo className="h-5 w-5" />Pending Tasks</CardTitle>
          <Link href="/tasks" className="text-sm text-primary hover:underline">View all</Link>
        </CardHeader>
        <CardContent className="space-y-1">
          {data.pendingTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No pending tasks</p>
          ) : (
            <>
              {data.pendingTasks.map((task: any) => <TaskItem key={task.id} task={task} />)}
              {data.pendingTasksTotal > data.pendingTasks.length && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Showing {data.pendingTasks.length} of {data.pendingTasksTotal} pending
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    ),
    'alerts': () => (
      alerts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-600" />Alerts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert, i) => <AlertCard key={i} alert={alert} />)}
          </CardContent>
        </Card>
      )
    ),
    'quick-actions': () => (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ArrowUpRight className="h-5 w-5" />Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickActions.map((action) => <QuickActionCard key={action.name} action={action} />)}
          </div>
        </CardContent>
      </Card>
    ),
    'recent-activity': () => (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Recent Activity</CardTitle></CardHeader>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
        </CardContent>
      </Card>
    ),
  };

  // Resolve card components to local variables (JSX doesn't allow computed
  // property access directly in tag position).
  const TodaysAttendanceCard = CardById["todays-attendance"];
  const PendingTasksCard = CardById["pending-tasks"];
  const AlertsCard = CardById["alerts"];
  const QuickActionsCard = CardById["quick-actions"];
  const RecentActivityCard = CardById["recent-activity"];
  const FinancialChartCard = CardById["financial-chart"];
  const ProfitTrendCard = CardById["profit-trend"];
  const ExpenseBreakdownCard = CardById["expense-breakdown"];
  const FinancialSummaryCard = CardById["financial-summary"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your farm operations</p>
        </div>
        {data.canAddFarm && (
          <Link href="/farms" className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            <Plus className="mr-2 h-4 w-4" />Add Farm
          </Link>
        )}
      </div>

      {/* Stats Cards grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {data.statsLoading
          ? data.stats.map((_, i) => <Card key={i}><CardContent className="p-6"><div className="h-20 bg-muted animate-pulse rounded" /></CardContent></Card>)
          : data.stats
              .filter((stat) => hasCard(STAT_CARD_IDS[stat.name]))
              .map((stat) => <StatCard key={stat.name} stat={stat} />)}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          {hasCard('todays-attendance') && <TodaysAttendanceCard />}
          {hasCard('pending-tasks') && <PendingTasksCard />}
          {hasCard('alerts') && <AlertsCard />}
          {hasCard('quick-actions') && <QuickActionsCard />}
          {hasCard('recent-activity') && <RecentActivityCard />}
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {hasCard('financial-chart') && <FinancialChartCard />}
          {hasCard('profit-trend') && <ProfitTrendCard />}
          {hasCard('expense-breakdown') && (
            <div className="grid gap-4 md:grid-cols-2">
              <ExpenseBreakdownCard />
              {hasCard('financial-summary') && <FinancialSummaryCard />}
            </div>
          )}
          {!hasCard('expense-breakdown') && hasCard('financial-summary') && <FinancialSummaryCard />}
        </div>
      </div>
    </div>
  );
}

export function DashboardFallback() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6 h-32 bg-muted animate-pulse" /></Card>
        ))}
      </div>
    </div>
  );
}
