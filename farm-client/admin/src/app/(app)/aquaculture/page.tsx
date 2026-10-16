'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Fish,
  Calendar,
  Pencil,
  Trash2,
  Eye,
} from 'lucide-react';
import { aquacultureAPI, farmsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';
import { pondFormSchema } from '@/lib/validation';
import { usePermission } from '@/lib/usePermission';

interface Pond {
  id: string;
  organizationId: string;
  farmId: string;
  name: string;
  pondType: string;
  area: number | null;
  waterSource: string | null;
  capacity: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Farm {
  id: string;
  name: string;
}

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  name: '',
  farmId: '',
  pondType: 'FISH',
  area: '',
  waterSource: '',
  capacity: '',
  status: 'active',
  notes: '',
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'draining':
      return 'warning';
    case 'maintenance':
      return 'secondary';
    case 'retired':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export default function AquaculturePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { canCreate } = usePermission();
  const readOnly = !canCreate('aquaculture');
  const [search, setSearch] = useState('');
  const [farmFilter, setFarmFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Pond | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const {
    data: pondsData,
    loading,
    refetch,
  } = useFetch<{ data: Pond[]; total: number; page: number; totalPages: number }>(
    'aquaculture-ponds-list',
    () => aquacultureAPI.ponds.list({ page, limit: PAGE_SIZE }),
    { cacheTime: 30_000 }
  );

  const { data: farmsData } = useFetch<{ data: Farm[] }>(
    'farms-dropdown',
    () => farmsAPI.list({ limit: 100 }),
    { cacheTime: 60_000 }
  );

  const ponds = pondsData?.data || [];
  const farms = farmsData?.data || [];
  const farmNames = useMemo(
    () => farms.reduce<Record<string, string>>((acc, f) => {
      acc[f.id] = f.name;
      return acc;
    }, {}),
    [farms]
  );

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (['created', 'updated', 'deleted'].includes(event.action)) {
        clearFetchCache('aquaculture');
        refetch();
      }
    },
    [refetch]
  );
  useRealtime('aquaculture', handleRealtimeEvent);

  const filtered = useMemo(() => {
    let result = ponds;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (farmFilter) {
      result = result.filter((p) => p.farmId === farmFilter);
    }
    if (statusFilter) {
      result = result.filter((p) => p.status === statusFilter);
    }
    return result;
  }, [ponds, search, farmFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setEditing(null);
    setShowAdd(true);
  };

  const openEdit = (pond: Pond) => {
    setForm({
      name: pond.name,
      farmId: pond.farmId,
      pondType: pond.pondType || 'FISH',
      area: pond.area != null ? String(pond.area) : '',
      waterSource: pond.waterSource || '',
      capacity: pond.capacity != null ? String(pond.capacity) : '',
      status: pond.status || 'active',
      notes: pond.notes || '',
    });
    setFormErrors({});
    setEditing(pond);
    setShowAdd(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = pondFormSchema.safeParse(form);
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
      const payload = {
        name: form.name,
        farmId: form.farmId,
        pondType: form.pondType || undefined,
        area: form.area ? Number(form.area) : undefined,
        waterSource: form.waterSource || undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        status: form.status || undefined,
        notes: form.notes || undefined,
      };
      if (editing) {
        await aquacultureAPI.ponds.update(editing.id, payload);
        toast({ type: 'success', title: 'Pond updated successfully' });
      } else {
        await aquacultureAPI.ponds.create(payload);
        toast({ type: 'success', title: 'Pond created successfully' });
      }
      setShowAdd(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      clearFetchCache('aquaculture');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: editing ? 'Failed to update pond' : 'Failed to create pond',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will also delete all of its stockings, feedings, water quality records and harvests. This action cannot be undone.`)) return;
    try {
      await aquacultureAPI.ponds.delete(id);
      toast({ type: 'success', title: 'Pond deleted' });
      clearFetchCache('aquaculture');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete pond',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aquaculture</h1>
          <p className="text-muted-foreground">Manage your ponds and aquatic stock</p>
        </div>
        {!readOnly && (
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Pond
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by pond name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              placeholder="All farms"
              options={farms.map((f) => ({ value: f.id, label: f.name }))}
              value={farmFilter}
              onChange={(e) => {
                setFarmFilter(e.target.value);
                setPage(1);
              }}
            />
            <Select
              placeholder="All statuses"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'draining', label: 'Draining' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'retired', label: 'Retired' },
              ]}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            />
            {(search || farmFilter || statusFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setFarmFilter('');
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

      <Card>
        {loading ? (
          <CardContent className="p-8 flex items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
          </CardContent>
        ) : paginated.length === 0 ? (
          <CardContent className="p-12 text-center">
            <Fish className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {search || farmFilter || statusFilter
                ? 'No ponds match your filters.'
                : 'No ponds yet. Add your first pond!'}
            </p>
            {!search && !farmFilter && !statusFilter && !readOnly && (
              <Button className="mt-4" onClick={openAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Add Pond
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
                    <TableHead>Status</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((pond) => (
                    <TableRow
                      key={pond.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/aquaculture/${pond.id}`)}
                    >
                      <TableCell>
                        <span className="font-medium">{pond.name}</span>
                      </TableCell>
                      <TableCell>{farmNames[pond.farmId] || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{pond.pondType || 'FISH'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(pond.status)}>
                          {pond.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {pond.area != null ? `${pond.area} ha` : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(pond.createdAt).toLocaleDateString()}
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
                            onClick={() => router.push(`/aquaculture/${pond.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!readOnly && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(pond)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(pond.id, pond.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
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

      {!readOnly && (
        <Dialog
          open={showAdd}
          onOpenChange={(open) => {
            setShowAdd(open);
            if (!open) setEditing(null);
          }}
          title={editing ? 'Edit Pond' : 'Add Pond'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Pond 1, North Hatchery"
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
              <label className="text-sm font-medium mb-1 block">Pond Type</label>
              <Select
                placeholder="Select pond type"
                options={[
                  { value: 'FISH', label: 'Fish' },
                  { value: 'SHRIMP', label: 'Shrimp' },
                  { value: 'CRAB', label: 'Crab' },
                  { value: 'MIXED', label: 'Mixed' },
                ]}
                value={form.pondType}
                onChange={(e) => setForm({ ...form, pondType: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Area (ha)</label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 1.5"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Water Source</label>
              <Input
                placeholder="e.g. River, Borehole"
                value={form.waterSource}
                onChange={(e) => setForm({ ...form, waterSource: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Capacity (fish)</label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select
                placeholder="Select status"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'draining', label: 'Draining' },
                  { value: 'maintenance', label: 'Maintenance' },
                  { value: 'retired', label: 'Retired' },
                ]}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea
                placeholder="Any additional details about this pond..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAdd(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {editing ? 'Save Changes' : 'Create Pond'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
