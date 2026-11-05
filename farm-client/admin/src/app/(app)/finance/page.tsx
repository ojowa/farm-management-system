'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NavTabs } from '@/components/NavTabs';
import { FINANCE_TABS } from '@/lib/financeTabs';
import {
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowLeft,
  Pencil,
  Trash2,
  Calendar,
  Download,
  Banknote,
  PiggyBank,
  FileText,
  Store,
} from 'lucide-react';
import { financeAPI, contractsAPI, marketplaceAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';
import { usePermission } from '@/lib/usePermission';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';

interface Transaction {
  id: string;
  type: 'expense' | 'sale';
  title?: string;
  item?: string;
  amount: number;
  date: string;
  farmId?: string;
  farmName?: string;
}

interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  transactions: Transaction[];
}

interface ContractRow {
  id: string;
  type?: string;
  status?: string;
  value?: number;
}

interface ListingRow {
  id: string;
  status?: string;
  price?: number;
  quantity?: number;
}

export default function FinancePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { canCreate } = usePermission();
  const { orgCurrency } = useDashboardConfig();
  const readOnly = !canCreate('finance');

  const {
    data: expensesData,
    loading: loadingExpenses,
    refetch: refetchExpenses,
  } = useFetch<{ data: any[]; total: number }>(
    'finance-expenses',
    () => financeAPI.listExpenses({ limit: 100 }),
    { cacheTime: 30_000 }
  );

  const {
    data: salesData,
    loading: loadingSales,
    refetch: refetchSales,
  } = useFetch<{ data: any[]; total: number }>(
    'finance-sales',
    () => financeAPI.listSales({ limit: 100 }),
    { cacheTime: 30_000 }
  );

  const {
    data: contractsData,
    loading: loadingContracts,
    refetch: refetchContracts,
  } = useFetch<{ data: ContractRow[] }>(
    'finance-contracts-summary',
    () => contractsAPI.list(),
    { cacheTime: 30_000 }
  );

  const {
    data: listingsData,
    loading: loadingListings,
    refetch: refetchListings,
  } = useFetch<{ data: ListingRow[] }>(
    'finance-marketplace-summary',
    () => marketplaceAPI.listListings(),
    { cacheTime: 30_000 }
  );

  const loading = loadingExpenses || loadingSales;
  const loadingOther = loadingContracts || loadingListings;
  const refetch = () => {
    refetchExpenses();
    refetchSales();
    refetchContracts();
    refetchListings();
  };

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (['created', 'updated', 'deleted'].includes(event.action)) {
        clearFetchCache('finance');
        clearFetchCache('budgets-list');
        refetch();
      }
    },
    [refetch]
  );
  useRealtime('finance', handleRealtimeEvent);

  const expenses = expensesData?.data || [];
  const sales = salesData?.data || [];

  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  const totalIncome = sales.reduce(
    (sum: number, s: any) => sum + (s.total ?? s.amount ?? 0),
    0
  );
  const netProfit = totalIncome - totalExpenses;

  const contracts = contractsData?.data || [];
  const listings = listingsData?.data || [];

  const contractValue = (kind: 'SELL' | 'BUY') =>
    contracts
      .filter((contract) => {
        const status = (contract.status || '').toUpperCase();
        return (
          (contract.type || '').toUpperCase() === kind &&
          status !== 'TERMINATED' &&
          status !== 'CANCELLED'
        );
      })
      .reduce((sum, contract) => sum + (Number(contract.value) || 0), 0);

  const listingValue = (status: 'ACTIVE' | 'SOLD') =>
    listings
      .filter((listing) => (listing.status || '').toUpperCase() === status)
      .reduce(
        (sum, listing) =>
          sum + (Number(listing.price) || 0) * (Number(listing.quantity) || 0),
        0
      );

  const expectedContractIncome = contractValue('SELL');
  const committedContractSpend = contractValue('BUY');
  const activeListingValue = listingValue('ACTIVE');
  const soldListingValue = listingValue('SOLD');

  const recentTransactions = useMemo(() => {
    const allTransactions = [
      ...expenses.map((e: any) => ({ ...e, type: 'expense' })),
      ...sales.map((s: any) => ({
        ...s,
        amount: s.total ?? s.amount,
        type: 'sale',
      })),
    ];
    return allTransactions
      .sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
      .slice(0, 5);
  }, [expenses, sales]);

  const summary = {
    totalIncome,
    totalExpenses,
    netProfit,
    transactions: recentTransactions,
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: orgCurrency,
    }).format(amount);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
          <p className="text-muted-foreground">
            Overview of your farm finances
          </p>
        </div>
        <div className="flex gap-3">
          {!readOnly && (
            <>
              <Link href="/finance/transactions/new">
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Expense
                </Button>
              </Link>
              <Link href="/finance/transactions/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Sale
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <NavTabs ariaLabel="Finance section" tabs={FINANCE_TABS} />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-2xl font-bold">
                  {loading ? (
                    <LoadingSpinner className="h-5 w-5" />
                  ) : (
                    formatCurrency(summary.totalIncome)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold">
                  {loading ? (
                    <LoadingSpinner className="h-5 w-5" />
                  ) : (
                    formatCurrency(summary.totalExpenses)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
                <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className="text-2xl font-bold">
                  {loading ? (
                    <LoadingSpinner className="h-5 w-5" />
                  ) : (
                    <span
                      className={
                        summary.netProfit >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }
                    >
                      {formatCurrency(summary.netProfit)}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {!readOnly && (
              <>
                <Link href="/finance/transactions/new">
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Expense
                  </Button>
                </Link>
                <Link href="/finance/transactions/new">
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Sale
                  </Button>
                </Link>
              </>
            )}
            <Link href="/finance/transactions">
              <Button variant="outline">
                <DollarSign className="mr-2 h-4 w-4" />
                View All Transactions
              </Button>
            </Link>
            <Link href="/finance/sales">
              <Button variant="outline">
                <TrendingUp className="mr-2 h-4 w-4" />
                All Sales
              </Button>
            </Link>
            <Link href="/finance/salary">
              <Button variant="outline">
                <Banknote className="mr-2 h-4 w-4" />
                Salary Payments
              </Button>
            </Link>
            <Link href="/finance/budgets">
              <Button variant="outline">
                <PiggyBank className="mr-2 h-4 w-4" />
                Budgets
              </Button>
            </Link>
            <Link href="/finance/reports">
              <Button variant="outline">
                <BarChart3 className="mr-2 h-4 w-4" />
                Finance Reports
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Contracts & Marketplace */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Contracts &amp; Marketplace</CardTitle>
          <div className="flex gap-1">
            <Link href="/contracts">
              <Button variant="ghost" size="sm">
                <FileText className="mr-2 h-4 w-4" />
                Contracts
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="ghost" size="sm">
                <Store className="mr-2 h-4 w-4" />
                Marketplace
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Sell contracts</p>
              <p className="mt-1 text-xl font-bold text-green-600">
                {loadingOther ? (
                  <LoadingSpinner className="h-4 w-4" />
                ) : (
                  formatCurrency(expectedContractIncome)
                )}
              </p>
              <p className="text-xs text-muted-foreground">Expected income</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Buy contracts</p>
              <p className="mt-1 text-xl font-bold text-red-600">
                {loadingOther ? (
                  <LoadingSpinner className="h-4 w-4" />
                ) : (
                  formatCurrency(committedContractSpend)
                )}
              </p>
              <p className="text-xs text-muted-foreground">Committed spend</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Marketplace active</p>
              <p className="mt-1 text-xl font-bold text-blue-600">
                {loadingOther ? (
                  <LoadingSpinner className="h-4 w-4" />
                ) : (
                  formatCurrency(activeListingValue)
                )}
              </p>
              <p className="text-xs text-muted-foreground">Asking value</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Marketplace sold</p>
              <p className="mt-1 text-xl font-bold text-green-600">
                {loadingOther ? (
                  <LoadingSpinner className="h-4 w-4" />
                ) : (
                  formatCurrency(soldListingValue)
                )}
              </p>
              <p className="text-xs text-muted-foreground">Realized value</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            These values stay outside net profit until you post them as a sale
            or expense from their pages.
          </p>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Transactions</CardTitle>
          <Link href="/finance/transactions">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        {loading ? (
          <CardContent className="flex items-center justify-center p-8">
            <LoadingSpinner className="h-8 w-8" />
          </CardContent>
        ) : recentTransactions.length === 0 ? (
          <CardContent className="p-12 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              No transactions yet. Start by adding an expense or recording a
              sale.
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title / Item</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Farm</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <Badge
                        variant={
                          tx.type === 'expense' ? 'destructive' : 'success'
                        }
                      >
                        {tx.type === 'expense' ? 'Expense' : 'Sale'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {tx.title || tx.item || '—'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          tx.type === 'sale'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      >
                        {tx.type === 'sale' ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tx.farmName || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Calendar className="h-3 w-3" />
                        {new Date(tx.date).toLocaleDateString()}
                      </div>
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
