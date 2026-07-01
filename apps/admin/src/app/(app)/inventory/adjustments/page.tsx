'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Minus,
  ArrowRightLeft,
  Calendar,
  Package,
} from 'lucide-react';
import { inventoryAPI, farmsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';
import { useReadOnly } from '@/lib/useReadOnly';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
}

interface Adjustment {
  id: string;
  inventoryItemId: string;
  inventoryItem?: InventoryItem;
  type: 'in' | 'out' | 'transfer';
  quantity: number;
  notes?: string;
  createdAt: string;
}

export default function StockAdjustmentsPage() {
  const router = useRouter();
  const readOnly = useReadOnly();
  const { toast } = useToast();
  const [type, setType] = useState<'in' | 'out' | 'transfer'>('in');
  const [inventoryItemId, setInventoryItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const {
    data: inventoryData,
    loading: loadingInventory,
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
      }
    },
    []
  );
  useRealtime('inventory', handleRealtimeEvent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryItemId || !quantity) {
      toast({ type: 'error', title: 'Please fill in all required fields' });
      return;
    }
    setSaving(true);
    try {
      const numQty = Number(quantity);
      await inventoryAPI.update(inventoryItemId, {
        quantity: type === 'in' ? numQty : -numQty,
      });
      toast({
        type: 'success',
        title: `Stock ${type === 'in' ? 'added' : type === 'out' ? 'removed' : 'transferred'} successfully`,
      });
      setQuantity('');
      setNotes('');
      clearFetchCache('inventory');
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
        <p className="text-muted-foreground">Add, remove, or transfer inventory stock</p>
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
                    <Button
                      type="button"
                      variant={type === 'transfer' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setType('transfer')}
                    >
                      <ArrowRightLeft className="mr-1 h-4 w-4" />
                      Transfer
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

                <div>
                  <label className="text-sm font-medium mb-1 block">Notes</label>
                  <Input
                    placeholder="Optional reason for adjustment..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <Button type="submit" loading={saving} className="w-full">
                  {type === 'in' ? 'Add Stock' : type === 'out' ? 'Remove Stock' : 'Transfer Stock'}
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
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <ArrowRightLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium">Transfer</p>
                <p className="text-sm text-muted-foreground">
                  Move items between farms or locations. Adjust quantity accordingly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
