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
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChartCard, FarmAreaChart, FarmBarChart, FarmPieChart } from '@/components/charts';
import { farmsAPI, cropsAPI, livestockAPI, poultryAPI, aquacultureAPI, financeAPI, tasksAPI, attendanceAPI, profitabilityAPI } from '@/lib/api';
import { useFetch } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';

/**
 * The server's `total` for a list call, as a display string.
 *
 * Stat cards ask each module for one row (`limit: 1`) and read the total the
 * server reports — the same number the section's own list page shows — instead
 * of counting rows the client happened to receive. List bodies disagree on
 * shape (`{ total }`, `{ data, total }`, `{ data: { data, total } }` for the
 * nested aquaculture answer), so all three are accepted; when no total is in
 * the answer the card shows `—` rather than inventing a zero.
 */
function serverTotal(body: any): string {
  for (const candidate of [body?.total, body?.data?.total, body?.data?.data?.total]) {
    if (Number.isFinite(candidate)) return String(candidate);
  }
  return '—';
}

// Page size and hard cap for the dashboard's transaction walk. The server
// clamps nothing here (`?limit=` is a raw parseInt), and rows come back sorted
// newest-first, so the cap still covers the current year the charts bucket —
// it only stops a very large ledger from being pulled into a dashboard.
const TXN_PAGE_SIZE = 200;
const TXN_MAX_PAGES = 10;

/**
 * Every transaction the server has (bounded), handed back the way an endpoint
 * would answer (`{ data: rows }`) so `useFetch` sees a normal list body.
 *
 * The monthly charts used to sum whatever was in a single page — the server's
 * default of 20 rows, or a hard-coded 50 — so the bars silently under-reported
 * as soon as a farm had more transactions than that. Paging until the server's
 * `total` is covered makes each bar the sum of the server's own rows.
 */
async function fetchAllTransactions(list: (params?: any) => Promise<any>): Promise<{ data: any[] }> {
  const rows: any[] = [];
  for (let page = 1; page <= TXN_MAX_PAGES; page += 1) {
    const res = await list({ page, limit: TXN_PAGE_SIZE });
    const body = res?.data;
    const pageRows = Array.isArray(body) ? body : body?.data || [];
    rows.push(...pageRows);
    const total = body?.total;
    if (!Number.isFinite(total) || rows.length >= total || pageRows.length === 0) break;
  }
  return { data: rows };
}

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

