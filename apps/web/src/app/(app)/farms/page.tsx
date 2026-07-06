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
  farmType?: string;
  location?: string;
  size?: number;
  sizeUnit?: string;
  description?: string;
  status?: string;
  createdAt: string;
}

const FARM_TYPE_COLORS: Record<string, string> = {
  CROP: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  LIVESTOCK: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  POULTRY: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  DAIRY: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  AQUACULTURE: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
};

const FARM_TYPE_LABELS: Record<string, string> = {
  CROP: 'Crop',
  LIVESTOCK: 'Livestock',
  POULTRY: 'Poultry',
  DAIRY: 'Dairy',
  AQUACULTURE: 'Aquaculture',
};

const FARM_TYPE_OPTIONS = [
  { value: 'CROP', label: 'Crop' },
  { value: 'LIVESTOCK', label: 'Livestock' },
  { value: 'POULTRY', label: 'Poultry' },
  { value: 'DAIRY', label: 'Dairy' },
  { value: 'AQUACULTURE', label: 'Aquaculture' },
];

const PAGE_SIZE = 10;

export default function FarmsPage() {
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const user = {
    id: '1',
    firstName: 'User',
    fullName: 'User',
    role: 'ADMIN',
    organizationId: '1',
    organizationName: 'Farm',
    permissions: [],
    planFeatures: { modules: [], farmTypes: [] }
  };
  const farmTypeOptions = useMemo(() => FARM_TYPE_OPTIONS, []);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', farmType: '', location: '', size: '', description: '' });
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [farmTypeFilter, setFarmTypeFilter] = useState('');
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

  useEffect(() => { setPage(1); }, [search, statusFilter, farmTypeFilter]);

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
    if (farmTypeFilter) {
      result = result.filter((f) => f.farmType === farmTypeFilter);
    }
    return result;
  }, [farms, search, statusFilter, farmTypeFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(form)) return;
    setSaving(true);
    try {
      await farmsAPI.create({ name: form.name, farmType: form.farmType, location: form.location, size: form.size ? Number(form.size) : undefined, description: form.description });
      success('Farm created');
      setShowAdd(false);
      setForm({ name: '', farmType: '', location: '', size: '', description: '' });
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
          {
            key: 'farmType',
            label: 'All types',
            options: farmTypeOptions,
          },
        ]}
        filterValues={{ status: statusFilter, farmType: farmTypeFilter }}
        onFilterChange={(key, val) => {
          if (key === 'status') setStatusFilter(val);
          if (key === 'farmType') setFarmTypeFilter(val);
        }}
        onClear={() => { setSearch(''); setStatusFilter(''); setFarmTypeFilter(''); }}
      />

      <DataTable
        data={paginated}
        loading={loading}
        emptyMessage={search || statusFilter || farmTypeFilter ? 'No farms match your filters.' : 'No farms yet. Create your first farm!'}
        emptyIcon="🌾"
        onRowClick={(farm) => router.push(`/farms/${farm.id}`)}
        columns={[
          { key: 'name', label: 'Name', render: (f) => <span className="font-medium">{f.name}</span> },
          { key: 'farmType', label: 'Type', render: (f) => {
            const type = f.farmType || 'CROP';
            return (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${FARM_TYPE_COLORS[type] || 'bg-gray-100 text-gray-800'}`}>
                {FARM_TYPE_LABELS[type] || type}
              </span>
            );
          }},
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
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Farm Type *</label>
            <select
              value={form.farmType}
              onChange={(e) => setForm({ ...form, farmType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select type</option>
              {farmTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.farmType && <p className="text-red-500 text-xs mt-1">{errors.farmType}</p>}
          </div>
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
