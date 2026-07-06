'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { equipmentAPI, farmsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useReadOnly } from '@/lib/useReadOnly';

const EQUIPMENT_TYPES = [
  { value: 'Tractor', label: 'Tractor' },
  { value: 'Harvester', label: 'Harvester' },
  { value: 'Plough', label: 'Plough' },
  { value: 'Irrigation System', label: 'Irrigation System' },
  { value: 'Sprayer', label: 'Sprayer' },
  { value: 'Generator', label: 'Generator' },
  { value: 'Vehicle', label: 'Vehicle' },
  { value: 'Other', label: 'Other' },
];

export default function NewEquipmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const readOnly = useReadOnly();

  if (readOnly) {
    router.push('/equipment');
    return null;
  }

  const [form, setForm] = useState({
    name: '',
    type: '',
    model: '',
    serialNumber: '',
    farmId: '',
    purchaseDate: '',
    cost: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: farmsData } = useFetch<{ data: { id: string; name: string }[] }>(
    'farms-dropdown',
    () => farmsAPI.list({ limit: 100 }),
    { cacheTime: 60_000 }
  );
  const farms = farmsData?.data || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: 'Name is required' });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await equipmentAPI.create({
        name: form.name,
        type: form.type || undefined,
        model: form.model || undefined,
        serialNumber: form.serialNumber || undefined,
        farmId: form.farmId || undefined,
        purchaseDate: form.purchaseDate || undefined,
        cost: form.cost ? Number(form.cost) : undefined,
        notes: form.notes || undefined,
      });
      toast({ type: 'success', title: 'Equipment created successfully' });
      clearFetchCache('equipment');
      router.push('/equipment');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to create equipment',
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
          href="/equipment"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Equipment
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Add Equipment</h1>
        <p className="text-muted-foreground">Register a new piece of equipment</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. John Deere Tractor"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <Select
                placeholder="Select equipment type"
                options={EQUIPMENT_TYPES}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Model</label>
                <Input
                  placeholder="e.g. 5075E"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Serial Number
                </label>
                <Input
                  placeholder="e.g. JD-123456"
                  value={form.serialNumber}
                  onChange={(e) =>
                    setForm({ ...form, serialNumber: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Farm</label>
              <Select
                placeholder="Select a farm"
                options={farms.map((f) => ({ value: f.id, label: f.name }))}
                value={form.farmId}
                onChange={(e) => setForm({ ...form, farmId: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Purchase Date
                </label>
                <Input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) =>
                    setForm({ ...form, purchaseDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Cost
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Additional notes about this equipment..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/equipment')}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                <Save className="mr-2 h-4 w-4" />
                Create Equipment
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
