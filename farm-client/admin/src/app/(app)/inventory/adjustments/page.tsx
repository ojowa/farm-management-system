'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Minus } from 'lucide-react';
import { inventoryAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';
import { usePermission } from '@/lib/usePermission';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
}

export default function StockAdjustmentsPage() {
  const { canCreate } = usePermission();
  const readOnly = !canCreate('farm');
  const { toast } = useToast();
  const [type, setType] = useState<'in' | 'out'>('in');
  const [inventoryItemId, setInventoryItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);

  const {
    data: inventoryData,
    refetch,
  } = useFetch<{ data: InventoryItem[] }>(
    'inventory-list',
    () => inventoryAPI.list({ limit: 200 }),
    { cacheTime: 30_000 }
  );

  const items = inventoryData?.data || [];

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (event.action === 'updated') {
        clearFetchCache('inventory');
        refetch();
      }
    },
    [refetch]
  );
  useRealtime('inventory', handleRealtimeEvent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryItemId || !quantity) {
      toast({ type: 'error', title: 'Please fill in all required fields' });
      return;
    }
    const numQty = Number(quantity);
    if (!Number.isFinite(numQty) || numQty <= 0) {
      toast({ type: 'error', title: 'Quantity must be a positive number' });
      return;
    }
    // PUT /inventory/:id sets an ABSOLUTE quantity, so apply the entered
    // amount as a delta against the item's current stock. The old code sent
    // ±numQty as the new total, wiping stock on "in" and going negative on
    // "out".
    const current = items.find((i) => i.id === inventoryItemId)?.quantity ?? 0;
    const nextQuantity = type === 'in' ? current + numQty : current - numQty;
    if (nextQuantity < 0) {
      toast({
        type: 'error',
        title: 'Insufficient stock',
        message: `Only ${current} in stock — cannot remove ${numQty}.`,
      });
      return;
    }
    setSaving(true);
    try {
      await inventoryAPI.update(inventoryItemId, { quantity: nextQuantity });
      toast({
        type: 'success',
        title: `Stock ${type === 'in' ? 'added' : 'removed'} successfully`,
      });
      setQuantity('');
      clearFetchCache('inventory');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to adjust stock',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedItem = items.find((i) => i.id === inventoryItemId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/inventory"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Inventory
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Stock Adjustments</h1>
        <p className="text-muted-foreground">Add or remove inventory stock</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Adjustment Form */}
        {!readOnly && (
          <Card>
            <CardHeader>
              <CardTitle>New Adjustment</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Adjustment Type
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={type === 'in' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setType('in')}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Stock In
                    </Button>
                    <Button
                      type="button"
                      variant={type === 'out' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setType('out')}
                    >
                      <Minus className="mr-1 h-4 w-4" />
                      Stock Out
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Inventory Item <span className="text-destructive">*</span>
                  </label>
                  <Select
                    placeholder="Select an item"
                    options={items.map((item) => ({
                      value: item.id,
                      label: `${item.name} (${item.quantity} ${item.unit || ''})`,
                    }))}
                    value={inventoryItemId}
                    onChange={(e) => setInventoryItemId(e.target.value)}
                  />
                </div>

                {selectedItem && (
                  <div className="rounded-lg border p-3 bg-muted/50">
                    <p className="text-sm text-muted-foreground">Current Stock</p>
                    <p className="text-lg font-semibold">
                      {selectedItem.quantity} {selectedItem.unit || 'units'}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Quantity <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>

                <Button type="submit" loading={saving} className="w-full">
                  {type === 'in' ? 'Add Stock' : 'Remove Stock'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Quick Info */}
        <Card>
          <CardHeader>
            <CardTitle>Adjustment Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium">Stock In</p>
                <p className="text-sm text-muted-foreground">
                  Add new inventory items to your stock. Used when receiving deliveries or purchases.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <Minus className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-medium">Stock Out</p>
                <p className="text-sm text-muted-foreground">
                  Remove items from stock. Used when items are consumed, sold, or disposed of.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