function DashboardContent() {
  const { hasPermission, canCreate, canRead } = usePermission();
  const canAddFarm = canCreate('farm');
  // Aquaculture is a module the server may not have entitled this caller to —
  // the same gate the sidebar uses, so the card is never asked for (and never
  // renders a `—`) when the user can't open /aquaculture anyway.
  const showPonds = canRead('aquaculture');

  const { data: farmsData, loading: farmsLoading } = useFetch<any>('dashboard-farms', () => farmsAPI.list({ limit: 1 }));
  const { data: cropsData, loading: cropsLoading } = useFetch<any>('dashboard-crops', () => cropsAPI.list({ limit: 1 }));
  const { data: livestockData, loading: livestockLoading } = useFetch<any>('dashboard-livestock', () => livestockAPI.list({ limit: 1 }));
  const { data: poultryData, loading: poultryLoading } = useFetch<any>('dashboard-poultry', () => poultryAPI.list({ limit: 1 }));
  const { data: pondsData, loading: pondsLoading } = useFetch<any>(
    'dashboard-ponds',
    () => aquacultureAPI.ponds.list({ page: 1, limit: 1 }),
    { enabled: showPonds }
  );
  const { data: expensesData } = useFetch<any>('dashboard-expenses', () => fetchAllTransactions((params) => financeAPI.listExpenses(params)));
  const { data: salesData } = useFetch<any>('dashboard-sales', () => fetchAllTransactions((params) => financeAPI.listSales(params)));
  const { data: tasksData } = useFetch<any>('dashboard-tasks', () => tasksAPI.list({ status: 'PENDING' }));
  const { data: attendanceData } = useFetch<any>('dashboard-attendance', () => attendanceAPI.getToday());
  const { data: profitabilityData } = useFetch<any>('dashboard-profitability', () => profitabilityAPI.summary(), { cacheTime: 60_000 });

  // Labels and queries are shared with the mobile dashboard's Overview cards
  // so both apps show the same five numbers for the same server calls.
  const stats = [
    { name: 'Total Farms', value: serverTotal(farmsData), icon: Home, color: 'bg-blue-500', href: '/farms' },
    { name: 'Total Crops', value: serverTotal(cropsData), icon: Sprout, color: 'bg-green-500', href: '/crops' },
    { name: 'Livestock', value: serverTotal(livestockData), icon: Beef, color: 'bg-amber-500', href: '/livestock' },
    { name: 'Poultry', value: serverTotal(poultryData), icon: Egg, color: 'bg-orange-500', href: '/poultry' },
    ...(showPonds
      ? [{ name: 'Ponds', value: serverTotal(pondsData), icon: Fish, color: 'bg-cyan-600', href: '/aquaculture' }]
      : []),
  ];
  const statsLoading =
    farmsLoading || cropsLoading || livestockLoading || poultryLoading || (showPonds && pondsLoading);

  // Financial chart data, built from the server's own transaction rows.
  const expenses = Array.isArray(expensesData) ? expensesData : expensesData?.data || [];
  const sales = Array.isArray(salesData) ? salesData : salesData?.data || [];

  const monthlyFinancial = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const year = now.getFullYear();
    // Bucket by month WITHIN the current year. Matching on month number alone
    // filed a January row from last year into this year's January bar, so the
    // chart's totals stopped agreeing with the server the moment the ledger
    // spanned more than one year.
    const inYear = (value: any) => {
      const date = new Date(value);
      return !isNaN(date.getTime()) && date.getFullYear() === year;
    };
    return months.slice(0, now.getMonth() + 1).map((month, i) => {
      const monthExpenses = expenses
        .filter((e: any) => inYear(e.date) && new Date(e.date).getMonth() === i)
        .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const monthSales = sales
        .filter((s: any) => inYear(s.date) && new Date(s.date).getMonth() === i)
        .reduce((sum: number, s: any) => sum + (s.total || s.amount || 0), 0);
      return { name: month, income: monthSales, expenses: monthExpenses, profit: monthSales - monthExpenses };
    });
  }, [expenses, sales]);

  const totalIncome = sales.reduce((sum: number, s: any) => sum + (s.total || s.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

  // Use profitability summary from backend when available
  // The profitability summary endpoint returns the summary bare; accept
  // `{ data }` too — reading `.data` alone meant this backend summary was
  // silently never used and the page always fell back to client-side math.
  const profitSummary = (profitabilityData as any)?.data ?? profitabilityData;
  const displayIncome = profitSummary?.totalRevenue ?? totalIncome;
  const displayExpenses = profitSummary?.totalExpenses ?? totalExpenses;
  const displayProfit = profitSummary?.netProfit ?? (displayIncome - displayExpenses);

  const expenseCategories = React.useMemo(() => {
    // Primary source: the server buckets EVERY expense by category inside
    // GET /profitability/summary, so the pie matches the summary card's
    // totalExpenses. Re-deriving categories here could only ever cover the
    // rows that were loaded, which is why the pie disagreed with the card.
    const serverCategories = profitSummary?.categories;
    if (serverCategories && typeof serverCategories === 'object' && !Array.isArray(serverCategories)) {
      const fromServer = Object.entries(serverCategories)
        .map(([name, value]) => ({ name, value: Number(value) || 0 }))
        .filter((category) => category.value > 0);
      if (fromServer.length > 0) return fromServer;
    }
    // Fallback for a backend without the summary: bucket the loaded rows.
    const cats: Record<string, number> = {};
    expenses.forEach((e: any) => { cats[e.category || 'Other'] = (cats[e.category || 'Other'] || 0) + (e.amount || 0); });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [expenses, profitSummary]);

  const pendingTasks = tasksData?.data?.slice(0, 5) || [];
  // The card renders five rows, but the server counts every pending task in
  // `stats` (`[{ status, count }]`) — the alert must quote that total rather
  // than "5 task(s) awaiting completion" forever.
  const taskStats: { status?: string; count?: number }[] = Array.isArray(tasksData?.stats)
    ? tasksData.stats
    : [];
  const pendingStat = taskStats.find((s) => s.status === 'PENDING');
  const pendingTasksTotal = pendingStat
    ? pendingStat.count ?? 0
    : Number.isFinite(tasksData?.total)
    ? tasksData.total
    : pendingTasks.length;

  // GET /attendance/today answers `{ records, summary }`; older servers answer
  // a bare array. Accept both, and render `—` (not a fabricated zero) when the
  // request hasn't succeeded at all.
  const attendancePayload: any = attendanceData ?? null;
  const attendanceList: any[] = Array.isArray(attendancePayload)
    ? attendancePayload
    : Array.isArray(attendancePayload?.records)
    ? attendancePayload.records
    : [];
  const serverAttendance = !Array.isArray(attendancePayload) ? attendancePayload?.summary : null;
  const attendanceSummary = serverAttendance
    ? {
        present: serverAttendance.present ?? 0,
        absent: serverAttendance.absent ?? 0,
        late: serverAttendance.late ?? 0,
      }
    : attendancePayload && attendanceList.length > 0
    ? {
        present: attendanceList.filter((a: any) => a.status === 'PRESENT').length,
        absent: attendanceList.filter((a: any) => a.status === 'ABSENT').length,
        late: attendanceList.filter((a: any) => a.status === 'LATE').length,
      }
    : null;
  const attendanceCell = (value: number | undefined) =>
    attendanceSummary && value !== undefined ? String(value) : '—';

  const quickActions = [
    { name: 'Add Farm', href: '/farms/new', permission: 'farm.write', icon: Home, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
    { name: 'New Crop', href: '/crops/new', permission: 'crop.write', icon: Sprout, color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
    { name: 'Add Livestock', href: '/livestock/new', permission: 'livestock.write', icon: Beef, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
    { name: 'New Task', href: '/tasks/new', permission: 'hr.write', icon: ListTodo, color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
    { name: 'Record Expense', href: '/finance/transactions/new', permission: 'finance.write', icon: Package, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
    { name: 'Add Worker', href: '/workers/new', permission: 'hr.write', icon: Users, color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
  ].filter((action) => hasPermission(action.permission));

  const alerts = [
    ...(attendanceSummary && attendanceSummary.absent > 0 && hasPermission('hr.read') ? [{ title: 'Workers Absent', description: `${attendanceSummary.absent} worker(s) absent today`, severity: 'warning', action: 'View Attendance', href: '/workers/attendance' }] : []),
    ...(pendingTasksTotal > 0 && hasPermission('hr.read') ? [{ title: 'Pending Tasks', description: `${pendingTasksTotal} task(s) awaiting completion`, severity: 'warning', action: 'View Tasks', href: '/tasks' }] : []),
    ...(displayExpenses > displayIncome && displayIncome > 0 && hasPermission('finance.read') ? [{ title: 'Expenses Exceed Income', description: 'Monthly expenses are higher than income', severity: 'destructive', action: 'View Finance', href: '/finance' }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your farm operations</p>
        </div>
        {canAddFarm && (
          <Link href="/farms/new" className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            <Plus className="mr-2 h-4 w-4" />Add Farm
          </Link>
        )}
      </div>

      {/* Stats Cards — five cards matching the mobile dashboard's Overview,
          each value the server's own `total` for the query behind it. */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statsLoading
          ? Array.from({ length: stats.length }).map((_, i) => <Card key={i}><CardContent className="p-6"><div className="h-20 bg-muted animate-pulse rounded" /></CardContent></Card>)
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p className="text-2xl font-bold text-green-600">{attendanceCell(attendanceSummary?.present)}</p>
                  <p className="text-xs text-muted-foreground">Present</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <p className="text-2xl font-bold text-red-600">{attendanceCell(attendanceSummary?.absent)}</p>
                  <p className="text-xs text-muted-foreground">Absent</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                  <p className="text-2xl font-bold text-yellow-600">{attendanceCell(attendanceSummary?.late)}</p>
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
                <>
                  {pendingTasks.map((task: any) => <TaskItem key={task.id} task={task} />)}
                  {/* The server counts every pending task; the list stops at
                      five. Say so instead of letting five rows read as the
                      whole backlog. */}
                  {pendingTasksTotal > pendingTasks.length && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Showing {pendingTasks.length} of {pendingTasksTotal} pending
                    </p>
                  )}
                </>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quickActions.map((action) => <QuickActionCard key={action.name} action={action} />)}
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
