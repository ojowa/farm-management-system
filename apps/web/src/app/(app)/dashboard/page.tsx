import { getServerApiClient, getServerUser } from '@/lib/server-api';
import { DashboardClient } from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [user, api] = await Promise.all([getServerUser(), getServerApiClient()]);

  const [farmsRes, cropsRes, livestockRes, expensesRes, salesRes, tasksRes, attendanceRes] = await Promise.allSettled([
    api.farms.list(),
    api.crops.list(),
    api.livestock.list(),
    api.finance.listExpenses(),
    api.finance.listSales(),
    api.tasks.list({ status: 'PENDING', limit: 5 }),
    api.attendance.getToday(),
  ]);

  const farms = farmsRes.status === 'fulfilled' ? (farmsRes.value.data.farms || farmsRes.value.data || []) : [];
  const crops = cropsRes.status === 'fulfilled' ? (cropsRes.value.data.crops || cropsRes.value.data || []) : [];
  const livestock = livestockRes.status === 'fulfilled' ? (livestockRes.value.data.animals || livestockRes.value.data || []) : [];
  const expenses = expensesRes.status === 'fulfilled' ? (expensesRes.value.data.expenses || expensesRes.value.data || []) : [];
  const sales = salesRes.status === 'fulfilled' ? (salesRes.value.data.sales || salesRes.value.data || []) : [];
  const tasks = tasksRes.status === 'fulfilled' ? (tasksRes.value.data?.data || tasksRes.value.data || []) : [];
  const attendance = attendanceRes.status === 'fulfilled' ? attendanceRes.value.data : null;

  const transactions = [
    ...expenses.map((e: any) => ({ ...e, type: 'expense' })),
    ...sales.map((s: any) => ({ ...s, type: 'income' })),
  ];

  const totalRevenue = transactions
    .filter((t: any) => t.type === 'income')
    .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount) || 0), 0);

  const kpis = [
    { label: 'Total Farms', value: farms.length, icon: '🏡', color: 'bg-green-50 text-green-700' },
    { label: 'Active Crops', value: crops.length, icon: '🌾', color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Livestock', value: livestock.length, icon: '🐄', color: 'bg-blue-50 text-blue-700' },
    { label: 'Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: '💰', color: 'bg-purple-50 text-purple-700' },
  ];

  const typeBreakdown: Record<string, number> = {};
  farms.forEach((f: any) => {
    const type = f.farmType || 'CROP';
    typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
  });

  return (
    <DashboardClient
      user={user}
      kpis={kpis}
      farmTypeBreakdown={typeBreakdown}
      pendingTasks={tasks.slice(0, 5)}
      attendanceSummary={attendance?.summary || null}
    />
  );
}
