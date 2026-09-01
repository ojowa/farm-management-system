'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Package,
  ShoppingCart,
  Loader2,
} from 'lucide-react';
import { lowStockAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/lib/toasts';

interface LowStockItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minimumQuantity: number;
  unit?: string;
  farmName?: string;
}

export default function LowStockPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    try {
      const res = await lowStockAPI.list();
      const data = res.data?.data || res.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to load low stock items',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleReorder(id: string, name: string) {
    setReordering(id);
    try {
      await lowStockAPI.reorder(id);
      toast({
        type: 'success',
        title: 'Reorder initiated',
        message: `Reorder request for "${name}" has been submitted.`,
      });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Reorder failed',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setReordering(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Low Stock Alerts</h1>
          <p className="text-muted-foreground">
            Items below minimum quantity that need restocking
          </p>
        </div>
        <Button variant="outline" onClick={loadItems} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Package className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/30">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Low Stock Items</p>
              <p className="text-2xl font-bold">
                {loading ? '—' : items.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Items Below Minimum Quantity
          </CardTitle>
        </CardHeader>
        {loading ? (
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        ) : items.length === 0 ? (
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              All stock levels are healthy.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              No items are currently below their minimum quantity.
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Qty</TableHead>
                  <TableHead>Min Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Farm</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-red-600">{item.quantity}</span>
                    </TableCell>
                    <TableCell>{item.minimumQuantity}</TableCell>
                    <TableCell>{item.unit || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.farmName || '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReorder(item.id, item.name)}
                        disabled={reordering === item.id}
                      >
                        {reordering === item.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <ShoppingCart className="mr-1 h-3 w-3" />
                        )}
                        Reorder
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
