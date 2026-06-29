'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Sprout,
  Calendar,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
} from 'lucide-react';
import { cropsAPI, farmsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';
import { cropFormSchema } from '@/lib/validation';

interface Crop {
  id: string;
  name: string;
  farmId: string;
  farmName?: string;
  cropType?: string;
  area?: number;
  areaUnit?: string;
  status?: string;
  createdAt: string;
}

interface Farm {
  id: string;
  name: string;
}

const PAGE_SIZE = 10;

export default function CropsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '',
    farmId: '',
    cropType: '',
    area: '',
    status: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const {
    data: cropsData,
    loading,
    refetch,
  } = useFetch<{ data: Crop[]; total: number; page: number; totalPages: number }>(
    'crops-list',
    () => cropsAPI.list({ page, limit: PAGE_SIZE }),
    { cacheTime: 30_000 }
  );

  const { data: farmsData } = useFetch<{ data: Farm[] }>(
    'farms-list',
    () => farmsAPI.list({ limit: 200 }),
    { cacheTime: 60_000 }
  );

  const crops = cropsData?.data || [];
  const farms = farmsData?.data || [];

  const getFarmName = (farmId: string) => {
    return farms.find((f) => f.id === farmId)?.name || '—';
  };

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (['created', 'updated', 'deleted'].includes(event.action)) {
        clearFetchCache('crops');
        refetch();
      }
    },
    [refetch]
  );
  useRealtime('crop', handleRealtimeEvent);

  const filtered = useMemo(() => {
    let result = crops;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.cropType?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter((c) => c.status === statusFilter);
    }
    return result;
  }, [crops, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = cropFormSchema.safeParse(form);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[issue.path[0] as string] = issue.message;
      });
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setSaving(true);
    try {
      await cropsAPI.create({
        name: form.name,
        farmId: form.farmId,
        cropType: form.cropType || undefined,
        area: form.area ? Number(form.area) : undefined,
        status: form.status || undefined,
      });
      toast({ type: 'success', title: 'Crop created successfully' });
      setShowAdd(false);
      setForm({ name: '', farmId: '', cropType: '', area: '', status: '' });
      clearFetchCache('crops');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to create crop',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;
    try {
      await cropsAPI.delete(id);
      toast({ type: 'success', title: 'Crop deleted' });
      clearFetchCache('crops');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete crop',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Crops</h1>
          <p className="text-muted-foreground">Manage your crop cycles</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Crop
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search crops by name or type..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              placeholder="All statuses"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'harvested', label: 'Harvested' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            />
            {(search || statusFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <CardContent className="p-8 flex items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
          </CardContent>
        ) : paginated.length === 0 ? (
          <CardContent className="p-12 text-center">
            <Sprout className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {search || statusFilter
                ? 'No crops match your filters.'
                : 'No crops yet. Create your first crop!'}
            </p>
            {!search && !statusFilter && (
              <Button className="mt-4" onClick={() => setShowAdd(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Crop
              </Button>
            )}
          </CardContent>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Farm</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((crop) => (
                    <TableRow
                      key={crop.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/crops/${crop.id}`)}
                    >
                      <TableCell>
                        <span className="font-medium">{crop.name}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getFarmName(crop.farmId)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {crop.cropType || '—'}
                      </TableCell>
                      <TableCell>
                        {crop.area
                          ? `${crop.area} ${crop.areaUnit || 'acres'}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            crop.status === 'active'
                              ? 'success'
                              : crop.status === 'harvested'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {crop.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(crop.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => router.push(`/crops/${crop.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              router.push(`/crops/${crop.id}/edit`)
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(crop.id, crop.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="border-t p-4 flex justify-center">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </Card>

      {/* Add Crop Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd} title="Add Crop">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Crop Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. Maize, Wheat"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {formErrors.name && (
              <p className="text-sm text-destructive mt-1">{formErrors.name}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Farm <span className="text-destructive">*</span>
            </label>
            <Select
              placeholder="Select a farm"
              options={farms.map((f) => ({ value: f.id, label: f.name }))}
              value={form.farmId}
              onChange={(e) => setForm({ ...form, farmId: e.target.value })}
            />
            {formErrors.farmId && (
              <p className="text-sm text-destructive mt-1">{formErrors.farmId}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Crop Type</label>
            <Input
              placeholder="e.g. Grain, Vegetable, Fruit"
              value={form.cropType}
              onChange={(e) => setForm({ ...form, cropType: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Area (acres)</label>
            <Input
              type="number"
              placeholder="e.g. 50"
              min="0"
              step="0.1"
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Status</label>
            <Select
              placeholder="Select status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'harvested', label: 'Harvested' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdd(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create Crop
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
