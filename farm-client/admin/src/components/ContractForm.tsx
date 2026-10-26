'use client';

import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';

export interface ContractFormValues {
  type: string;
  buyerSellerName: string;
  startDate: string;
  endDate: string;
  value: string;
  terms: string;
}

export const emptyContractForm: ContractFormValues = {
  type: '',
  buyerSellerName: '',
  startDate: '',
  endDate: '',
  value: '',
  terms: '',
};

/** ISO timestamps come back from the API; <input type="date"> wants YYYY-MM-DD. */
const toInputDate = (value?: string | null) => (value ? value.slice(0, 10) : '');

export function toContractFormValues(contract: any): ContractFormValues {
  return {
    type: contract?.type || '',
    buyerSellerName: contract?.buyerSellerName || contract?.counterpartyName || '',
    startDate: toInputDate(contract?.startDate),
    endDate: toInputDate(contract?.endDate),
    value: contract?.value != null ? String(contract.value) : '',
    terms: contract?.terms || '',
  };
}

interface ContractFormProps {
  initialValues?: ContractFormValues;
  submitLabel: string;
  /** Receives the raw field values; the caller owns the API call and toast. */
  onSubmit: (values: ContractFormValues) => Promise<void>;
  onCancel: () => void;
}

/**
 * The buy/sell contract form, shared by /contracts/new and
 * /contracts/[id]/edit so an edit is the create form with the row loaded
 * rather than a second copy of the same fields and validation. The edit page
 * renders this only once its contract has arrived, so `initialValues` is what
 * the form's state is seeded with on mount.
 */
export function ContractForm({
  initialValues = emptyContractForm,
  submitLabel,
  onSubmit,
  onCancel,
}: ContractFormProps) {
  const [form, setForm] = useState<ContractFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.type) newErrors.type = 'Type is required';
    if (!form.buyerSellerName.trim())
      newErrors.buyerSellerName = 'Counterparty name is required';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  };

  return (
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
            {errors.type && <p className="text-sm text-destructive mt-1">{errors.type}</p>}
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              Counterparty Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. ABC Suppliers Ltd"
              value={form.buyerSellerName}
              onChange={(e) => {
                setForm({ ...form, buyerSellerName: e.target.value });
                if (errors.buyerSellerName) setErrors({ ...errors, buyerSellerName: '' });
              }}
            />
            {errors.buyerSellerName && (
              <p className="text-sm text-destructive mt-1">{errors.buyerSellerName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Start Date</label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">End Date</label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Contract Value</label>
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
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              <Save className="mr-2 h-4 w-4" />
              {submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
