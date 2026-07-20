'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { feedingRecordsAPI, flocksAPI } from '@/lib/api';
import { Button, Modal, Input, Select } from '@/components/ui';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import FilterBar from '@/components/FilterBar';
import { useToasts } from '@/lib/toasts';

interface FeedingRecord { id: string; flockId: string; flockBatch?: string; feedType: string; quantityKg: number; date: string; }

const PAGE_SIZE = 10;

export default function FeedingPage() {
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [records, setRecords] = useState<FeedingRecord[]>([]);
  const [flocks, setFlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ flockId: '', feedType: '', quantityKg: '', date: '' });
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const [feedRes, flocksRes] = await Promise.all([feedingRecordsAPI.list(), flocksAPI.list()]);
      setRecords(feedRes.data.records || feedRes.data || []);
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
      r.feedType.toLowerCase().includes(q) || r.flockBatch?.toLowerCase().includes(q)
    );
  }, [records, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await feedingRecordsAPI.create({ ...form, quantityKg: Number(form.quantityKg) });
      success('Feeding record added');
      setShowAdd(false);
      setForm({ flockId: '', feedType: '', quantityKg: '', date: '' });
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to add'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Feeding Records</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track feed usage across flocks</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Record</Button>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by feed type or flock…"
      />

      <DataTable
        data={paginated}
        loading={loading}
        emptyMessage={search ? 'No records match your search.' : 'No feeding records yet. Add your first record!'}
        emptyIcon="🍽️"
        onRowClick={(r) => router.push(`/feeding/${r.id}`)}
        columns={[
          { key: 'feedType', label: 'Feed Type', render: (r) => <span className="font-medium">{r.feedType}</span> },
          { key: 'flockBatch', label: 'Flock', render: (r) => r.flockBatch || r.flockId },
          { key: 'quantityKg', label: 'Quantity (kg)', render: (r) => `${r.quantityKg} kg` },
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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Feeding Record">
        <form onSubmit={handleAdd}>
          <Select label="Flock" required value={form.flockId} onChange={(e) => setForm({ ...form, flockId: e.target.value })}>
            <option value="">Select flock</option>
            {flocks.map((f: any) => <option key={f.id} value={f.id}>{f.batchCode}</option>)}
          </Select>
          <Input label="Feed Type" required value={form.feedType} onChange={(e) => setForm({ ...form, feedType: e.target.value })} placeholder="e.g. Starter Feed, Grower" />
          <Input label="Quantity (kg)" type="number" required value={form.quantityKg} onChange={(e) => setForm({ ...form, quantityKg: e.target.value })} />
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
