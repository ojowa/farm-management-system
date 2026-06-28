'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { vaccinationRecordsAPI, flocksAPI } from '@/lib/api';
import { Button, Modal, Input, Select } from '@/components/ui';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import FilterBar from '@/components/FilterBar';
import { useToasts } from '@/lib/toasts';

interface VaccinationRecord { id: string; flockId: string; flockBatch?: string; vaccine: string; dosage?: string; date: string; }

const PAGE_SIZE = 10;

export default function VaccinationsPage() {
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [records, setRecords] = useState<VaccinationRecord[]>([]);
  const [flocks, setFlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ flockId: '', vaccine: '', dosage: '', date: '' });
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const [vRes, flocksRes] = await Promise.all([vaccinationRecordsAPI.list(), flocksAPI.list()]);
      setRecords(vRes.data.records || vRes.data || []);
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
      r.vaccine.toLowerCase().includes(q) || r.flockBatch?.toLowerCase().includes(q)
    );
  }, [records, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await vaccinationRecordsAPI.create(form);
      success('Vaccination recorded');
      setShowAdd(false);
      setForm({ flockId: '', vaccine: '', dosage: '', date: '' });
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to add'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vaccination Records</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track vaccinations for your flocks</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Record</Button>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by vaccine or flock…"
      />

      <DataTable
        data={paginated}
        loading={loading}
        emptyMessage={search ? 'No records match your search.' : 'No vaccination records yet. Add your first record!'}
        emptyIcon="💉"
        onRowClick={(r) => router.push(`/vaccinations/${r.id}`)}
        columns={[
          { key: 'vaccine', label: 'Vaccine', render: (r) => <span className="font-medium">{r.vaccine}</span> },
          { key: 'flockBatch', label: 'Flock', render: (r) => r.flockBatch || r.flockId },
          { key: 'dosage', label: 'Dosage', render: (r) => r.dosage || '—' },
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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Vaccination Record">
        <form onSubmit={handleAdd}>
          <Select label="Flock" required value={form.flockId} onChange={(e) => setForm({ ...form, flockId: e.target.value })}>
            <option value="">Select flock</option>
            {flocks.map((f: any) => <option key={f.id} value={f.id}>{f.batchCode}</option>)}
          </Select>
          <Input label="Vaccine" required value={form.vaccine} onChange={(e) => setForm({ ...form, vaccine: e.target.value })} placeholder="e.g. Newcastle, Gumboro" />
          <Input label="Dosage" value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="e.g. 0.5ml" />
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
