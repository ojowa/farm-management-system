'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { eggProductionAPI, flocksAPI } from '@/lib/api';
import { Button, Modal, Input, Select } from '@/components/ui';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import FilterBar from '@/components/FilterBar';
import { useToasts } from '@/lib/toasts';

interface EggRecord { id: string; flockId: string; flockBatch?: string; totalEggs: number; goodEggs: number; brokenEggs: number; date: string; }

const PAGE_SIZE = 10;

export default function EggProductionPage() {
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [records, setRecords] = useState<EggRecord[]>([]);
  const [flocks, setFlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ flockId: '', totalEggs: '', goodEggs: '', brokenEggs: '', date: '' });
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const [eRes, flocksRes] = await Promise.all([eggProductionAPI.list(), flocksAPI.list()]);
      setRecords(eRes.data.records || eRes.data || []);
      setFlocks(flocksRes.data.flocks || flocksRes.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => { setPage(1); }, [search]);

  const filtered = useMemo(() => {
    if (!search) return records;
    const q = search.toLowerCase();
    return records.filter((r) => r.flockBatch?.toLowerCase().includes(q));
  }, [records, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await eggProductionAPI.create({
        ...form,
        totalEggs: Number(form.totalEggs),
        goodEggs: Number(form.goodEggs),
        brokenEggs: Number(form.brokenEggs),
      });
      success('Egg production recorded');
      setShowAdd(false);
      setForm({ flockId: '', totalEggs: '', goodEggs: '', brokenEggs: '', date: '' });
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to add'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Egg Production</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track daily egg collection</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Record</Button>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by flock…"
      />

      <DataTable
        data={paginated}
        loading={loading}
        emptyMessage={search ? 'No records match your search.' : 'No egg production records yet. Add your first record!'}
        emptyIcon="🥚"
        onRowClick={(r) => router.push(`/egg-production/${r.id}`)}
        columns={[
          { key: 'flockBatch', label: 'Flock', render: (r) => r.flockBatch || r.flockId },
          { key: 'totalEggs', label: 'Total', render: (r) => <span className="font-medium">{r.totalEggs}</span> },
          { key: 'goodEggs', label: 'Good', render: (r) => <span className="text-green-600">{r.goodEggs}</span> },
          { key: 'brokenEggs', label: 'Broken', render: (r) => <span className="text-red-600">{r.brokenEggs}</span> },
          { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Egg Production Record">
        <form onSubmit={handleAdd}>
          <Select label="Flock" required value={form.flockId} onChange={(e) => setForm({ ...form, flockId: e.target.value })}>
            <option value="">Select flock</option>
            {flocks.map((f: any) => <option key={f.id} value={f.id}>{f.batchCode}</option>)}
          </Select>
          <Input label="Total Eggs" type="number" required value={form.totalEggs} onChange={(e) => setForm({ ...form, totalEggs: e.target.value })} />
          <Input label="Good Eggs" type="number" required value={form.goodEggs} onChange={(e) => setForm({ ...form, goodEggs: e.target.value })} />
          <Input label="Broken Eggs" type="number" required value={form.brokenEggs} onChange={(e) => setForm({ ...form, brokenEggs: e.target.value })} />
          <Input label="Date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Record</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
