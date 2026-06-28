'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { mortalityRecordsAPI, flocksAPI } from '@/lib/api';
import { Button, Modal, Input, Select, TextArea } from '@/components/ui';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import FilterBar from '@/components/FilterBar';
import { useToasts } from '@/lib/toasts';

interface MortalityRecord { id: string; flockId: string; flockBatch?: string; count: number; cause?: string; date: string; }

const PAGE_SIZE = 10;

export default function MortalityPage() {
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [records, setRecords] = useState<MortalityRecord[]>([]);
  const [flocks, setFlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ flockId: '', count: '', cause: '', date: '' });
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const [mRes, flocksRes] = await Promise.all([mortalityRecordsAPI.list(), flocksAPI.list()]);
      setRecords(mRes.data.records || mRes.data || []);
      setFlocks(flocksRes.data.flocks || flocksRes.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => { setPage(1); }, [search]);

  const filtered = useMemo(() => {
    if (!search) return records;
    const q = search.toLowerCase();
    return records.filter((r) =>
      r.flockBatch?.toLowerCase().includes(q) || r.cause?.toLowerCase().includes(q)
    );
  }, [records, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await mortalityRecordsAPI.create({ ...form, count: Number(form.count) });
      success('Mortality recorded');
      setShowAdd(false);
      setForm({ flockId: '', count: '', cause: '', date: '' });
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to add'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mortality Records</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track bird mortality across flocks</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Record</Button>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by flock or cause…"
      />

      <DataTable
        data={paginated}
        loading={loading}
        emptyMessage={search ? 'No records match your search.' : 'No mortality records yet. Add your first record!'}
        emptyIcon="☠️"
        onRowClick={(r) => router.push(`/mortality/${r.id}`)}
        columns={[
          { key: 'flockBatch', label: 'Flock', render: (r) => r.flockBatch || r.flockId },
          { key: 'count', label: 'Count', render: (r) => <span className="font-medium text-red-600">{r.count}</span> },
          { key: 'cause', label: 'Cause', render: (r) => r.cause || '—' },
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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Mortality Record">
        <form onSubmit={handleAdd}>
          <Select label="Flock" required value={form.flockId} onChange={(e) => setForm({ ...form, flockId: e.target.value })}>
            <option value="">Select flock</option>
            {flocks.map((f: any) => <option key={f.id} value={f.id}>{f.batchCode}</option>)}
          </Select>
          <Input label="Count" type="number" required value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} />
          <TextArea label="Cause" value={form.cause} onChange={(e) => setForm({ ...form, cause: e.target.value })} placeholder="e.g. Disease, Predation" rows={2} />
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
