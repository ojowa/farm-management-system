'use client';

import React, { Suspense } from 'react';
import { DashboardRenderer, DashboardFallback } from '@/components/dashboard/DashboardRenderer';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import {
  farmsAPI, cropsAPI, livestockAPI, poultryAPI, aquacultureAPI, financeAPI, tasksAPI, attendanceAPI, profitabilityAPI,
} from '@/lib/api';
import { useFetch } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';
import { Home, Sprout, Beef, Egg, Fish } from 'lucide-react';

/**
 * The server's `total` for a list call, as a display string.
 */
function serverTotal(body: any): string {
  for (const candidate of [body?.total, body?.data?.total, body?.data?.data?.total]) {
    if (Number.isFinite(candidate)) return String(candidate);
  }
  return '—';
}

const TXN_PAGE_SIZE = 200;
const TXN_MAX_PAGES = 10;

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

export default function DashboardPage() {
  const { visibleCards, orgCurrency } = useDashboardConfig();
  const { hasPermission, canCreate, canRead } = usePermission();
  const canAddFarm = canCreate('farm');

  // Aquaculture is a module the server may not have entitled this caller to —
  // the same gate the sidebar uses, so the card is never asked for when the
  // user can't open /aquaculture anyway.
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

  // Build dashboard data object for the renderer
  const stats = [
    { name: 'Total Farms', value: serverTotal(farmsData), icon: Home, color: 'bg-blue-500', href: '/farms' },
    { name: 'Total Crops', value: serverTotal(cropsData), icon: Sprout, color: 'bg-green-500', href: '/crops' },
    { name: 'Livestock', value: serverTotal(livestockData), icon: Beef, color: 'bg-amber-500', href: '/livestock' },
    { name: 'Poultry', value: serverTotal(poultryData), icon: Egg, color: 'bg-orange-500', href: '/poultry' },
    ...(showPonds
      ? [{ name: 'Ponds', value: serverTotal(pondsData), icon: Fish, color: 'bg-cyan-600', href: '/aquaculture' }]
      : []),
  ];
  const statsLoading = farmsLoading || cropsLoading || livestockLoading || poultryLoading || (showPonds && pondsLoading);

  const expenses = Array.isArray(expensesData) ? expensesData : expensesData?.data || [];
  const sales = Array.isArray(salesData) ? salesData : salesData?.data || [];

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const year = now.getFullYear();
  const inYear = (value: any) => {
    const date = new Date(value);
    return !isNaN(date.getTime()) && date.getFullYear() === year;
  };
  const monthlyFinancial = React.useMemo(() => {
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

  const profitSummary = (profitabilityData as any)?.data ?? profitabilityData;
  const displayIncome = profitSummary?.totalRevenue ?? totalIncome;
  const displayExpenses = profitSummary?.totalExpenses ?? totalExpenses;
  const displayProfit = profitSummary?.netProfit ?? (displayIncome - displayExpenses);

  const serverCategories = profitSummary?.categories;
  let expenseCategories: Array<{ name: string; value: number }> = [];
  if (serverCategories && typeof serverCategories === 'object' && !Array.isArray(serverCategories)) {
    const fromServer = Object.entries(serverCategories)
      .map(([name, value]) => ({ name, value: Number(value) || 0 }))
      .filter((category) => category.value > 0);
    if (fromServer.length > 0) expenseCategories = fromServer;
  }
  if (expenseCategories.length === 0) {
    const cats: Record<string, number> = {};
    expenses.forEach((e: any) => { cats[e.category || 'Other'] = (cats[e.category || 'Other'] || 0) + (e.amount || 0); });
    expenseCategories = Object.entries(cats).map(([name, value]) => ({ name, value }));
  }

  const pendingTasks = tasksData?.data?.slice(0, 5) || [];
  const taskStats: { status?: string; count?: number }[] = Array.isArray(tasksData?.stats) ? tasksData.stats : [];
  const pendingStat = taskStats.find((s) => s.status === 'PENDING');
  const pendingTasksTotal = pendingStat
    ? pendingStat.count ?? 0
    : Number.isFinite(tasksData?.total)
    ? tasksData.total
    : pendingTasks.length;

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
        total: serverAttendance.total ?? attendanceList.length,
      }
    : attendanceList.length > 0
    ? {
        present: attendanceList.filter((a: any) => a.status === 'PRESENT').length,
        absent: attendanceList.filter((a: any) => a.status === 'ABSENT').length,
        late: attendanceList.filter((a: any) => a.status === 'LATE').length,
        total: attendanceList.length,
      }
    : null;

  const data = {
    stats,
    statsLoading,
    monthlyFinancial,
    displayIncome,
    displayExpenses,
    displayProfit,
    expenseCategories,
    pendingTasks,
    pendingTasksTotal,
    attendanceSummary,
    orgCurrency,
    canAddFarm,
    hasPermission,
  };

  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardRenderer data={data} visibleCards={visibleCards} />
    </Suspense>
  );
}
