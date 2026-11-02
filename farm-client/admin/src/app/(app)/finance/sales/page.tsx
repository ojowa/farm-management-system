'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { NavTabs } from '@/components/NavTabs';
import { FINANCE_TABS } from '@/lib/financeTabs';
import {
  Plus,
  Search,
  TrendingUp,
  DollarSign,
  Calendar,
  ArrowLeft,
} from 'lucide-react';
import { financeAPI, farmsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useFetch } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';

interface Sale {
  id: string;
  item: string;
  quantity: number;
  price: number;
  total: number;
  date: string;
  farmId: string;
  createdAt: string;
}

const PAGE_SIZE = 10;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

export default function AllSalesPage() {
  const { canCreate } = usePermission();
  const readOnly = !canCreate('finance');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [farmFilter, setFarmFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: salesData,
    loading,
    error,
    refetch,
  } = useFetch<{ data: Sale[]; total: number; page: number; totalPages: number }>(
    `finance-sales-list-${debouncedSearch}-${farmFilter}-${page}`,
    () =>
      financeAPI.listSales({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        farmId: farmFilter || undefined,
      }),
    { cacheTime: 30_000 }
  );

  const { data: farmsData } = useFetch<{ data: { id: string; name: string }[] }>(
    'farms-list',
    () => farmsAPI.list({ limit: 100 }),
    { cacheTime: 60_000 }
  );

  const sales = salesData?.data || [];
  const total = salesData?.total || 0;
  const totalPages = salesData?.totalPages || 1;
  const farms = farmsData?.data || [];
  const farmNames = useMemo(
    () => new Map(farms.map((f) => [f.id, f.name])),
    [farms]
  );

  const pageRevenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const pageAverage = sales.length ? pageRevenue / sales.length : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/finance"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Finance
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">All Sales</h1>
          <p className="text-muted-foreground">
            Every sale recorded across your farms
          </p>
        </div>
        {!readOnly && (
          <Link href="/finance/transactions/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Record Sale
            </Button>
          </Link>
        )}
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
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue (page)</p>
                <p className="text-2xl font-bold">{formatCurrency(pageRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
                <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Sale (page)</p>
                <p className="text-2xl font-bold">{formatCurrency(pageAverage)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sales by item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              placeholder="All Farms"
              options={farms.map((f) => ({ value: f.id, label: f.name }))}
              value={farmFilter}
              onChange={(e) => {
                setFarmFilter(e.target.value);
                setPage(1);
              }}
            />
            {(search || farmFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setFarmFilter('');
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <CardContent className="p-8 flex items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
          </CardContent>
        ) : error ? (
          <CardContent className="p-12 text-center">
            <p className="text-lg font-medium text-destructive">
              Failed to load sales
            </p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        ) : sales.length === 0 ? (
          <CardContent className="p-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {search || farmFilter
                ? 'No sales match your filters.'
                : 'No sales yet. Record your first sale!'}
            </p>
            {!search && !farmFilter && !readOnly && (
              <Link href="/finance/transactions/new">
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Record Sale
                </Button>
              </Link>
            )}
          </CardContent>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Farm</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.item}</TableCell>
                      <TableCell>{sale.quantity}</TableCell>
                      <TableCell>{formatCurrency(sale.price || 0)}</TableCell>
                      <TableCell className="font-medium text-green-600">
                        {formatCurrency(sale.total || 0)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {farmNames.get(sale.farmId) || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(sale.date).toLocaleDateString()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="border-t p-4 flex justify-center">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
