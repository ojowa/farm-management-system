'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { livestockAPI, farmsAPI } from '@/lib/api';
import { Button, Modal, Input, Select, Badge } from '@/components/ui';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import FilterBar from '@/components/FilterBar';
import { useToasts } from '@/lib/toasts';
import { useRealtime } from '@/hooks/useRealtime';

interface Animal { id: string; name: string; type: string; breed?: string; farmId: string; farmName?: string; status: string; tagNumber?: string; }

const STATUS_COLORS: Record<string, string> = { healthy: 'green', sick: 'red', quarantined: 'yellow', sold: 'blue' };
const PAGE_SIZE = 10;

export default function LivestockPage() {
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'cattle', breed: '', farmId: '', status: 'healthy', tagNumber: '' });
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [farmFilter, setFarmFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const [livRes, farmsRes] = await Promise.all([livestockAPI.list(), farmsAPI.list()]);
      setAnimals(livRes.data.animals || livRes.data || []);
      setFarms(farmsRes.data.farms || farmsRes.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRealtimeEvent = useCallback((event: { entity: string; action: string; data: any }) => {
    if (['created', 'updated', 'deleted'].includes(event.action)) load();
  }, []);
  useRealtime('livestock', handleRealtimeEvent);

  useEffect(() => { setPage(1); }, [search, typeFilter, farmFilter]);

  const filtered = useMemo(() => {
    let result = animals;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((a) =>
        a.name.toLowerCase().includes(q) || a.breed?.toLowerCase().includes(q) || a.tagNumber?.toLowerCase().includes(q)
      );
    }
    if (typeFilter) {
      result = result.filter((a) => a.type === typeFilter);
    }
    if (farmFilter) {
      result = result.filter((a) => a.farmId === farmFilter);
    }
    return result;
  }, [animals, search, typeFilter, farmFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await livestockAPI.create(form);
      success('Animal added');
      setShowAdd(false);
      setForm({ name: '', type: 'cattle', breed: '', farmId: '', status: 'healthy', tagNumber: '' });
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to add'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Livestock</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your livestock inventory</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Animal</Button>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, breed, or tag…"
        filters={[
          {
            key: 'type',
            label: 'All types',
            options: [
              { value: 'cattle', label: 'Cattle' },
              { value: 'sheep', label: 'Sheep' },
              { value: 'goat', label: 'Goat' },
              { value: 'pig', label: 'Pig' },
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
        emptyMessage={search || typeFilter || farmFilter ? 'No animals match your filters.' : 'No livestock yet. Add your first animal!'}
        emptyIcon="🐄"
        onRowClick={(a) => router.push(`/livestock/${a.id}`)}
        columns={[
          { key: 'name', label: 'Name', render: (a) => <span className="font-medium">{a.name}</span> },
          { key: 'type', label: 'Type' },
          { key: 'breed', label: 'Breed', render: (a) => a.breed || '—' },
          { key: 'farmName', label: 'Farm', render: (a) => a.farmName || '—' },
          { key: 'status', label: 'Status', render: (a) => <Badge color={STATUS_COLORS[a.status] || 'gray'}>{a.status}</Badge> },
          { key: 'tagNumber', label: 'Tag', render: (a) => a.tagNumber || '—' },
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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Animal">
        <form onSubmit={handleAdd}>
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="cattle">Cattle</option><option value="sheep">Sheep</option><option value="goat">Goat</option><option value="pig">Pig</option><option value="other">Other</option>
          </Select>
          <Input label="Breed" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
          <Select label="Farm" required value={form.farmId} onChange={(e) => setForm({ ...form, farmId: e.target.value })}>
            <option value="">Select farm</option>
            {farms.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <Input label="Tag Number" value={form.tagNumber} onChange={(e) => setForm({ ...form, tagNumber: e.target.value })} />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Animal</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
