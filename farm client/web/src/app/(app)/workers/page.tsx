'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { workersAPI, farmsAPI } from '@/lib/api';
import { Button, Modal, Input, Select, Badge } from '@/components/ui';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import FilterBar from '@/components/FilterBar';
import { useToasts } from '@/lib/toasts';

interface Worker { id: string; firstName: string; middleName?: string; lastName: string; position: string; phone?: string; farmId: string; farmName?: string; status: string; }
const STATUS_COLORS: Record<string, string> = { active: 'green', inactive: 'gray', on_leave: 'yellow' };
const PAGE_SIZE = 10;

export default function WorkersPage() {
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ firstName: '', middleName: '', lastName: '', phone: '', farmId: '', email: '', position: '' });
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [farmFilter, setFarmFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const [wRes, farmsRes] = await Promise.all([workersAPI.list(), farmsAPI.list()]);
      setWorkers(wRes.data.workers || wRes.data || []);
      setFarms(farmsRes.data.farms || farmsRes.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => { setPage(1); }, [search, farmFilter]);

  const filtered = useMemo(() => {
    let result = workers;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((w) =>
        `${w.firstName} ${w.lastName}`.toLowerCase().includes(q) || w.position?.toLowerCase().includes(q)
      );
    }
    if (farmFilter) {
      result = result.filter((w) => w.farmId === farmFilter);
    }
    return result;
  }, [workers, search, farmFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await workersAPI.create(form);
      success('Worker added');
      setShowAdd(false);
      setForm({ firstName: '', middleName: '', lastName: '', phone: '', farmId: '', email: '', position: '' });
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to add'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workers</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage farm workers and staff</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Worker</Button>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or position…"
        filters={[
          {
            key: 'farmId',
            label: 'All farms',
            options: farms.map((f: any) => ({ value: f.id, label: f.name })),
          },
        ]}
        filterValues={{ farmId: farmFilter }}
        onFilterChange={(_key, val) => setFarmFilter(val)}
        onClear={() => { setSearch(''); setFarmFilter(''); }}
      />

      <DataTable
        data={paginated}
        loading={loading}
        emptyMessage={search || farmFilter ? 'No workers match your filters.' : 'No workers yet. Add your first worker!'}
        emptyIcon="👷"
        onRowClick={(w) => router.push(`/workers/${w.id}`)}
        columns={[
          { key: 'firstName', label: 'Name', render: (w) => <span className="font-medium">{w.firstName} {w.middleName ? `${w.middleName} ` : ''}{w.lastName}</span> },
          { key: 'position', label: 'Position' },
          { key: 'phone', label: 'Phone', render: (w) => w.phone || '—' },
          { key: 'farmName', label: 'Farm', render: (w) => w.farmName || '—' },
          { key: 'status', label: 'Status', render: (w) => <Badge color={STATUS_COLORS[w.status] || 'gray'}>{w.status}</Badge> },
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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Worker">
        <form onSubmit={handleAdd}>
          <Input label="First Name" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <Input label="Middle Name" value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} />
          <Input label="Last Name" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          <Input label="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="e.g. Farmhand, Manager" />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Select label="Farm" required value={form.farmId} onChange={(e) => setForm({ ...form, farmId: e.target.value })}>
            <option value="">Select farm</option>
            {farms.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Worker</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
