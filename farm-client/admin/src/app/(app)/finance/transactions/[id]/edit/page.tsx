'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, TrendingUp, TrendingDown } from 'lucide-react';
import { financeAPI, farmsAPI, budgetsAPI, currencyAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { formatCurrency } from '@/lib/formatters';
import { expenseFormSchema, saleFormSchema } from '@/lib/validation';
import { clearFetchCache, useFetch } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import { NavTabs } from '@/components/NavTabs';
import { FINANCE_TABS } from '@/lib/financeTabs';
import { cn } from '@/lib/utils';

type TxType = 'expense' | 'sale';

interface FormState {
  title: string;
  item: string;
  amount: string;
  quantity: string;
  price: string;
  total: string;
  date: string;
  farmId: string;
  budgetCategoryId: string;
  currency: string;
}

const recalcTotal = (quantity: string, price: string) => {
  if (quantity === '' || price === '') return '';
  const q = Number(quantity);
  const p = Number(price);
  if (!Number.isFinite(q) || !Number.isFinite(p)) return '';
  return (q * p).toFixed(2);
};

const asFormValue = (value: unknown) =>
  value === undefined || value === null ? '' : String(value);

export default function EditTransactionPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { canCreate } = usePermission();
  const { orgCurrency } = useDashboardConfig();
  const readOnly = !canCreate('finance');

  // The transactions list passes ?type=expense|sale; without it we probe
  // expenses first and fall back to sales (a sale has `item`, an expense
  // `title`, so the loaded row also tells us which form to render).
  const hint = searchParams.get('type');

  const [type, setType] = useState<TxType>(hint === 'sale' ? 'sale' : 'expense');
  const [form, setForm] = useState<FormState>({
    title: '',
    item: '',
    amount: '',
    quantity: '',
    price: '',
    total: '',
    date: '',
    farmId: '',
    budgetCategoryId: '',
    currency: 'USD',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (readOnly) router.replace('/finance/transactions');
  }, [readOnly, router]);

  const fetchTx = async () => {
    if (hint === 'sale') return financeAPI.getSale(id);
    if (hint === 'expense') return financeAPI.getExpense(id);
    try {
      return await financeAPI.getExpense(id);
    } catch {
      return financeAPI.getSale(id);
    }
  };

  const {
    data: txData,
    loading,
    error,
    refetch,
  } = useFetch<any>(`tx-edit-${id}-${hint || 'auto'}`, fetchTx, {
    enabled: Boolean(id),
    cacheTime: 0,
  });

  const tx: any = (txData as any)?.data ?? txData ?? null;

  // Prefill the form once the row arrives (also corrects `type` when the
  // page was opened without ?type=).
  useEffect(() => {
    if (!tx) return;
    const isSale = Boolean(tx.item) && !tx.title;
    setType(isSale ? 'sale' : 'expense');
    setForm({
      title: tx.title || '',
      item: tx.item || '',
      amount: asFormValue(tx.amount),
      quantity: asFormValue(tx.quantity),
      price: asFormValue(tx.price),
      total: asFormValue(tx.total),
      date: tx.date ? String(tx.date).slice(0, 10) : '',
      farmId: tx.farmId || '',
      budgetCategoryId: tx.budgetCategoryId || '',
      currency: asFormValue(tx.currency) || 'USD',
    });
    setErrors({});
  }, [tx]);

  const { data: farmsData, loading: loadingFarms } = useFetch<{
    data: { id: string; name: string }[];
  }>('farms-list', () => farmsAPI.list({ limit: 100 }), { cacheTime: 60_000 });

  const { data: budgetsData } = useFetch<{ data: any[] }>(
    'budgets-list',
    () => budgetsAPI.list(),
    { cacheTime: 60_000 }
  );

  const { data: currenciesData } = useFetch<{ data: any[] }>(
    'currencies-list',
    () => currencyAPI.list(),
    { cacheTime: 60_000 }
  );

  const farms = farmsData?.data || [];
  const budgetCategoryOptions = (budgetsData?.data || []).flatMap((b: any) =>
    (b.categories || []).map((c: any) => ({
      value: c.id as string,
      label: `${b.name} · ${c.name}`,
    }))
  );

  const currencyOptions = ((currenciesData?.data || []) as any[])
    .map((c) => ({ value: c.code, label: `${c.code} ${c.symbol || ''}` }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));
  };

  const updateQuantity = (value: string) => {
    setForm((prev) => ({
      ...prev,
      quantity: value,
      total: recalcTotal(value, prev.price),
    }));
    setErrors((prev) => ({ ...prev, quantity: '', total: '' }));
  };

  const updatePrice = (value: string) => {
    setForm((prev) => ({
      ...prev,
      price: value,
      total: recalcTotal(prev.quantity, value),
    }));
    setErrors((prev) => ({ ...prev, price: '', total: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (type === 'expense') {
      const result = expenseFormSchema.safeParse({
        title: form.title,
        amount: form.amount,
        date: form.date,
        farmId: form.farmId,
      });
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          nextErrors[issue.path[0] as string] = issue.message;
        });
      }
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
        result.error.issues.forEach((issue) => {
          nextErrors[issue.path[0] as string] = issue.message;
        });
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      if (type === 'expense') {
        await financeAPI.updateExpense(id, {
          title: form.title.trim(),
          amount: Number(form.amount),
          date: form.date,
          farmId: form.farmId,
          budgetCategoryId: form.budgetCategoryId || null,
          currency: form.currency || 'USD',
        });
        toast({ type: 'success', title: 'Expense updated' });
      } else {
        await financeAPI.updateSale(id, {
          item: form.item.trim(),
          quantity: Number(form.quantity),
          price: Number(form.price),
          total: Number(form.total),
          date: form.date,
          farmId: form.farmId,
          currency: form.currency || 'USD',
        });
        toast({ type: 'success', title: 'Sale updated' });
      }
      clearFetchCache('finance');
      clearFetchCache('budgets-list');
      router.push('/finance/transactions');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to update transaction',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (field: keyof FormState) =>
    errors[field] ? (
      <p className="text-sm text-destructive mt-1">{errors[field]}</p>
    ) : null;

  const invalid = (field: keyof FormState) =>
    errors[field] ? 'border-destructive focus-visible:ring-destructive' : '';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/finance/transactions"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Transactions
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Edit Transaction</h1>
          <Badge variant={type === 'expense' ? 'destructive' : 'success'}>
            {type === 'expense' ? 'Expense' : 'Sale'}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Update the details of this {type}
        </p>
      </div>

      <NavTabs ariaLabel="Finance section" tabs={FINANCE_TABS} />

      {loading ? (
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-lg font-medium text-destructive">
              Failed to load this transaction
            </p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : !tx ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              Transaction not found.
            </p>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {type === 'expense' ? 'Expense details' : 'Sale details'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {type === 'expense' ? (
                  <>
                    <div>
                      <Label htmlFor="title" className="mb-1 block">
                        Title <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="title"
                        placeholder="e.g. Fertilizer purchase"
                        value={form.title}
                        onChange={(e) => update('title', e.target.value)}
                        aria-invalid={Boolean(errors.title)}
                        className={invalid('title')}
                      />
                      {fieldError('title')}
                    </div>

                    <div>
                      <Label htmlFor="amount" className="mb-1 block">
                        Amount <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={form.amount}
                        onChange={(e) => update('amount', e.target.value)}
                        aria-invalid={Boolean(errors.amount)}
                        className={invalid('amount')}
                      />
                      {fieldError('amount')}
                    </div>

                    <div>
                      <Label htmlFor="currency" className="mb-1 block">
                        Currency
                      </Label>
                      <Select
                        id="currency"
                        placeholder={currencyOptions.length ? 'Currency' : 'No currencies yet'}
                        options={currencyOptions}
                        value={form.currency}
                        onChange={(e) => update('currency', e.target.value)}
                        disabled={!currencyOptions.length || saving}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        The ledger converts this amount to the currency
                        (USD) using the latest exchange rate.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="budgetCategoryId" className="mb-1 block">
                        Budget category
                      </Label>
                      <Select
                        id="budgetCategoryId"
                        placeholder={
                          budgetCategoryOptions.length
                            ? 'Not linked'
                            : 'No budget categories yet'
                        }
                        options={budgetCategoryOptions}
                        value={form.budgetCategoryId}
                        onChange={(e) =>
                          update('budgetCategoryId', e.target.value)
                        }
                        disabled={!budgetCategoryOptions.length}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Links this expense to a budget line so its spend counts
                        there.
                      </p>
                      {fieldError('budgetCategoryId')}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="item" className="mb-1 block">
                        Item <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="item"
                        placeholder="e.g. Tomatoes"
                        value={form.item}
                        onChange={(e) => update('item', e.target.value)}
                        aria-invalid={Boolean(errors.item)}
                        className={invalid('item')}
                      />
                      {fieldError('item')}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="quantity" className="mb-1 block">
                          Quantity <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={form.quantity}
                          onChange={(e) => updateQuantity(e.target.value)}
                          aria-invalid={Boolean(errors.quantity)}
                          className={invalid('quantity')}
                        />
                        {fieldError('quantity')}
                      </div>
                      <div>
                        <Label htmlFor="price" className="mb-1 block">
                          Unit price <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={form.price}
                          onChange={(e) => updatePrice(e.target.value)}
                          aria-invalid={Boolean(errors.price)}
                          className={invalid('price')}
                        />
                        {fieldError('price')}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="total" className="mb-1 block">
                        Total <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="total"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={form.total}
                        onChange={(e) => update('total', e.target.value)}
                        aria-invalid={Boolean(errors.total)}
                        className={cn('font-semibold', invalid('total'))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Calculated from quantity x unit price. Edit it to
                        override.
                      </p>
                      {fieldError('total')}
                    </div>

                    <div>
                      <Label htmlFor="currency" className="mb-1 block">
                        Currency
                      </Label>
                      <Select
                        id="currency"
                        placeholder={currencyOptions.length ? 'Currency' : 'No currencies yet'}
                        options={currencyOptions}
                        value={form.currency}
                        onChange={(e) => update('currency', e.target.value)}
                        disabled={!currencyOptions.length || saving}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        The ledger converts this amount to the currency
                        (USD) using the latest exchange rate.
                      </p>
                    </div>
                  </>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="farmId" className="mb-1 block">
                      Farm <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      id="farmId"
                      placeholder={
                        loadingFarms ? 'Loading farms...' : 'Select a farm'
                      }
                      options={farms.map((farm) => ({
                        value: farm.id,
                        label: farm.name,
                      }))}
                      value={form.farmId}
                      onChange={(e) => update('farmId', e.target.value)}
                      disabled={loadingFarms}
                      aria-invalid={Boolean(errors.farmId)}
                      className={invalid('farmId')}
                    />
                    {fieldError('farmId')}
                  </div>

                  <div>
                    <Label htmlFor="date" className="mb-1 block">
                      Date <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={form.date}
                      onChange={(e) => update('date', e.target.value)}
                      aria-invalid={Boolean(errors.date)}
                      className={invalid('date')}
                    />
                    {fieldError('date')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {type === 'expense'
                  ? `Amount: ${formatCurrency(Number(form.amount) || 0, form.currency || orgCurrency)}`
                  : `Total: ${formatCurrency(Number(form.total) || 0, form.currency || orgCurrency)}`}
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/finance/transactions')}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                <Save className="mr-2 h-4 w-4" />
                Save changes
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
