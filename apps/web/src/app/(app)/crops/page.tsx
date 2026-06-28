'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cropsAPI, farmsAPI } from '@/lib/api';
import { Button, Modal, Input, Select, Badge } from '@/components/ui';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import FilterBar from '@/components/FilterBar';
import { useToasts } from '@/lib/toasts';
import { useRealtime } from '@/hooks/useRealtime';

interface Crop { id: string; name: string; farmId: string; farmName?: string; status: string; plantedDate?: string; expectedHarvestDate?: string; }

const STATUS_COLORS: Record<string, string> = { active: 'green', harvested: 'blue', failed: 'red', pending: 'yellow' };
const PAGE_SIZE = 10;

export default function CropsPage() {
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', farmId: '', cropType: '', area: '', status: 'active' });
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [farmFilter, setFarmFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const [cropsRes, farmsRes] = await Promise.all([cropsAPI.list(), farmsAPI.list()]);
      setCrops(cropsRes.data.crops || cropsRes.data || []);
      setFarms(farmsRes.data.farms || farmsRes.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRealtimeEvent = useCallback((event: { entity: string; action: string; data: any }) => {
    if (['created', 'updated', 'deleted'].includes(event.action)) load();
  }, []);
  useRealtime('crop', handleRealtimeEvent);

  useEffect(() => { setPage(1); }, [search, statusFilter, farmFilter]);

  const filtered = useMemo(() => {
    let result = crops;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (statusFilter) {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (farmFilter) {
      result = result.filter((c) => c.farmId === farmFilter);
    }
    return result;
  }, [crops, search, statusFilter, farmFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await cropsAPI.create({ name: form.name, farmId: form.farmId, cropType: form.cropType, area: form.area ? Number(form.area) : undefined, status: form.status });
      success('Crop added');
      setShowAdd(false);
      setForm({ name: '', farmId: '', cropType: '', area: '', status: 'active' });
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to add crop'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Crops</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track your crops across farms</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Crop</Button>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search crops by name…"
        filters={[
          {
            key: 'status',
            label: 'All statuses',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'pending', label: 'Pending' },
              { value: 'harvested', label: 'Harvested' },
              { value: 'failed', label: 'Failed' },
            ],
          },
          {
            key: 'farmId',
            label: 'All farms',
            options: farms.map((f: any) => ({ value: f.id, label: f.name })),
          },
        ]}
        filterValues={{ status: statusFilter, farmId: farmFilter }}
        onFilterChange={(key, val) => {
          if (key === 'status') setStatusFilter(val);
          if (key === 'farmId') setFarmFilter(val);
        }}
        onClear={() => { setSearch(''); setStatusFilter(''); setFarmFilter(''); }}
      />

      <DataTable
        data={paginated}
        loading={loading}
        emptyMessage={search || statusFilter || farmFilter ? 'No crops match your filters.' : 'No crops yet. Add your first crop!'}
        emptyIcon="🌱"
        onRowClick={(crop) => router.push(`/crops/${crop.id}`)}
        columns={[
          { key: 'name', label: 'Crop', render: (c) => <span className="font-medium">{c.name}</span> },
          { key: 'farmName', label: 'Farm', render: (c) => c.farmName || '—' },
          { key: 'status', label: 'Status', render: (c) => <Badge color={STATUS_COLORS[c.status] || 'gray'}>{c.status}</Badge> },
          { key: 'plantedDate', label: 'Planted', render: (c) => c.plantedDate ? new Date(c.plantedDate).toLocaleDateString() : '—' },
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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Crop">
        <form onSubmit={handleAdd}>
          <Input label="Crop Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Maize" />
          <Select label="Farm" required value={form.farmId} onChange={(e) => setForm({ ...form, farmId: e.target.value })}>
            <option value="">Select farm</option>
            {farms.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <Input label="Crop Type" value={form.cropType} onChange={(e) => setForm({ ...form, cropType: e.target.value })} placeholder="e.g. Grain, Vegetable" />
          <Input label="Area (acres)" type="number" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Crop</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
