'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import { financeAPI, farmsAPI, budgetsAPI, currencyAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { useToast } from '@/lib/toasts';
import { formatCurrency } from '@/lib/formatters';
import { expenseFormSchema, saleFormSchema } from '@/lib/validation';
import { clearFetchCache, useFetch } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import { NavTabs } from '@/components/NavTabs';
import { FINANCE_TABS } from '@/lib/financeTabs';
import { cn } from '@/lib/utils';

type TransactionType = 'expense' | 'sale';

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

const today = () => new Date().toISOString().slice(0, 10);

const initialForm = (orgCurrency: string): FormState => ({
  title: '',
  item: '',
  amount: '',
  quantity: '',
  price: '',
  total: '',
  date: today(),
  farmId: '',
  budgetCategoryId: '',
  currency: orgCurrency,
});

const recalcTotal = (quantity: string, price: string) => {
  if (quantity === '' || price === '') return '';
  const q = Number(quantity);
  const p = Number(price);
  if (!Number.isFinite(q) || !Number.isFinite(p)) return '';
  return (q * p).toFixed(2);
};

export default function NewTransactionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { canCreate } = usePermission();
  const readOnly = !canCreate('finance');
  const { orgCurrency } = useDashboardConfig();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    if (readOnly) router.replace('/finance');
  }, [readOnly, router]);

  const [type, setType] = useState<TransactionType>(() =>
    searchParams.get('type') === 'sale' ? 'sale' : 'expense'
  );
  const [form, setForm] = useState<FormState>(() => {
    const base = initialForm(orgCurrency);
    const quantity = searchParams.get('quantity') || base.quantity;
    const price = searchParams.get('price') || base.price;
    return {
      ...base,
      title: searchParams.get('title') || base.title,
      item: searchParams.get('item') || base.item,
      amount: searchParams.get('amount') || base.amount,
      quantity,
      price,
      total: searchParams.get('total') || recalcTotal(quantity, price),
      date: searchParams.get('date') || base.date,
      farmId: searchParams.get('farmId') || base.farmId,
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: farmsData, loading: loadingFarms } = useFetch<{
    data: { id: string; name: string }[];
  }>('farms-list', () => farmsAPI.list({ limit: 100 }), { cacheTime: 60_000 });

  const { data: budgetsData } = useFetch<{ data: any[] }>(
    'budgets-list',
    () => budgetsAPI.list(),
    { cacheTime: 60_000 }
  );

  const budgetCategoryOptions = (budgetsData?.data || []).flatMap((b: any) =>
    (b.categories || []).map((c: any) => ({
      value: c.id as string,
      label: `${b.name} · ${c.name}`,
    }))
  );

  const { data: currenciesData } = useFetch<{ data: any[] }>(
    'currencies-list',
    () => currencyAPI.list(),
    { cacheTime: 60_000 }
  );

  const farms = farmsData?.data || [];
  const currencyOptions = ((currenciesData?.data || []) as any[])
    .map((c) => ({ value: c.code, label: `${c.code} ${c.symbol || ''}` }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const selectedFarm = farms.find((farm) => farm.id === form.farmId);
  const summaryAmount =
    type === 'expense' ? Number(form.amount) || 0 : Number(form.total) || 0;

  const summaryDate = useMemo(() => {
    if (!form.date) return 'Not set';
    return new Date(`${form.date}T00:00:00`).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [form.date]);

  const clearError = (field: keyof FormState) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));
  };

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  };

  const updateQuantity = (value: string) => {
    setForm((prev) => ({
      ...prev,
      quantity: value,
      total: recalcTotal(value, prev.price),
    }));
    clearError('quantity');
    clearError('total');
  };

  const updatePrice = (value: string) => {
    setForm((prev) => ({
      ...prev,
      price: value,
      total: recalcTotal(prev.quantity, value),
    }));
    clearError('price');
    clearError('total');
  };

  const validate = () => {
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
      if (!nextErrors.title && form.title.trim().length < 2) {
        nextErrors.title = 'Title must be at least 2 characters';
      }
      if (
        !nextErrors.amount &&
        (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0)
      ) {
        nextErrors.amount = 'Enter an amount greater than 0';
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
      if (!nextErrors.item && form.item.trim().length < 2) {
        nextErrors.item = 'Item name must be at least 2 characters';
      }
      if (
        !nextErrors.quantity &&
        (!Number.isFinite(Number(form.quantity)) || Number(form.quantity) <= 0)
      ) {
        nextErrors.quantity = 'Quantity must be greater than 0';
      }
      if (
        !nextErrors.price &&
        (!Number.isFinite(Number(form.price)) || Number(form.price) < 0)
      ) {
        nextErrors.price = 'Unit price must be 0 or more';
      }
      if (
        !nextErrors.total &&
        (!Number.isFinite(Number(form.total)) || Number(form.total) < 0)
      ) {
        nextErrors.total = 'Total must be 0 or more';
      }
    }

    return nextErrors;
  };

  const handleBlur = (field: keyof FormState) => {
    const nextErrors = validate();
    setErrors((prev) => ({ ...prev, [field]: nextErrors[field] || '' }));
  };

  const handleTypeChange = (next: TransactionType) => {
    setType(next);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      if (type === 'expense') {
        await financeAPI.createExpense({
          title: form.title.trim(),
          amount: Number(form.amount),
          date: form.date,
          farmId: form.farmId,
          budgetCategoryId: form.budgetCategoryId || undefined,
          currency: form.currency || 'USD',
        });
        toast({ type: 'success', title: 'Expense added successfully' });
      } else {
        await financeAPI.createSale({
          item: form.item.trim(),
          quantity: Number(form.quantity),
          price: Number(form.price),
          total: Number(form.total),
          date: form.date,
          farmId: form.farmId,
          currency: form.currency || 'USD',
        });
        toast({ type: 'success', title: 'Sale recorded successfully' });
      }
      clearFetchCache('finance');
      clearFetchCache('budgets-list');
      router.push('/finance/transactions');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to create transaction',
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
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/finance/transactions"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Transactions
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">New Transaction</h1>
        <p className="text-muted-foreground">Record a new expense or sale</p>
      </div>

      <NavTabs ariaLabel="Finance section" tabs={FINANCE_TABS} />

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start"
      >
        <div className="space-y-6">
          {/* Type switch */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-3">Transaction type</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleTypeChange('expense')}
                  aria-pressed={type === 'expense'}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-4 text-left transition-colors',
                    type === 'expense'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'hover:bg-accent'
                  )}
                >
                  <span
                    className={cn(
                      'rounded-full p-2',
                      type === 'expense'
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <TrendingDown className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-medium">Expense</span>
                    <span className="block text-xs text-muted-foreground">
                      Money going out
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTypeChange('sale')}
                  aria-pressed={type === 'sale'}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-4 text-left transition-colors',
                    type === 'sale'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'hover:bg-accent'
                  )}
                >
                  <span
                    className={cn(
                      'rounded-full p-2',
                      type === 'sale'
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <TrendingUp className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-medium">Sale</span>
                    <span className="block text-xs text-muted-foreground">
                      Money coming in
                    </span>
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Form */}
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
                      <Label htmlFor="amount" className="mb-1 block">
                        Amount <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Wallet className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="amount"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={form.amount}
                          onChange={(e) => update('amount', e.target.value)}
                          onBlur={() => handleBlur('amount')}
                          aria-invalid={Boolean(errors.amount)}
                          className={cn(
                            'h-12 pl-10 text-lg font-semibold',
                            invalid('amount')
                          )}
                        />
                      </div>
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
                      <Label htmlFor="title" className="mb-1 block">
                        Title <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="title"
                        placeholder="e.g. Fertilizer purchase"
                        value={form.title}
                        onChange={(e) => update('title', e.target.value)}
                        onBlur={() => handleBlur('title')}
                        aria-invalid={Boolean(errors.title)}
                        className={invalid('title')}
                      />
                      {fieldError('title')}
                    </div>

                    <div>
                      <Label htmlFor="budgetCategoryId" className="mb-1 block">
                        Budget category
                      </Label>
                      <Select
                        id="budgetCategoryId"
                        placeholder={
                          budgetCategoryOptions.length
                            ? 'Not linked (optional)'
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
                        onBlur={() => handleBlur('item')}
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
                          onBlur={() => handleBlur('quantity')}
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
                          onBlur={() => handleBlur('price')}
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
                        onBlur={() => handleBlur('total')}
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
                      placeholder={loadingFarms ? 'Loading farms...' : 'Select a farm'}
                      options={farms.map((farm) => ({
                        value: farm.id,
                        label: farm.name,
                      }))}
                      value={form.farmId}
                      onChange={(e) => update('farmId', e.target.value)}
                      onBlur={() => handleBlur('farmId')}
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
                      onBlur={() => handleBlur('date')}
                      aria-invalid={Boolean(errors.date)}
                      className={invalid('date')}
                    />
                    {fieldError('date')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge variant={type === 'expense' ? 'destructive' : 'success'}>
                  {type === 'expense' ? 'Expense' : 'Sale'}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Farm</span>
                <span className="text-sm font-medium text-right">
                  {selectedFarm?.name || 'Not selected'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Date</span>
                <span className="text-sm font-medium">{summaryDate}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span
                  className={cn(
                    'text-lg font-bold',
                    type === 'sale' ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {formatCurrency(summaryAmount, form.currency || orgCurrency)}
                </span>
              </div>

              <div className="space-y-2 border-t pt-4">
                <Button type="submit" className="w-full" loading={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {type === 'expense' ? 'Save Expense' : 'Record Sale'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/finance/transactions')}
                >
                  Cancel
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                {type === 'expense'
                  ? 'This expense will reduce your net profit for the selected farm.'
                  : 'This sale will add to your income for the selected farm.'}
              </p>
            </CardContent>
          </Card>
        </aside>
      </form>
    </div>
  );
}
