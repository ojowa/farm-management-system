'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { farmsAPI } from '@/lib/api';
import { Button, Modal, Input, TextArea } from '@/components/ui';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import FilterBar from '@/components/FilterBar';
import { useToasts } from '@/lib/toasts';
import { useRealtime } from '@/hooks/useRealtime';
import { useFormValidation } from '@/hooks/useFormValidation';
import { farmFormSchema } from '@/lib/validation';

interface Farm {
  id: string;
  name: string;
  location?: string;
  size?: number;
  sizeUnit?: string;
  description?: string;
  status?: string;
  createdAt: string;
}

const PAGE_SIZE = 10;

export default function FarmsPage() {
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', size: '', description: '' });
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const { errors, validate, clearErrors } = useFormValidation(farmFormSchema);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await farmsAPI.list();
      setFarms(data.farms || data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRealtimeEvent = useCallback((event: { entity: string; action: string; data: any }) => {
    if (['created', 'updated', 'deleted'].includes(event.action)) {
      load();
    }
  }, []);
  useRealtime('farm', handleRealtimeEvent);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const filtered = useMemo(() => {
    let result = farms;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((f) =>
        f.name.toLowerCase().includes(q) || f.location?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter((f) => f.status === statusFilter);
    }
    return result;
  }, [farms, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(form)) return;
    setSaving(true);
    try {
      await farmsAPI.create({ name: form.name, location: form.location, size: form.size ? Number(form.size) : undefined, description: form.description });
      success('Farm created');
      setShowAdd(false);
      setForm({ name: '', location: '', size: '', description: '' });
      clearErrors();
      load();
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to create farm');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Farms</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your farm properties</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Farm</Button>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search farms by name or location…"
        filters={[
          {
            key: 'status',
            label: 'All statuses',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
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
        emptyMessage={search || statusFilter ? 'No farms match your filters.' : 'No farms yet. Create your first farm!'}
        emptyIcon="🌾"
        onRowClick={(farm) => router.push(`/farms/${farm.id}`)}
        columns={[
          { key: 'name', label: 'Name', render: (f) => <span className="font-medium">{f.name}</span> },
          { key: 'location', label: 'Location' },
          { key: 'size', label: 'Size', render: (f) => f.size ? `${f.size} ${f.sizeUnit || 'acres'}` : '—' },
          { key: 'createdAt', label: 'Created', render: (f) => new Date(f.createdAt).toLocaleDateString() },
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

      <Modal open={showAdd} onClose={() => { setShowAdd(false); clearErrors(); }} title="Add Farm">
        <form onSubmit={handleAdd}>
          <Input label="Farm Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My Farm" error={errors.name} />
          <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City, Country" />
          <Input label="Size" type="number" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="100" />
          <TextArea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Farm</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
