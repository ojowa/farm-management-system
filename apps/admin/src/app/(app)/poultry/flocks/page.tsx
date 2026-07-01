'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Egg,
  Calendar,
  Pencil,
  Trash2,
  Eye,
} from 'lucide-react';
import { flocksAPI, farmsAPI } from '@/lib/api';
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
import { useReadOnly } from '@/lib/useReadOnly';
import { flockFormSchema } from '@/lib/validation';

interface Flock {
  id: string;
  batchCode: string;
  farmId: string;
  farmName?: string;
  breed: string;
  birdCount: number;
  status: string;
  arrivalDate: string;
  createdAt: string;
}

interface Farm {
  id: string;
  name: string;
}

const PAGE_SIZE = 10;

export default function FlocksPage() {
  const readOnly = useReadOnly();
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    batchCode: '',
    farmId: '',
    breed: '',
    birdCount: '',
    arrivalDate: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const {
    data: flocksData,
    loading,
    refetch,
  } = useFetch<{ data: Flock[]; total: number; page: number; totalPages: number }>(
    'flocks-list',
    () => flocksAPI.list({ page, limit: PAGE_SIZE }),
    { cacheTime: 30_000 }
  );

  const {
    data: farmsData,
  } = useFetch<{ data: Farm[] }>('farms-list', () => farmsAPI.list({ limit: 100 }), {
    cacheTime: 60_000,
  });

  const flocks = flocksData?.data || [];
  const farms = farmsData?.data || [];

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (['created', 'updated', 'deleted'].includes(event.action)) {
        clearFetchCache('flocks');
        refetch();
      }
    },
    [refetch]
  );
  useRealtime('flock', handleRealtimeEvent);

  const filtered = useMemo(() => {
    let result = flocks;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (f) =>
          f.batchCode.toLowerCase().includes(q) ||
          f.breed.toLowerCase().includes(q) ||
          f.farmName?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter((f) => f.status === statusFilter);
    }
    return result;
  }, [flocks, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = flockFormSchema.safeParse(form);
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
      await flocksAPI.create({
        batchCode: form.batchCode,
        farmId: form.farmId,
        breed: form.breed,
        birdCount: Number(form.birdCount),
        arrivalDate: form.arrivalDate,
      });
      toast({ type: 'success', title: 'Flock created successfully' });
      setShowAdd(false);
      setForm({ batchCode: '', farmId: '', breed: '', birdCount: '', arrivalDate: '' });
      clearFetchCache('flocks');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to create flock',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, batchCode: string) => {
    if (!confirm(`Delete flock "${batchCode}"? This action cannot be undone.`)) return;
    try {
      await flocksAPI.delete(id);
      toast({ type: 'success', title: 'Flock deleted' });
      clearFetchCache('flocks');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete flock',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'secondary';
      case 'depleted':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Flocks</h1>
          <p className="text-muted-foreground">Manage your poultry flocks</p>
        </div>
        {!readOnly && (
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Flock
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by batch code, breed, or farm..."
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
                { value: 'completed', label: 'Completed' },
                { value: 'depleted', label: 'Depleted' },
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

      <Card>
        {loading ? (
          <CardContent className="p-8 flex items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
          </CardContent>
        ) : paginated.length === 0 ? (
          <CardContent className="p-12 text-center">
            <Egg className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {search || statusFilter
                ? 'No flocks match your filters.'
                : 'No flocks yet. Create your first flock!'}
            </p>
            {!search && !statusFilter && !readOnly && (
              <Button className="mt-4" onClick={() => setShowAdd(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Flock
              </Button>
            )}
          </CardContent>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Code</TableHead>
                    <TableHead>Farm</TableHead>
                    <TableHead>Breed</TableHead>
                    <TableHead>Bird Count</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Arrival Date</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((flock) => (
                    <TableRow
                      key={flock.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/poultry/flocks/${flock.id}`)}
                    >
                      <TableCell>
                        <span className="font-medium">{flock.batchCode}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{flock.farmName || '—'}</span>
                      </TableCell>
                      <TableCell>{flock.breed}</TableCell>
                      <TableCell>{flock.birdCount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(flock.status)}>
                          {flock.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(flock.arrivalDate).toLocaleDateString()}
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
                            onClick={() => router.push(`/poultry/flocks/${flock.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!readOnly && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => router.push(`/poultry/flocks/${flock.id}/edit`)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(flock.id, flock.batchCode)}
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
        <Dialog open={showAdd} onOpenChange={setShowAdd} title="Add Flock">
          <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Batch Code <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="BATCH-001"
              value={form.batchCode}
              onChange={(e) => setForm({ ...form, batchCode: e.target.value })}
            />
            {formErrors.batchCode && (
              <p className="text-sm text-destructive mt-1">{formErrors.batchCode}</p>
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
            <label className="text-sm font-medium mb-1 block">
              Breed <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Broiler"
              value={form.breed}
              onChange={(e) => setForm({ ...form, breed: e.target.value })}
            />
            {formErrors.breed && (
              <p className="text-sm text-destructive mt-1">{formErrors.breed}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Bird Count <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              placeholder="5000"
              value={form.birdCount}
              onChange={(e) => setForm({ ...form, birdCount: e.target.value })}
            />
            {formErrors.birdCount && (
              <p className="text-sm text-destructive mt-1">{formErrors.birdCount}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Arrival Date <span className="text-destructive">*</span>
            </label>
            <Input
              type="date"
              value={form.arrivalDate}
              onChange={(e) => setForm({ ...form, arrivalDate: e.target.value })}
            />
            {formErrors.arrivalDate && (
              <p className="text-sm text-destructive mt-1">{formErrors.arrivalDate}</p>
            )}
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
              Create Flock
            </Button>
          </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}