'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { financeAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/lib/toasts';
import { expenseFormSchema, saleFormSchema } from '@/lib/validation';
import { clearFetchCache } from '@/hooks/useFetch';
import { useReadOnly } from '@/lib/useReadOnly';

export default function NewTransactionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const readOnly = useReadOnly();

  React.useEffect(() => {
    if (readOnly) router.replace('/finance');
  }, [readOnly, router]);

  const [type, setType] = useState<'expense' | 'sale'>('expense');
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (type === 'expense') {
        const result = expenseFormSchema.safeParse({
          title: form.title,
          amount: form.amount,
          date: form.date,
          farmId: form.farmId,
        });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.issues.forEach((issue) => {
            fieldErrors[issue.path[0] as string] = issue.message;
          });
          setErrors(fieldErrors);
          return;
        }
        setErrors({});
        setSaving(true);
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
          const fieldErrors: Record<string, string> = {};
          result.error.issues.forEach((issue) => {
            fieldErrors[issue.path[0] as string] = issue.message;
          });
          setErrors(fieldErrors);
          return;
        }
        setErrors({});
        setSaving(true);
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
      clearFetchCache('finance');
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/finance/transactions"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Transactions
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">
          New Transaction
        </h1>
        <p className="text-muted-foreground">Record a new expense or sale</p>
      </div>

      {/* Type Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Button
              type="button"
              variant={type === 'expense' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => {
                setType('expense');
                setErrors({});
              }}
            >
              <TrendingDown className="mr-2 h-4 w-4" />
              Expense
            </Button>
            <Button
              type="button"
              variant={type === 'sale' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => {
                setType('sale');
                setErrors({});
              }}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Sale
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {type === 'expense' ? (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Title <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Fertilizer purchase"
                    value={form.title}
                    onChange={(e) => {
                      setForm({ ...form, title: e.target.value });
                      if (errors.title) setErrors({ ...errors, title: '' });
                    }}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.title}
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
                    onChange={(e) => {
                      setForm({ ...form, amount: e.target.value });
                      if (errors.amount) setErrors({ ...errors, amount: '' });
                    }}
                  />
                  {errors.amount && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.amount}
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
                    onChange={(e) => {
                      setForm({ ...form, item: e.target.value });
                      if (errors.item) setErrors({ ...errors, item: '' });
                    }}
                  />
                  {errors.item && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.item}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                    onChange={(e) => {
                      setForm({ ...form, total: e.target.value });
                      if (errors.total) setErrors({ ...errors, total: '' });
                    }}
                  />
                  {errors.total && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.total}
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
                onChange={(e) => {
                  setForm({ ...form, date: e.target.value });
                  if (errors.date) setErrors({ ...errors, date: '' });
                }}
              />
              {errors.date && (
                <p className="text-sm text-destructive mt-1">{errors.date}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Farm (Optional)
              </label>
              <Input
                placeholder="Enter farm ID"
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
                onClick={() => router.push('/finance/transactions')}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                <Save className="mr-2 h-4 w-4" />
                {type === 'expense' ? 'Add Expense' : 'Record Sale'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
