'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { NavTabs } from '@/components/NavTabs';
import { FINANCE_TABS } from '@/lib/financeTabs';
import {
  Search,
  Banknote,
  Calendar,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { financeAPI, farmsAPI, workersAPI } from '@/lib/api';
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
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';

interface Worker {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  position: string;
  farmId: string;
  payRate?: number | string;
  payType?: string;
  status?: string;
}

interface Expense {
  id: string;
  farmId: string;
  title: string;
  amount: number;
  date: string;
}

const SALARY_TITLE_PREFIX = 'Salary payment';
const PAGE_SIZE = 10;

type PayPeriodType = 'MONTH' | 'WEEK';

const currentMonthValue = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** ISO-8601 week value (`2026-W45`) for an HTML `<input type="week">`. */
const isoWeekValue = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

/** Monday of an ISO week (`2026-W45` → 2026-11-02), or null if unparsable. */
const weekStartDate = (weekValue: string): Date | null => {
  const m = /^(\d{4})-W(\d{1,2})$/.exec(weekValue);
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (day - 1) + (week - 1) * 7);
  return monday;
};

const workerName = (worker: Worker) =>
  `${worker.firstName} ${worker.middleName ? `${worker.middleName} ` : ''}${worker.lastName}`;

export default function SalaryPage() {
  const { toast } = useToast();
  const { canCreate } = usePermission();
  const readOnly = !canCreate('finance');
  const { orgCurrency } = useDashboardConfig();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: orgCurrency,
    }).format(amount);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [farmFilter, setFarmFilter] = useState('');
  const [payDate, setPayDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [payPeriodType, setPayPeriodType] = useState<PayPeriodType>('MONTH');
  const [payPeriod, setPayPeriod] = useState(() => currentMonthValue());
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payingBulk, setPayingBulk] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: workersData,
    loading,
    error,
    refetch,
  } = useFetch<{ data: Worker[]; total: number; page: number; totalPages: number }>(
    `salary-workers-${debouncedSearch}-${farmFilter}`,
    () =>
      workersAPI.list({
        page: 1,
        limit: 100,
        status: 'ACTIVE',
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

  const {
    data: paymentsData,
    loading: loadingPayments,
    refetch: refetchPayments,
  } = useFetch<{ data: Expense[]; total: number; page: number; totalPages: number }>(
    'salary-payments',
    () => financeAPI.listExpenses({ search: SALARY_TITLE_PREFIX, limit: PAGE_SIZE }),
    { cacheTime: 30_000 }
  );

  const workers = workersData?.data || [];
  const farms = farmsData?.data || [];
  const payments = paymentsData?.data || [];
  const farmNames = useMemo(
    () => new Map(farms.map((f) => [f.id, f.name])),
    [farms]
  );

  // Seed each row's amount with the worker's configured pay rate, without
  // clobbering an amount the user has already typed.
  useEffect(() => {
    if (!workers.length) return;
    setAmounts((prev) => {
      const next = { ...prev };
      workers.forEach((worker) => {
        if (next[worker.id] === undefined) {
          next[worker.id] =
            worker.payRate !== undefined && worker.payRate !== null
              ? String(worker.payRate)
              : '';
        }
      });
      return next;
    });
  }, [workers]);

  const selectedWorkers = workers.filter((w) => selected[w.id]);
  const selectedTotal = selectedWorkers.reduce(
    (sum, w) => sum + (Number(amounts[w.id]) || 0),
    0
  );

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    workers.forEach((w) => {
      next[w.id] = true;
    });
    setSelected(next);
  };

  const allSelected = workers.length > 0 && workers.every((w) => selected[w.id]);

  const payTypeLabel = payPeriodType === 'MONTH' ? 'Monthly' : 'Weekly';

  const payPeriodLabel = () => {
    if (payPeriodType === 'MONTH') {
      const m = /^(\d{4})-(\d{2})$/.exec(payPeriod);
      if (!m) return payPeriod;
      return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)).toLocaleDateString(
        'en-US',
        { month: 'long', year: 'numeric', timeZone: 'UTC' }
      );
    }
    const monday = weekStartDate(payPeriod);
    if (!monday) return payPeriod;
    return `week of ${monday.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })}`;
  };

  // Switching Weekly <-> Monthly changes the period input format, so reset
  // the period to a valid default for the new type.
  const handlePayTypeChange = (value: string) => {
    const type: PayPeriodType = value === 'WEEK' ? 'WEEK' : 'MONTH';
    setPayPeriodType(type);
    setPayPeriod(type === 'MONTH' ? currentMonthValue() : isoWeekValue(new Date()));
  };

  const payWorkers = async (targets: Worker[], bulk: boolean) => {
    if (!payPeriod) {
      toast({
        type: 'error',
        title: 'Missing pay period',
        message: 'Choose the month or week this salary covers.',
      });
      return;
    }

    const payable = targets.filter((w) => {
      const amount = Number(amounts[w.id]);
      return Boolean(w.farmId) && Number.isFinite(amount) && amount > 0;
    });

    if (!payable.length) {
      toast({
        type: 'error',
        title: 'Nothing to pay',
        message: 'Select workers with a positive salary amount first.',
      });
      return;
    }

    if (bulk) setPayingBulk(true);
    else setPayingId(payable[0].id);

    let succeeded = 0;
    let failed = 0;

    for (const worker of payable) {
      try {
        await financeAPI.createExpense({
          farmId: worker.farmId,
          title: `${SALARY_TITLE_PREFIX} - ${workerName(worker)} - ${payTypeLabel} (${payPeriodLabel()})`,
          amount: Number(amounts[worker.id]),
          date: payDate,
        });
        succeeded += 1;
        setSelected((prev) => {
          const next = { ...prev };
          delete next[worker.id];
          return next;
        });
      } catch {
        failed += 1;
      }
    }

    setPayingBulk(false);
    setPayingId(null);

    if (succeeded) {
      clearFetchCache('finance');
      clearFetchCache('budgets-list');
      refetchPayments();
    }

    if (failed) {
      toast({
        type: 'warning',
        title: `Paid ${succeeded}, failed ${failed}`,
        message: 'Some salary payments could not be recorded. Try them again.',
      });
    } else {
      toast({
        type: 'success',
        title:
          succeeded === 1
            ? 'Salary payment recorded'
            : `${succeeded} salary payments recorded`,
      });
    }
  };

  const skipped =
    selectedWorkers.length -
    selectedWorkers.filter((w) => {
      const amount = Number(amounts[w.id]);
      return Boolean(w.farmId) && Number.isFinite(amount) && amount > 0;
    }).length;

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
          <h1 className="text-3xl font-bold tracking-tight">Salary Payments</h1>
          <p className="text-muted-foreground">
            Pay worker salaries and record them as farm expenses
          </p>
        </div>
      </div>

      <NavTabs ariaLabel="Finance section" tabs={FINANCE_TABS} />

      {/* Pay controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workers by name or position..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              placeholder="All Farms"
              options={farms.map((f) => ({ value: f.id, label: f.name }))}
              value={farmFilter}
              onChange={(e) => setFarmFilter(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">
                Pay date
              </label>
              <Input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">
                Salary type
              </label>
              <Select
                options={[
                  { value: 'MONTH', label: 'Monthly' },
                  { value: 'WEEK', label: 'Weekly' },
                ]}
                value={payPeriodType}
                onChange={(e) => handlePayTypeChange(e.target.value)}
                className="w-auto"
                disabled={readOnly}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">
                Period
              </label>
              <Input
                type={payPeriodType === 'MONTH' ? 'month' : 'week'}
                value={payPeriod}
                onChange={(e) => setPayPeriod(e.target.value)}
                className="w-auto"
                disabled={readOnly}
              />
            </div>
            {(search || farmFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setFarmFilter('');
                }}
              >
                Clear filters
              </Button>
            )}
            {!readOnly && (
              <Button
                className="ml-auto"
                loading={payingBulk}
                disabled={!selectedWorkers.length || !payDate || !payPeriod}
                onClick={() => payWorkers(selectedWorkers, true)}
              >
                <Banknote className="mr-2 h-4 w-4" />
                Pay Selected ({selectedWorkers.length})
                {selectedTotal > 0 ? ` · ${formatCurrency(selectedTotal)}` : ''}
              </Button>
            )}
          </div>
          {skipped > 0 && (
            <p className="mt-3 text-sm text-amber-600">
              {skipped} selected worker{skipped === 1 ? '' : 's'} will be
              skipped — set a positive amount for them first.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Workers */}
      <Card>
        {loading ? (
          <CardContent className="p-8 flex items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
          </CardContent>
        ) : error ? (
          <CardContent className="p-12 text-center">
            <p className="text-lg font-medium text-destructive">
              Failed to load workers
            </p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        ) : workers.length === 0 ? (
          <CardContent className="p-12 text-center">
            <Banknote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {search || farmFilter
                ? 'No active workers match your filters.'
                : 'No active workers to pay yet.'}
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[48px]">
                    <input
                      type="checkbox"
                      aria-label="Select all workers"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={allSelected}
                      onChange={(e) => toggleAll(e.target.checked)}
                      disabled={readOnly}
                    />
                  </TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Farm</TableHead>
                  <TableHead>Pay Type</TableHead>
                  <TableHead>Pay Rate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="w-[110px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map((worker) => {
                  const rate = Number(worker.payRate);
                  return (
                    <TableRow key={worker.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          aria-label={`Select ${workerName(worker)}`}
                          className="h-4 w-4 rounded border-gray-300"
                          checked={Boolean(selected[worker.id])}
                          onChange={(e) =>
                            setSelected((prev) => ({
                              ...prev,
                              [worker.id]: e.target.checked,
                            }))
                          }
                          disabled={readOnly}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {workerName(worker)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{worker.position}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {farmNames.get(worker.farmId) || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {worker.payType || '—'}
                      </TableCell>
                      <TableCell>
                        {Number.isFinite(rate) && rate > 0
                          ? formatCurrency(rate)
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          aria-label={`Salary amount for ${workerName(worker)}`}
                          className="w-28"
                          value={amounts[worker.id] ?? ''}
                          onChange={(e) =>
                            setAmounts((prev) => ({
                              ...prev,
                              [worker.id]: e.target.value,
                            }))
                          }
                          disabled={readOnly}
                        />
                      </TableCell>
                      <TableCell>
                        {!readOnly && (
                          <Button
                            variant="outline"
                            size="sm"
                            loading={payingId === worker.id}
                            disabled={payingBulk}
                            onClick={() => payWorkers([worker], false)}
                          >
                            Pay
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Recent salary payments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Salary Payments</CardTitle>
          <Link href="/finance/transactions" className="text-sm text-green-600 hover:underline">
            View all transactions
          </Link>
        </CardHeader>
        {loadingPayments ? (
          <CardContent className="p-8 flex items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
          </CardContent>
        ) : payments.length === 0 ? (
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              No salary payments recorded yet.
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment</TableHead>
                  <TableHead>Farm</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {farmNames.get(payment.farmId) || '—'}
                    </TableCell>
                    <TableCell className="font-medium text-red-600">
                      -{formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Calendar className="h-3 w-3" />
                        {new Date(payment.date).toLocaleDateString()}
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
