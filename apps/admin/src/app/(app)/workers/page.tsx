'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Users,
  Pencil,
  Trash2,
  Eye,
  Calendar,
} from 'lucide-react';
import { workersAPI, farmsAPI } from '@/lib/api';
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
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';
import { useReadOnly } from '@/lib/useReadOnly';
import { workerFormSchema } from '@/lib/validation';

interface Worker {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  position: string;
  department?: string;
  farmId: string;
  farm?: { id: string; name: string };
  createdAt: string;
}

const PAGE_SIZE = 10;

export default function WorkersPage() {
  const router = useRouter();
  const readOnly = useReadOnly();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ firstName: '', middleName: '', lastName: '', email: '', phone: '', position: '', department: '', farmId: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const {
    data: workersData,
    loading,
    refetch,
  } = useFetch<{ data: Worker[]; total: number; page: number; totalPages: number }>(
    'workers-list',
    () => workersAPI.list({ page, limit: PAGE_SIZE }),
    { cacheTime: 30_000 }
  );

  const { data: farmsData } = useFetch<{ data: { id: string; name: string }[] }>(
    'farms-list',
    () => farmsAPI.list({ limit: 100 }),
    { cacheTime: 60_000 }
  );

  const farms = farmsData?.data || [];
  const workers = workersData?.data || [];

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (['created', 'updated', 'deleted'].includes(event.action)) {
        clearFetchCache('workers');
        refetch();
      }
    },
    [refetch]
  );
  useRealtime('worker', handleRealtimeEvent);

  const filtered = useMemo(() => {
    let result = workers;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((w) => `${w.firstName} ${w.lastName}`.toLowerCase().includes(q));
    }
    if (positionFilter) {
      result = result.filter((w) => w.position === positionFilter);
    }
    return result;
  }, [workers, search, positionFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const positions = useMemo(() => {
    const r = new Set(workers.map((w) => w.position).filter(Boolean));
    return Array.from(r).sort();
  }, [workers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = workerFormSchema.safeParse(form);
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
      await workersAPI.create({
        firstName: form.firstName,
        middleName: form.middleName || undefined,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        position: form.position,
        department: form.department || undefined,
        farmId: form.farmId,
      });
      toast({ type: 'success', title: 'Worker created successfully' });
      setShowAdd(false);
      setForm({ firstName: '', middleName: '', lastName: '', email: '', phone: '', position: '', department: '', farmId: '' });
      clearFetchCache('workers');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to create worker',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;
    try {
      await workersAPI.delete(id);
      toast({ type: 'success', title: 'Worker deleted' });
      clearFetchCache('workers');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete worker',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workers</h1>
          <p className="text-muted-foreground">Manage your farm workers</p>
        </div>
        {!readOnly && (
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Worker
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workers by name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              placeholder="All positions"
              options={positions.map((r) => ({ value: r, label: r }))}
              value={positionFilter}
              onChange={(e) => {
                setPositionFilter(e.target.value);
                setPage(1);
              }}
            />
            {(search || positionFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setPositionFilter('');
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
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {search || positionFilter
                ? 'No workers match your filters.'
                : 'No workers yet. Add your first worker!'}
            </p>
            {!search && !positionFilter && !readOnly && (
              <Button className="mt-4" onClick={() => setShowAdd(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Worker
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
                    <TableHead>Position</TableHead>
                    <TableHead>Farm</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((worker) => (
                    <TableRow
                      key={worker.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/workers/${worker.id}`)}
                    >
                      <TableCell>
                        <span className="font-medium">{worker.firstName} {worker.middleName ? `${worker.middleName} ` : ''}{worker.lastName}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{worker.position}</Badge>
                      </TableCell>
                      <TableCell>
                        {worker.farm?.name || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(worker.createdAt).toLocaleDateString()}
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
                            onClick={() => router.push(`/workers/${worker.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!readOnly && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  router.push(`/workers/${worker.id}/edit`)
                                }
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(worker.id, `${worker.firstName} ${worker.lastName}`)}
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

      {/* Add Worker Dialog */}
      {!readOnly && (
        <Dialog open={showAdd} onOpenChange={setShowAdd} title="Add Worker">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  First Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. John"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
                {formErrors.firstName && (
                  <p className="text-sm text-destructive mt-1">{formErrors.firstName}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Middle Name</label>
                <Input
                  placeholder="e.g. Michael"
                  value={form.middleName}
                  onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Last Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Doe"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
              {formErrors.lastName && (
                <p className="text-sm text-destructive mt-1">{formErrors.lastName}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Position <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. Farm Manager"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                />
                {formErrors.position && (
                  <p className="text-sm text-destructive mt-1">{formErrors.position}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Department</label>
                <Input
                  placeholder="e.g. Operations"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input
                  placeholder="e.g. john@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                {formErrors.email && (
                  <p className="text-sm text-destructive mt-1">{formErrors.email}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Phone</label>
                <Input
                  placeholder="e.g. +1234567890"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
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
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Create Worker
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
