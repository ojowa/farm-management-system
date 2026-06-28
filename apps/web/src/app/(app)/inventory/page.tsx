'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { inventoryAPI, farmsAPI } from '@/lib/api';
import { Button, Modal, Input, Select, Badge } from '@/components/ui';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import FilterBar from '@/components/FilterBar';
import { useToasts } from '@/lib/toasts';
import { useRealtime } from '@/hooks/useRealtime';

interface Item { id: string; name: string; category: string; quantity: number; unit: string; farmId: string; farmName?: string; }

const PAGE_SIZE = 10;

export default function InventoryPage() {
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [items, setItems] = useState<Item[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'seeds', quantity: '', unit: 'kg', farmId: '', costPerUnit: '' });
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [farmFilter, setFarmFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const [invRes, farmsRes] = await Promise.all([inventoryAPI.list(), farmsAPI.list()]);
      setItems(invRes.data.items || invRes.data || []);
      setFarms(farmsRes.data.farms || farmsRes.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRealtimeEvent = useCallback((event: { entity: string; action: string; data: any }) => {
    if (['created', 'updated', 'deleted'].includes(event.action)) load();
  }, []);
  useRealtime('inventory', handleRealtimeEvent);

  useEffect(() => { setPage(1); }, [search, categoryFilter, farmFilter]);

  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q));
    }
    if (categoryFilter) {
      result = result.filter((i) => i.category === categoryFilter);
    }
    if (farmFilter) {
      result = result.filter((i) => i.farmId === farmFilter);
    }
    return result;
  }, [items, search, categoryFilter, farmFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await inventoryAPI.create({ ...form, quantity: Number(form.quantity), costPerUnit: form.costPerUnit ? Number(form.costPerUnit) : undefined });
      success('Item added');
      setShowAdd(false);
      setForm({ name: '', category: 'seeds', quantity: '', unit: 'kg', farmId: '', costPerUnit: '' });
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to add'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track supplies and materials</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Item</Button>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search inventory items…"
        filters={[
          {
            key: 'category',
            label: 'All categories',
            options: [
              { value: 'seeds', label: 'Seeds' },
              { value: 'fertilizer', label: 'Fertilizer' },
              { value: 'feed', label: 'Feed' },
              { value: 'medicine', label: 'Medicine' },
              { value: 'tools', label: 'Tools' },
              { value: 'fuel', label: 'Fuel' },
              { value: 'other', label: 'Other' },
            ],
          },
          {
            key: 'farmId',
            label: 'All farms',
            options: farms.map((f: any) => ({ value: f.id, label: f.name })),
          },
        ]}
        filterValues={{ category: categoryFilter, farmId: farmFilter }}
        onFilterChange={(key, val) => {
          if (key === 'category') setCategoryFilter(val);
          if (key === 'farmId') setFarmFilter(val);
        }}
        onClear={() => { setSearch(''); setCategoryFilter(''); setFarmFilter(''); }}
      />

      <DataTable
        data={paginated}
        loading={loading}
        emptyMessage={search || categoryFilter || farmFilter ? 'No items match your filters.' : 'No inventory items yet. Add your first item!'}
        emptyIcon="📦"
        onRowClick={(item) => router.push(`/inventory/${item.id}`)}
        columns={[
          { key: 'name', label: 'Item', render: (i) => <span className="font-medium">{i.name}</span> },
          { key: 'category', label: 'Category', render: (i) => <Badge>{i.category}</Badge> },
          { key: 'quantity', label: 'Qty', render: (i) => `${i.quantity} ${i.unit || ''}` },
          { key: 'farmName', label: 'Farm', render: (i) => i.farmName || '—' },
        ]}
        footer={
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
          />
        }
      />

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Inventory Item">
        <form onSubmit={handleAdd}>
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Fertilizer" />
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="seeds">Seeds</option><option value="fertilizer">Fertilizer</option><option value="feed">Feed</option><option value="medicine">Medicine</option><option value="tools">Tools</option><option value="fuel">Fuel</option><option value="other">Other</option>
          </Select>
          <Input label="Quantity" type="number" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <Input label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg, liters, bags..." />
          <Select label="Farm" value={form.farmId} onChange={(e) => setForm({ ...form, farmId: e.target.value })}>
            <option value="">All farms</option>
            {farms.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <Input label="Cost per Unit ($)" type="number" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Item</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
