'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cropsAPI, farmsAPI } from '@/lib/api';
import { useCrops, useCreateCrop, useFarms } from '@farm/hooks';
import { Button, Modal, Input, Select, Badge } from '@/components/ui';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import FilterBar from '@/components/FilterBar';
import { useToasts } from '@/lib/toasts';
import { useRealtime } from '@/hooks/useRealtime';

const STATUS_COLORS: Record<string, string> = { active: 'green', harvested: 'blue', failed: 'red', pending: 'yellow' };
const PAGE_SIZE = 10;

interface CropsClientProps {
  initialCrops: any[];
  initialFarms: any[];
}

export function CropsClient({ initialCrops, initialFarms }: CropsClientProps) {
  const router = useRouter();
  const { success, error: toastError } = useToasts();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [farmFilter, setFarmFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', farmId: '', cropType: '', area: '', status: 'active' });

  const { data: cropsData, isLoading } = useCrops(cropsAPI);
  const { data: farmsData } = useFarms(farmsAPI);
  const createCrop = useCreateCrop(cropsAPI);

  const crops = useMemo(() => {
    if (cropsData) {
      const items = cropsData?.data?.crops || cropsData?.data || cropsData?.crops || cropsData || [];
      return Array.isArray(items) ? items : [];
    }
    return initialCrops;
  }, [cropsData, initialCrops]);

  const farms = useMemo(() => {
    if (farmsData) {
      const items = farmsData?.data?.farms || farmsData?.data || farmsData?.farms || farmsData || [];
      return Array.isArray(items) ? items : [];
    }
    return initialFarms;
  }, [farmsData, initialFarms]);

  const handleRealtimeEvent = useCallback(() => {}, []);
  useRealtime('crop', handleRealtimeEvent);

  const filtered = useMemo(() => {
    let result = crops;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c: any) => c.name.toLowerCase().includes(q));
    }
    if (statusFilter) {
      result = result.filter((c: any) => c.status === statusFilter);
    }
    if (farmFilter) {
      result = result.filter((c: any) => c.farmId === farmFilter);
    }
    return result;
  }, [crops, search, statusFilter, farmFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCrop.mutateAsync({
        name: form.name,
        farmId: form.farmId,
        cropType: form.cropType,
        area: form.area ? Number(form.area) : undefined,
        status: form.status,
      });
      success('Crop added');
      setShowAdd(false);
      setForm({ name: '', farmId: '', cropType: '', area: '', status: 'active' });
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to add crop');
    }
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
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
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
          setPage(1);
        }}
        onClear={() => { setSearch(''); setStatusFilter(''); setFarmFilter(''); setPage(1); }}
      />

      <DataTable
        data={paginated}
        loading={isLoading}
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
            <Button type="submit" loading={createCrop.isPending}>Add Crop</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
