'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { poultryAPI, farmsAPI } from '@/lib/api';
import { Button, Modal, Input, Select, Badge } from '@/components/ui';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import FilterBar from '@/components/FilterBar';
import { useToasts } from '@/lib/toasts';
import { useRealtime } from '@/hooks/useRealtime';

interface Bird { id: string; name: string; type: string; breed?: string; farmId: string; farmName?: string; status: string; }
const STATUS_COLORS: Record<string, string> = { healthy: 'green', sick: 'red', quarantined: 'yellow', sold: 'blue' };
const PAGE_SIZE = 10;

export default function PoultryPage() {
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [birds, setBirds] = useState<Bird[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'chicken', breed: '', farmId: '', status: 'healthy', quantity: '' });
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [farmFilter, setFarmFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, farmsRes] = await Promise.all([poultryAPI.list(), farmsAPI.list()]);
      setBirds(pRes.data.poultry || pRes.data.animals || pRes.data || []);
      setFarms(farmsRes.data.farms || farmsRes.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRealtimeEvent = useCallback((event: { entity: string; action: string; data: any }) => {
    if (['created', 'updated', 'deleted'].includes(event.action)) load();
  }, []);
  useRealtime('poultry', handleRealtimeEvent);

  useEffect(() => { setPage(1); }, [search, typeFilter, farmFilter]);

  const filtered = useMemo(() => {
    let result = birds;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((b) =>
        b.name.toLowerCase().includes(q) || b.breed?.toLowerCase().includes(q)
      );
    }
    if (typeFilter) {
      result = result.filter((b) => b.type === typeFilter);
    }
    if (farmFilter) {
      result = result.filter((b) => b.farmId === farmFilter);
    }
    return result;
  }, [birds, search, typeFilter, farmFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await poultryAPI.create({ ...form, quantity: form.quantity ? Number(form.quantity) : undefined });
      success('Poultry added');
      setShowAdd(false);
      setForm({ name: '', type: 'chicken', breed: '', farmId: '', status: 'healthy', quantity: '' });
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to add'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Poultry</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your poultry flocks</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Poultry</Button>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or breed…"
        filters={[
          {
            key: 'type',
            label: 'All types',
            options: [
              { value: 'chicken', label: 'Chicken' },
              { value: 'turkey', label: 'Turkey' },
              { value: 'duck', label: 'Duck' },
              { value: 'goose', label: 'Goose' },
              { value: 'quail', label: 'Quail' },
              { value: 'other', label: 'Other' },
            ],
          },
          {
            key: 'farmId',
            label: 'All farms',
            options: farms.map((f: any) => ({ value: f.id, label: f.name })),
          },
        ]}
        filterValues={{ type: typeFilter, farmId: farmFilter }}
        onFilterChange={(key, val) => {
          if (key === 'type') setTypeFilter(val);
          if (key === 'farmId') setFarmFilter(val);
        }}
        onClear={() => { setSearch(''); setTypeFilter(''); setFarmFilter(''); }}
      />

      <DataTable
        data={paginated}
        loading={loading}
        emptyMessage={search || typeFilter || farmFilter ? 'No poultry match your filters.' : 'No poultry yet. Add your first bird!'}
        emptyIcon="🐔"
        onRowClick={(b) => router.push(`/poultry/${b.id}`)}
        columns={[
          { key: 'name', label: 'Name', render: (b) => <span className="font-medium">{b.name}</span> },
          { key: 'type', label: 'Type' },
          { key: 'breed', label: 'Breed', render: (b) => b.breed || '—' },
          { key: 'farmName', label: 'Farm', render: (b) => b.farmName || '—' },
          { key: 'status', label: 'Status', render: (b) => <Badge color={STATUS_COLORS[b.status] || 'gray'}>{b.status}</Badge> },
          { key: 'quantity', label: 'Qty', render: (b) => (b as any).quantity || '—' },
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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Poultry">
        <form onSubmit={handleAdd}>
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="chicken">Chicken</option><option value="turkey">Turkey</option><option value="duck">Duck</option><option value="goose">Goose</option><option value="quail">Quail</option><option value="other">Other</option>
          </Select>
          <Input label="Breed" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
          <Select label="Farm" required value={form.farmId} onChange={(e) => setForm({ ...form, farmId: e.target.value })}>
            <option value="">Select farm</option>
            {farms.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <Input label="Quantity" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Poultry</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
