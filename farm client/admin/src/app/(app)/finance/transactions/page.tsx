'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
} from 'lucide-react';
import { financeAPI } from '@/lib/api';
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
import { Pagination } from '@/components/ui/pagination';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';
import { useReadOnly } from '@/lib/useReadOnly';
import { expenseFormSchema, saleFormSchema } from '@/lib/validation';

interface Transaction {
  id: string;
  type: 'expense' | 'sale';
  title?: string;
  item?: string;
  amount: number;
  quantity?: number;
  price?: number;
  total?: number;
  date: string;
  farmId?: string;
  farmName?: string;
  createdAt: string;
}

const PAGE_SIZE = 10;

export default function TransactionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const readOnly = useReadOnly();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<'expense' | 'sale'>('expense');
  const [form, setForm] = useState({
    title: '',
    item: '',
    amount: '',
    quantity: '',
    price: '',
    total: '',
    date: '',
    farmId: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const {
    data: expensesData,
    loading: loadingExpenses,
    refetch: refetchExpenses,
  } = useFetch<{ data: any[]; total: number; page: number; totalPages: number }>(
    'finance-expenses',
    () => financeAPI.listExpenses({ page, limit: PAGE_SIZE }),
    { cacheTime: 30_000 }
  );

  const {
    data: salesData,
    loading: loadingSales,
    refetch: refetchSales,
  } = useFetch<{ data: any[]; total: number; page: number; totalPages: number }>(
    'finance-sales',
    () => financeAPI.listSales({ page, limit: PAGE_SIZE }),
    { cacheTime: 30_000 }
  );

  const loading = loadingExpenses || loadingSales;
  const refetch = () => { refetchExpenses(); refetchSales(); };

  const expenses = (expensesData?.data || []).map((e: any) => ({ ...e, type: 'expense' as const }));
  const sales = (salesData?.data || []).map((s: any) => ({ ...s, type: 'sale' as const }));
  const transactions = [...expenses, ...sales];

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (['created', 'updated', 'deleted'].includes(event.action)) {
        clearFetchCache('finance');
        refetch();
      }
    },
    [refetch]
  );
  useRealtime('finance', handleRealtimeEvent);

  const filtered = useMemo(() => {
    let result = transactions;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.item?.toLowerCase().includes(q)
      );
    }
    if (typeFilter) {
      result = result.filter((t) => t.type === typeFilter);
    }
    return result;
  }, [transactions, search, typeFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (addType === 'expense') {
        const result = expenseFormSchema.safeParse({
          title: form.title,
          amount: form.amount,
          date: form.date,
          farmId: form.farmId,
        });
        if (!result.success) {
          const errors: Record<string, string> = {};
          result.error.issues.forEach((issue) => {
            errors[issue.path[0] as string] = issue.message;
          });
          setFormErrors(errors);
          setSaving(false);
          return;
        }
        setFormErrors({});
        await financeAPI.createExpense({
          title: form.title,
          amount: Number(form.amount),
          date: form.date,
          farmId: form.farmId || undefined,
        });
        toast({ type: 'success', title: 'Expense added successfully' });
      } else {
        const result = saleFormSchema.safeParse({
          item: form.item,
          quantity: form.quantity,
          price: form.price,
          total: form.total,
          date: form.date,
          farmId: form.farmId,
        });
        if (!result.success) {
          const errors: Record<string, string> = {};
          result.error.issues.forEach((issue) => {
            errors[issue.path[0] as string] = issue.message;
          });
          setFormErrors(errors);
          setSaving(false);
          return;
        }
        setFormErrors({});
        await financeAPI.createSale({
          item: form.item,
          quantity: Number(form.quantity),
          price: Number(form.price),
          total: Number(form.total),
          date: form.date,
          farmId: form.farmId || undefined,
        });
        toast({ type: 'success', title: 'Sale recorded successfully' });
      }
      setShowAdd(false);
      setForm({ title: '', item: '', amount: '', quantity: '', price: '', total: '', date: '', farmId: '' });
      clearFetchCache('finance');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to add transaction',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, type: string) => {
    if (!confirm(`Delete this ${type}? This action cannot be undone.`)) return;
    try {
      if (type === 'expense') {
        await financeAPI.deleteExpense(id);
      } else {
        await financeAPI.deleteSale(id);
      }
      toast({ type: 'success', title: 'Transaction deleted' });
      clearFetchCache('finance');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete transaction',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/finance"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Finance
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            All expenses and sales in one place
          </p>
        </div>
        {!readOnly && (
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or item..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              placeholder="All types"
              options={[
                { value: 'expense', label: 'Expense' },
                { value: 'sale', label: 'Sale' },
              ]}
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
            />
            {(search || typeFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setTypeFilter('');
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
        ) : paginated.length === 0 ? (
          <CardContent className="p-12 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {search || typeFilter
                ? 'No transactions match your filters.'
                : 'No transactions yet. Add your first transaction!'}
            </p>
            {!search && !typeFilter && !readOnly && (
              <Button className="mt-4" onClick={() => setShowAdd(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            )}
          </CardContent>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Title / Item</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Farm</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((tx) => (
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
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(tx.date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {tx.farmName || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {!readOnly && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  router.push(`/finance/transactions/${tx.id}/edit`)
                                }
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(tx.id, tx.type)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
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

      {/* Add Transaction Dialog */}
      <Dialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Add Transaction"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Transaction Type
            </label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={addType === 'expense' ? 'default' : 'outline'}
                onClick={() => {
                  setAddType('expense');
                  setFormErrors({});
                }}
              >
                <TrendingDown className="mr-2 h-4 w-4" />
                Expense
              </Button>
              <Button
                type="button"
                variant={addType === 'sale' ? 'default' : 'outline'}
                onClick={() => {
                  setAddType('sale');
                  setFormErrors({});
                }}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Sale
              </Button>
            </div>
          </div>

          {addType === 'expense' ? (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Title <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. Fertilizer purchase"
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                />
                {formErrors.title && (
                  <p className="text-sm text-destructive mt-1">
                    {formErrors.title}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Amount <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({ ...form, amount: e.target.value })
                  }
                />
                {formErrors.amount && (
                  <p className="text-sm text-destructive mt-1">
                    {formErrors.amount}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Item <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. Tomatoes"
                  value={form.item}
                  onChange={(e) =>
                    setForm({ ...form, item: e.target.value })
                  }
                />
                {formErrors.item && (
                  <p className="text-sm text-destructive mt-1">
                    {formErrors.item}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Price per Unit
                  </label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Total <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={form.total}
                  onChange={(e) =>
                    setForm({ ...form, total: e.target.value })
                  }
                />
                {formErrors.total && (
                  <p className="text-sm text-destructive mt-1">
                    {formErrors.total}
                  </p>
                )}
              </div>
            </>
          )}

          <div>
            <label className="text-sm font-medium mb-1 block">
              Date <span className="text-destructive">*</span>
            </label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            {formErrors.date && (
              <p className="text-sm text-destructive mt-1">
                {formErrors.date}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Farm</label>
            <Input
              placeholder="Optional farm ID"
              value={form.farmId}
              onChange={(e) =>
                setForm({ ...form, farmId: e.target.value })
              }
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdd(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {addType === 'expense' ? 'Add Expense' : 'Record Sale'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
