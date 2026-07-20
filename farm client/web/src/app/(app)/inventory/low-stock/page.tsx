'use client';

import React, { useEffect, useState } from 'react';
import { inventoryAPI } from '@/lib/api';
import { Card, Badge, Button, LoadingSpinner, EmptyState } from '@/components/ui';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minQuantity?: number;
  farmName?: string;
  costPerUnit?: number;
}

const LOW_STOCK_THRESHOLD = 10;

export default function LowStockPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await inventoryAPI.list();
        const list = res.data.items || res.data || [];
        const lowStock = list.filter(
          (item: InventoryItem) =>
            item.quantity <= (item.minQuantity || LOW_STOCK_THRESHOLD)
        );
        setItems(lowStock);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Low Stock Alerts</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Items that need restocking</p>
        </div>
        <Button onClick={() => {}}>+ Add Item</Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon="✅"
            title="All stocked up"
            description="No inventory items are below their minimum quantity threshold."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id}>
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                <Badge color="red">Low Stock</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Category</span>
                  <span className="text-gray-900 dark:text-white">{item.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Quantity</span>
                  <span className="text-red-600 font-semibold">
                    {item.quantity} {item.unit || ''}
                  </span>
                </div>
                {item.minQuantity !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Min Required</span>
                    <span className="text-gray-900 dark:text-white">
                      {item.minQuantity} {item.unit || ''}
                    </span>
                  </div>
                )}
                {item.farmName && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Farm</span>
                    <span className="text-gray-900 dark:text-white">{item.farmName}</span>
                  </div>
                )}
                {item.costPerUnit !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Cost/Unit</span>
                    <span className="text-gray-900 dark:text-white">${item.costPerUnit.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
