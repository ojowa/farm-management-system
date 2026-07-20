'use client';

import React, { useEffect, useState } from 'react';
import { financeAPI, farmsAPI } from '@/lib/api';
import { Card, Badge, LoadingSpinner } from '@/components/ui';

interface FarmProfitability {
  farmId: string;
  farmName: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export default function ProfitabilityPage() {
  const [farms, setFarms] = useState<FarmProfitability[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [farmsRes, expensesRes, salesRes] = await Promise.allSettled([
          farmsAPI.list(),
          financeAPI.listExpenses(),
          financeAPI.listSales(),
        ]);

        const farmsList = farmsRes.status === 'fulfilled' ? (farmsRes.value.data.farms || farmsRes.value.data || []) : [];
        const expensesList = expensesRes.status === 'fulfilled' ? (expensesRes.value.data.expenses || expensesRes.value.data || []) : [];
        const salesList = salesRes.status === 'fulfilled' ? (salesRes.value.data.sales || salesRes.value.data || []) : [];

        const farmMap: Record<string, { name: string; revenue: number; expenses: number }> = {};
        farmsList.forEach((f: any) => {
          farmMap[f.id] = { name: f.name, revenue: 0, expenses: 0 };
        });

        salesList.forEach((s: any) => {
          const farmId = s.farmId;
          if (farmId && farmMap[farmId]) {
            farmMap[farmId].revenue += Number(s.amount || s.totalPrice) || 0;
          }
        });

        expensesList.forEach((e: any) => {
          const farmId = e.farmId;
          if (farmId && farmMap[farmId]) {
            farmMap[farmId].expenses += Number(e.amount) || 0;
          }
        });

        const farmProfits: FarmProfitability[] = Object.entries(farmMap).map(([farmId, data]) => ({
          farmId,
          farmName: data.name,
          revenue: data.revenue,
          expenses: data.expenses,
          profit: data.revenue - data.expenses,
        }));

        const rev = farmProfits.reduce((s, f) => s + f.revenue, 0);
        const exp = farmProfits.reduce((s, f) => s + f.expenses, 0);

        setFarms(farmProfits);
        setTotalRevenue(rev);
        setTotalExpenses(exp);
        setTotalProfit(rev - exp);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profitability Overview</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Revenue, expenses, and profit across your farms</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">${totalRevenue.toLocaleString()}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600">${totalExpenses.toLocaleString()}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Net Profit</p>
          <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${totalProfit.toLocaleString()}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Farm Breakdown</h2>
        {farms.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No farm data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Farm</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Revenue</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Expenses</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Profit</th>
                </tr>
              </thead>
              <tbody>
                {farms.map((farm) => (
                  <tr key={farm.farmId} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{farm.farmName}</td>
                    <td className="py-3 px-4 text-right text-green-600">${farm.revenue.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-red-600">${farm.expenses.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <Badge color={farm.profit >= 0 ? 'green' : 'red'}>
                        ${farm.profit.toLocaleString()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
