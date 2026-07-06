'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { contractsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { useToast } from '@/lib/toasts';
import { clearFetchCache } from '@/hooks/useFetch';
import { useReadOnly } from '@/lib/useReadOnly';

export default function NewContractPage() {
  const router = useRouter();
  const { toast } = useToast();
  const readOnly = useReadOnly();

  if (readOnly) {
    router.push('/contracts');
    return null;
  }

  const [form, setForm] = useState({
    type: '',
    counterpartyName: '',
    startDate: '',
    endDate: '',
    value: '',
    terms: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.type) newErrors.type = 'Type is required';
    if (!form.counterpartyName.trim())
      newErrors.counterpartyName = 'Counterparty name is required';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await contractsAPI.create({
        type: form.type,
        counterpartyName: form.counterpartyName,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        value: form.value ? Number(form.value) : undefined,
        terms: form.terms || undefined,
      });
      toast({ type: 'success', title: 'Contract created successfully' });
      clearFetchCache('contracts');
      router.push('/contracts');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to create contract',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/contracts"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Contracts
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Add Contract</h1>
        <p className="text-muted-foreground">Create a new contract</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Contract Type <span className="text-destructive">*</span>
              </label>
              <Select
                placeholder="Select contract type"
                options={[
                  { value: 'Buy', label: 'Buy' },
                  { value: 'Sell', label: 'Sell' },
                ]}
                value={form.type}
                onChange={(e) => {
                  setForm({ ...form, type: e.target.value });
                  if (errors.type) setErrors({ ...errors, type: '' });
                }}
              />
              {errors.type && (
                <p className="text-sm text-destructive mt-1">{errors.type}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Counterparty Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. ABC Suppliers Ltd"
                value={form.counterpartyName}
                onChange={(e) => {
                  setForm({ ...form, counterpartyName: e.target.value });
                  if (errors.counterpartyName)
                    setErrors({ ...errors, counterpartyName: '' });
                }}
              />
              {errors.counterpartyName && (
                <p className="text-sm text-destructive mt-1">
                  {errors.counterpartyName}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  End Date
                </label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Contract Value
              </label>
              <Input
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Terms</label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Contract terms and conditions..."
                value={form.terms}
                onChange={(e) => setForm({ ...form, terms: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/contracts')}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                <Save className="mr-2 h-4 w-4" />
                Create Contract
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
