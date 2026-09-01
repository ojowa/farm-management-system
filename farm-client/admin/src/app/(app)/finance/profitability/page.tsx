'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  BarChart3,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { profitabilityAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { ChartCard, FarmBarChart, FarmPieChart } from '@/components/charts';
import { useToast } from '@/lib/toasts';

interface ProfitSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
}

interface FarmProfitability {
  farmId: string;
  farmName: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
}

interface ExpenseCategory {
  name: string;
  value: number;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

export default function ProfitabilityPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ProfitSummary | null>(null);
  const [farmData, setFarmData] = useState<FarmProfitability[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [summaryRes, farmRes] = await Promise.all([
        profitabilityAPI.summary(),
        profitabilityAPI.byFarm(),
      ]);
      const summaryData = summaryRes.data?.data || summaryRes.data;
      const farmList = farmRes.data?.data || farmRes.data || [];

      setSummary({
        totalRevenue: summaryData?.totalRevenue || 0,
        totalExpenses: summaryData?.totalExpenses || 0,
        netProfit: summaryData?.netProfit || 0,
        profitMargin: summaryData?.profitMargin || 0,
      });
      setFarmData(Array.isArray(farmList) ? farmList : []);

      const cats: ExpenseCategory[] = [];
      if (summaryData?.expenseCategories) {
        Object.entries(summaryData.expenseCategories).forEach(([name, value]) => {
          cats.push({ name, value: value as number });
        });
      }
      setExpenseCategories(cats);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to load profitability data',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profitability</h1>
          <p className="text-muted-foreground">
            Revenue, expenses, and profit analysis
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <BarChart3 className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-20 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))
          : [
              {
                label: 'Total Revenue',
                value: formatCurrency(summary?.totalRevenue || 0),
                icon: TrendingUp,
                color: 'bg-green-100 dark:bg-green-900/30',
                iconColor: 'text-green-600',
              },
              {
                label: 'Total Expenses',
                value: formatCurrency(summary?.totalExpenses || 0),
                icon: TrendingDown,
                color: 'bg-red-100 dark:bg-red-900/30',
                iconColor: 'text-red-600',
              },
              {
                label: 'Net Profit',
                value: formatCurrency(summary?.netProfit || 0),
                icon: DollarSign,
                color: 'bg-blue-100 dark:bg-blue-900/30',
                iconColor: (summary?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600',
              },
              {
                label: 'Profit Margin',
                value: `${(summary?.profitMargin || 0).toFixed(1)}%`,
                icon: Percent,
                color: 'bg-purple-100 dark:bg-purple-900/30',
                iconColor: (summary?.profitMargin || 0) >= 0 ? 'text-green-600' : 'text-red-600',
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.label}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`rounded-full p-3 ${card.color}`}>
                        <Icon className={`h-6 w-6 ${card.iconColor}`} />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{card.label}</p>
                        <p className="text-2xl font-bold">{card.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Farm Profitability Comparison"
          data={farmData}
          loading={loading}
          empty={farmData.length === 0}
          emptyMessage="No farm profitability data available"
        >
          <FarmBarChart
            data={farmData}
            xKey="farmName"
            bars={[
              { key: 'revenue', name: 'Revenue', color: '#22c55e' },
              { key: 'expenses', name: 'Expenses', color: '#ef4444' },
              { key: 'netProfit', name: 'Net Profit', color: '#3b82f6' },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Expense Categories"
          data={expenseCategories}
          loading={loading}
          empty={expenseCategories.length === 0}
          emptyMessage="No expense category data available"
        >
          <FarmPieChart data={expenseCategories} />
        </ChartCard>
      </div>

      {/* Per-Farm Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Per-Farm Breakdown</CardTitle>
        </CardHeader>
        {loading ? (
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        ) : farmData.length === 0 ? (
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              No farm profitability data available yet.
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Farm</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Expenses</TableHead>
                  <TableHead>Net Profit</TableHead>
                  <TableHead>Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {farmData.map((farm) => (
                  <TableRow key={farm.farmId}>
                    <TableCell className="font-medium">{farm.farmName}</TableCell>
                    <TableCell className="text-green-600">
                      {formatCurrency(farm.revenue)}
                    </TableCell>
                    <TableCell className="text-red-600">
                      {formatCurrency(farm.expenses)}
                    </TableCell>
                    <TableCell>
                      <span className={farm.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(farm.netProfit)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={farm.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {farm.profitMargin.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
