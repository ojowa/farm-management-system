'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { inventoryAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';

export default function EditInventoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { canCreate } = usePermission();
  const readOnly = !canCreate('farm');

  if (readOnly) {
    router.push('/inventory');
    return null;
  }

  const {
    data: itemData,
    loading: loadingItem,
  } = useFetch<{ data: any }>(`inventory-${id}`, () => inventoryAPI.get(id));

  // The inventory endpoint returns the item bare; accept `{ data }` too so
  // a loaded item never falls through to "Item not found".
  const item = ((itemData as any)?.data ?? itemData ?? null);

  const [form, setForm] = useState({ name: '', category: '', quantity: '', unit: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || '',
        category: item.category || '',
        quantity: item.quantity?.toString() || '0',
        unit: item.unit || '',
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors: Record<string, string> = {};
    if (!form.name.trim()) fieldErrors.name = 'Name is required';
    if (!form.category.trim()) fieldErrors.category = 'Category is required';
    const quantity = Number(form.quantity);
    if (form.quantity === '' || !Number.isFinite(quantity) || quantity < 0) {
      fieldErrors.quantity = 'Quantity must be a number of 0 or more';
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await inventoryAPI.update(id, {
        name: form.name,
        category: form.category,
        quantity,
        unit: form.unit,
      });
      toast({ type: 'success', title: 'Inventory item updated successfully' });
      clearFetchCache('inventory');
      router.push(`/inventory/${id}`);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to update inventory item',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loadingItem) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Inventory item not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/inventory')}
        >
          Back to Inventory
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/inventory/${id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Item
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Edit Inventory Item</h1>
        <p className="text-muted-foreground">Update {item.name}</p>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Item Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Fertilizer, Seeds, Tools"
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
              <label className="text-sm font-medium mb-1 block">
                Category <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Feed, Seeds, Tools, Chemicals"
                value={form.category}
                onChange={(e) => {
                  setForm({ ...form, category: e.target.value });
                  if (errors.category) setErrors({ ...errors, category: '' });
                }}
              />
              {errors.category && (
                <p className="text-sm text-destructive mt-1">{errors.category}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Quantity <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => {
                    setForm({ ...form, quantity: e.target.value });
                    if (errors.quantity) setErrors({ ...errors, quantity: '' });
                  }}
                />
                {errors.quantity && (
                  <p className="text-sm text-destructive mt-1">{errors.quantity}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Unit</label>
                <Input
                  placeholder="kg, bags, litres"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/inventory/${id}`)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
