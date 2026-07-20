'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { flocksAPI, farmsAPI, breedsAPI } from '@/lib/api';
import { Button, Modal, Input, Select, Badge } from '@/components/ui';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import FilterBar from '@/components/FilterBar';
import { useToasts } from '@/lib/toasts';

interface Flock { id: string; batchCode: string; farmId: string; farmName?: string; breedId: string; breedName?: string; birdCount: number; currentCount: number; status: string; arrivalDate: string; currentAgeDays: number; }
const STATUS_COLORS: Record<string, string> = { ACTIVE: 'green', SOLD: 'blue', DECEASED: 'red', COMPLETED: 'gray' };
const PAGE_SIZE = 10;

export default function FlocksPage() {
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [breeds, setBreeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ farmId: '', breedId: '', batchCode: '', birdCount: '', arrivalDate: '', status: 'ACTIVE' });
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const [fRes, farmsRes, breedsRes] = await Promise.all([flocksAPI.list(), farmsAPI.list(), breedsAPI.list()]);
      setFlocks(fRes.data.flocks || fRes.data || []);
      setFarms(farmsRes.data.farms || farmsRes.data || []);
      setBreeds(breedsRes.data.breeds || breedsRes.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const filtered = useMemo(() => {
    let result = flocks;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((f) =>
        f.batchCode.toLowerCase().includes(q) || f.breedName?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter((f) => f.status === statusFilter);
    }
    return result;
  }, [flocks, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await flocksAPI.create({ ...form, birdCount: Number(form.birdCount) });
      success('Flock created');
      setShowAdd(false);
      setForm({ farmId: '', breedId: '', batchCode: '', birdCount: '', arrivalDate: '', status: 'ACTIVE' });
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to create flock'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flocks</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage poultry flocks and batches</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Flock</Button>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by batch code or breed…"
        filters={[
          {
            key: 'status',
            label: 'All statuses',
            options: [
              { value: 'ACTIVE', label: 'Active' },
              { value: 'SOLD', label: 'Sold' },
              { value: 'DECEASED', label: 'Deceased' },
              { value: 'COMPLETED', label: 'Completed' },
            ],
          },
        ]}
        filterValues={{ status: statusFilter }}
        onFilterChange={(_key, val) => setStatusFilter(val)}
        onClear={() => { setSearch(''); setStatusFilter(''); }}
      />

      <DataTable
        data={paginated}
        loading={loading}
        emptyMessage={search || statusFilter ? 'No flocks match your filters.' : 'No flocks yet. Add your first flock!'}
        emptyIcon="🪶"
        onRowClick={(f) => router.push(`/flocks/${f.id}`)}
        columns={[
          { key: 'batchCode', label: 'Batch', render: (f) => <span className="font-medium">{f.batchCode}</span> },
          { key: 'farmName', label: 'Farm', render: (f) => f.farmName || '—' },
          { key: 'breedName', label: 'Breed', render: (f) => f.breedName || '—' },
          { key: 'birdCount', label: 'Birds', render: (f) => `${f.currentCount}/${f.birdCount}` },
          { key: 'currentAgeDays', label: 'Age (days)', render: (f) => f.currentAgeDays?.toString() || '—' },
          { key: 'status', label: 'Status', render: (f) => <Badge color={STATUS_COLORS[f.status] || 'gray'}>{f.status}</Badge> },
          { key: 'arrivalDate', label: 'Arrival', render: (f) => f.arrivalDate ? new Date(f.arrivalDate).toLocaleDateString() : '—' },
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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Flock">
        <form onSubmit={handleAdd}>
          <Input label="Batch Code" required value={form.batchCode} onChange={(e) => setForm({ ...form, batchCode: e.target.value })} placeholder="BATCH-001" />
          <Select label="Farm" required value={form.farmId} onChange={(e) => setForm({ ...form, farmId: e.target.value })}>
            <option value="">Select farm</option>
            {farms.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <Select label="Breed" required value={form.breedId} onChange={(e) => setForm({ ...form, breedId: e.target.value })}>
            <option value="">Select breed</option>
            {breeds.map((b: any) => <option key={b.id} value={b.id}>{b.name} ({b.birdType})</option>)}
          </Select>
          <Input label="Bird Count" type="number" required value={form.birdCount} onChange={(e) => setForm({ ...form, birdCount: e.target.value })} />
          <Input label="Arrival Date" type="date" required value={form.arrivalDate} onChange={(e) => setForm({ ...form, arrivalDate: e.target.value })} />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Flock</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
