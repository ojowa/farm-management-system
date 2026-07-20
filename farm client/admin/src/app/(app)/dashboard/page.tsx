'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import {
  Home,
  Sprout,
  Beef,
  Egg,
  Package,
  Users,
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  ListTodo,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChartCard, FarmAreaChart, FarmBarChart, FarmPieChart } from '@/components/charts';
import { farmsAPI, cropsAPI, livestockAPI, poultryAPI, financeAPI, tasksAPI, attendanceAPI, profitabilityAPI } from '@/lib/api';
import { useFetch } from '@/hooks/useFetch';
import { useReadOnly } from '@/lib/useReadOnly';

function StatCard({ stat }: { stat: { name: string; value: string; change: string; changeType: 'up' | 'down'; icon: any; color: string; href: string } }) {
  const Icon = stat.icon;
  const isUp = stat.changeType === 'up';
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
            <div className="flex items-center gap-1 mt-2">
              {isUp ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
              <span className={`text-sm font-medium ${isUp ? 'text-green-600' : 'text-red-600'}`}>{stat.change}</span>
              <span className="text-sm text-muted-foreground">vs last month</span>
            </div>
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

function DashboardContent() {
  const readOnly = useReadOnly();

  const { data: farmsData, loading: farmsLoading } = useFetch<any>('dashboard-farms', () => farmsAPI.list({ limit: 1 }));
  const { data: cropsData, loading: cropsLoading } = useFetch<any>('dashboard-crops', () => cropsAPI.list({ limit: 1 }));
  const { data: livestockData, loading: livestockLoading } = useFetch<any>('dashboard-livestock', () => livestockAPI.list({ limit: 1 }));
  const { data: poultryData, loading: poultryLoading } = useFetch<any>('dashboard-poultry', () => poultryAPI.list({ limit: 1 }));
  const { data: expensesData } = useFetch<any>('dashboard-expenses', () => financeAPI.listExpenses({ limit: 50 }));
  const { data: salesData } = useFetch<any>('dashboard-sales', () => financeAPI.listSales({ limit: 50 }));
  const { data: tasksData } = useFetch<any>('dashboard-tasks', () => tasksAPI.list({ status: 'PENDING' }));
  const { data: attendanceData } = useFetch<any>('dashboard-attendance', () => attendanceAPI.getToday());
  const { data: profitabilityData } = useFetch<any>('dashboard-profitability', () => profitabilityAPI.summary(), { cacheTime: 60_000 });

  const stats = [
    { name: 'Total Farms', value: String(farmsData?.total ?? farmsData?.data?.total ?? '—'), change: '', changeType: 'up' as const, icon: Home, color: 'bg-blue-500', href: '/farms' },
    { name: 'Active Crops', value: String(cropsData?.total ?? cropsData?.data?.total ?? '—'), change: '', changeType: 'up' as const, icon: Sprout, color: 'bg-green-500', href: '/crops' },
    { name: 'Livestock', value: String(livestockData?.total ?? livestockData?.data?.total ?? '—'), change: '', changeType: 'up' as const, icon: Beef, color: 'bg-amber-500', href: '/livestock' },
    { name: 'Poultry Birds', value: String(poultryData?.total ?? poultryData?.data?.total ?? '—'), change: '', changeType: 'up' as const, icon: Egg, color: 'bg-orange-500', href: '/poultry' },
  ];

  // Build financial chart data from real expenses/sales
  const expenses = Array.isArray(expensesData) ? expensesData : expensesData?.data || [];
  const sales = Array.isArray(salesData) ? salesData : salesData?.data || [];

  const monthlyFinancial = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    return months.slice(0, now.getMonth() + 1).map((month, i) => {
      const monthExpenses = expenses
        .filter((e: any) => new Date(e.date).getMonth() === i)
        .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const monthSales = sales
        .filter((s: any) => new Date(s.date).getMonth() === i)
        .reduce((sum: number, s: any) => sum + (s.total || s.amount || 0), 0);
      return { name: month, income: monthSales, expenses: monthExpenses, profit: monthSales - monthExpenses };
    });
  }, [expenses, sales]);

  const totalIncome = sales.reduce((sum: number, s: any) => sum + (s.total || s.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

  // Use profitability summary from backend when available
  const profitSummary = profitabilityData?.data;
  const displayIncome = profitSummary?.totalRevenue ?? totalIncome;
  const displayExpenses = profitSummary?.totalExpenses ?? totalExpenses;
  const displayProfit = profitSummary?.netProfit ?? (displayIncome - displayExpenses);

  const expenseCategories = React.useMemo(() => {
    const cats: Record<string, number> = {};
    expenses.forEach((e: any) => { cats[e.category || 'Other'] = (cats[e.category || 'Other'] || 0) + (e.amount || 0); });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const pendingTasks = tasksData?.data?.slice(0, 5) || [];
  const attendanceSummary = attendanceData?.summary || { present: 0, absent: 0, late: 0 };

  const quickActions = [
    { name: 'Add Farm', href: '/farms/new', icon: Home, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
    { name: 'New Crop', href: '/crops/new', icon: Sprout, color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
    { name: 'Add Livestock', href: '/livestock/new', icon: Beef, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
    { name: 'New Task', href: '/tasks/new', icon: ListTodo, color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
    { name: 'Record Expense', href: '/finance/transactions/new', icon: Package, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
    { name: 'Add Worker', href: '/workers/new', icon: Users, color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
  ];

  const alerts = [
    ...(attendanceSummary.absent > 0 ? [{ title: 'Workers Absent', description: `${attendanceSummary.absent} worker(s) absent today`, severity: 'warning', action: 'View Attendance', href: '/workers/attendance' }] : []),
    ...(pendingTasks.length > 0 ? [{ title: 'Pending Tasks', description: `${pendingTasks.length} task(s) awaiting completion`, severity: 'warning', action: 'View Tasks', href: '/tasks' }] : []),
    ...(displayExpenses > displayIncome && displayIncome > 0 ? [{ title: 'Expenses Exceed Income', description: 'Monthly expenses are higher than income', severity: 'destructive', action: 'View Finance', href: '/finance' }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your farm operations</p>
        </div>
        {!readOnly && (
          <Link href="/farms/new" className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            <Plus className="mr-2 h-4 w-4" />Add Farm
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(farmsLoading || cropsLoading || livestockLoading || poultryLoading)
          ? Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-6"><div className="h-20 bg-muted animate-pulse rounded" /></CardContent></Card>)
          : stats.map((stat) => <StatCard key={stat.name} stat={stat} />)}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Alerts, Tasks, Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Today's Attendance */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-blue-600" />Today&apos;s Attendance</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p className="text-2xl font-bold text-green-600">{attendanceSummary.present}</p>
                  <p className="text-xs text-muted-foreground">Present</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <p className="text-2xl font-bold text-red-600">{attendanceSummary.absent}</p>
                  <p className="text-xs text-muted-foreground">Absent</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                  <p className="text-2xl font-bold text-yellow-600">{attendanceSummary.late}</p>
                  <p className="text-xs text-muted-foreground">Late</p>
                </div>
              </div>
              <Link href="/workers/attendance" className="mt-3 inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 w-full">
                View Attendance <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </CardContent>
          </Card>

          {/* Pending Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><ListTodo className="h-5 w-5" />Pending Tasks</CardTitle>
              <Link href="/tasks" className="text-sm text-primary hover:underline">View all</Link>
            </CardHeader>
            <CardContent className="space-y-1">
              {pendingTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No pending tasks</p>
              ) : (
                pendingTasks.map((task: any) => <TaskItem key={task.id} task={task} />)
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          {alerts.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-600" />Alerts</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {alerts.map((alert, i) => <AlertCard key={i} alert={alert} />)}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ArrowUpRight className="h-5 w-5" />Quick Actions</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.filter(() => !readOnly).map((action) => <QuickActionCard key={action.name} action={action} />)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Summary */}
          <ChartCard title="Financial Summary" data={monthlyFinancial} empty={monthlyFinancial.every((m: any) => m.income === 0 && m.expenses === 0)}>
            <FarmBarChart
              data={monthlyFinancial}
              xKey="name"
              bars={[
                { key: 'income', name: 'Income', color: '#22c55e' },
                { key: 'expenses', name: 'Expenses', color: '#ef4444' },
              ]}
            />
          </ChartCard>

          {/* Profit Trend */}
          <ChartCard title="Profit Trend" data={monthlyFinancial} empty={monthlyFinancial.every((m: any) => m.profit === 0)}>
            <FarmAreaChart
              data={monthlyFinancial}
              xKey="name"
              areas={[{ key: 'profit', name: 'Net Profit', color: '#3b82f6' }]}
            />
          </ChartCard>

          {/* Expense Breakdown */}
          <div className="grid gap-4 md:grid-cols-2">
            <ChartCard title="Expense Breakdown" data={expenseCategories} empty={expenseCategories.length === 0}>
              <FarmPieChart data={expenseCategories} />
            </ChartCard>

            {/* Financial Summary Card */}
            <Card>
              <CardHeader><CardTitle>Financial Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <span className="text-sm font-medium">Total Income</span>
                  <span className="text-lg font-bold text-green-600">${displayIncome.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <span className="text-sm font-medium">Total Expenses</span>
                  <span className="text-lg font-bold text-red-600">${displayExpenses.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <span className="text-sm font-medium">Net Profit</span>
                  <span className={`text-lg font-bold ${displayProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${displayProfit.toLocaleString()}
                  </span>
                </div>
                <Link href="/finance" className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 w-full">
                  View Finance <ArrowUpRight className="ml-1 h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><div className="h-8 w-48 bg-muted animate-pulse rounded" /><div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-6 h-32 bg-muted animate-pulse" /></Card>)}</div></div>}>
      <DashboardContent />
    </Suspense>
  );
}
