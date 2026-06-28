'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { medicationAPI, flocksAPI } from '@/lib/api';
import { Button, Modal, Input, Select, TextArea, Badge } from '@/components/ui';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import FilterBar from '@/components/FilterBar';
import { useToasts } from '@/lib/toasts';

interface Medication { id: string; flockId?: string; flockBatch?: string; name: string; type: string; dosage: string; startDate: string; endDate?: string; status: string; notes?: string; }

const STATUS_COLORS: Record<string, string> = { active: 'green', completed: 'blue', discontinued: 'red' };
const PAGE_SIZE = 10;

export default function MedicationsPage() {
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [flocks, setFlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ flockId: '', name: '', type: 'antibiotic', dosage: '', startDate: '', endDate: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const [mRes, flocksRes] = await Promise.all([medicationAPI.list(), flocksAPI.list()]);
      setMedications(mRes.data.medications || mRes.data || []);
      setFlocks(flocksRes.data.flocks || flocksRes.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const filtered = useMemo(() => {
    let result = medications;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((m) =>
        m.name.toLowerCase().includes(q) || m.flockBatch?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter((m) => m.status === statusFilter);
    }
    return result;
  }, [medications, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await medicationAPI.create(form);
      success('Medication added');
      setShowAdd(false);
      setForm({ flockId: '', name: '', type: 'antibiotic', dosage: '', startDate: '', endDate: '', notes: '' });
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to add'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Medications</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track medication treatments for your flocks</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Medication</Button>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or flock…"
        filters={[
          {
            key: 'status',
            label: 'All statuses',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' },
              { value: 'discontinued', label: 'Discontinued' },
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
        emptyMessage={search || statusFilter ? 'No medications match your filters.' : 'No medication records yet. Add your first medication!'}
        emptyIcon="💊"
        onRowClick={(m) => router.push(`/medications/${m.id}`)}
        columns={[
          { key: 'name', label: 'Name', render: (m) => <span className="font-medium">{m.name}</span> },
          { key: 'type', label: 'Type', render: (m) => <span className="capitalize">{m.type}</span> },
          { key: 'flockBatch', label: 'Flock', render: (m) => m.flockBatch || '—' },
          { key: 'dosage', label: 'Dosage', render: (m) => m.dosage },
          { key: 'startDate', label: 'Start', render: (m) => m.startDate ? new Date(m.startDate).toLocaleDateString() : '—' },
          { key: 'status', label: 'Status', render: (m) => <Badge color={STATUS_COLORS[m.status] || 'gray'}>{m.status}</Badge> },
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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Medication">
        <form onSubmit={handleAdd}>
          <Select label="Flock (optional)" value={form.flockId} onChange={(e) => setForm({ ...form, flockId: e.target.value })}>
            <option value="">All flocks</option>
            {flocks.map((f: any) => <option key={f.id} value={f.id}>{f.batchCode}</option>)}
          </Select>
          <Input label="Medication Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Amoxicillin" />
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="antibiotic">Antibiotic</option><option value="vitamin">Vitamin</option><option value="vaccine">Vaccine</option><option value="supplement">Supplement</option><option value="other">Other</option>
          </Select>
          <Input label="Dosage" required value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="e.g. 500mg/day" />
          <Input label="Start Date" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <Input label="End Date" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          <TextArea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Medication</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
