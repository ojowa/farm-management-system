'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { farmsAPI, cropsAPI, livestockAPI, financeAPI } from '@/lib/api';
import { Card, LoadingSpinner } from '@/components/ui';

interface KPI {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [kpis, setKpis] = useState<KPI[]>([
    { label: 'Total Farms', value: '—', icon: '🏡', color: 'bg-green-50 text-green-700' },
    { label: 'Active Crops', value: '—', icon: '🌾', color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Livestock', value: '—', icon: '🐄', color: 'bg-blue-50 text-blue-700' },
    { label: 'Revenue', value: '—', icon: '💰', color: 'bg-purple-50 text-purple-700' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    async function load() {
      try {
        const [farmsRes, cropsRes, livestockRes, expensesRes, salesRes] = await Promise.allSettled([
          farmsAPI.list(),
          cropsAPI.list(),
          livestockAPI.list(),
          financeAPI.listExpenses(),
          financeAPI.listSales(),
        ]);

        const farms = farmsRes.status === 'fulfilled' ? (farmsRes.value.data.farms || farmsRes.value.data || []) : [];
        const crops = cropsRes.status === 'fulfilled' ? (cropsRes.value.data.crops || cropsRes.value.data || []) : [];
        const livestock = livestockRes.status === 'fulfilled' ? (livestockRes.value.data.animals || livestockRes.value.data || []) : [];
        const expenses = expensesRes.status === 'fulfilled' ? (expensesRes.value.data.expenses || expensesRes.value.data || []) : [];
        const sales = salesRes.status === 'fulfilled' ? (salesRes.value.data.sales || salesRes.value.data || []) : [];
        const transactions = [
          ...expenses.map((e: any) => ({ ...e, type: 'expense' })),
          ...sales.map((s: any) => ({ ...s, type: 'income' })),
        ];

        const totalRevenue = transactions
          .filter((t: any) => t.type === 'income')
          .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount) || 0), 0);

        setKpis([
          { label: 'Total Farms', value: farms.length, icon: '🏡', color: 'bg-green-50 text-green-700' },
          { label: 'Active Crops', value: crops.length, icon: '🌾', color: 'bg-yellow-50 text-yellow-700' },
          { label: 'Livestock', value: livestock.length, icon: '🐄', color: 'bg-blue-50 text-blue-700' },
          { label: 'Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: '💰', color: 'bg-purple-50 text-purple-700' },
        ]);
      } catch {
        // KPIs remain as '—' on error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, authLoading, router]);

  if (authLoading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.fullName || 'Farmer'}</h1>
        <p className="text-gray-500 mt-1">Here's what's happening on your farm today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-2xl ${kpi.color} w-12 h-12 rounded-xl flex items-center justify-center`}>{kpi.icon}</span>
              <span className="text-sm font-medium text-gray-600">{kpi.label}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
            {kpi.trend && <p className="text-sm text-green-600 mt-1">{kpi.trend}</p>}
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Add Farm', href: '/farms', icon: '🏡' },
              { label: 'Add Crop', href: '/crops', icon: '🌾' },
              { label: 'Add Livestock', href: '/livestock', icon: '🐄' },
              { label: 'Record Transaction', href: '/sales', icon: '💰' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => router.push(action.href)}
                className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
              >
                <span className="text-xl">{action.icon}</span>
                <span className="text-sm font-medium text-gray-700">{action.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <p className="text-gray-500 text-sm text-center py-4">No recent activity yet. Start by adding your first farm!</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
