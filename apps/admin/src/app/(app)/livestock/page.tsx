'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Beef,
  Calendar,
  Pencil,
  Trash2,
  Eye,
} from 'lucide-react';
import { livestockAPI, farmsAPI } from '@/lib/api';
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
import { livestockFormSchema } from '@/lib/validation';
import { useReadOnly } from '@/lib/useReadOnly';

interface Livestock {
  id: string;
  species: string;
  breed?: string;
  gender: string;
  farmId: string;
  farmName?: string;
  birthDate?: string;
  status?: string;
  createdAt: string;
}

interface Farm {
  id: string;
  name: string;
}

const PAGE_SIZE = 10;

export default function LivestockPage() {
  const router = useRouter();
  const { toast } = useToast();
  const readOnly = useReadOnly();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    species: '',
    breed: '',
    gender: '',
    farmId: '',
    birthDate: '',
    status: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const {
    data: livestockData,
    loading,
    refetch,
  } = useFetch<{ data: Livestock[]; total: number; page: number; totalPages: number }>(
    'livestock-list',
    () => livestockAPI.list({ page, limit: PAGE_SIZE }),
    { cacheTime: 30_000 }
  );

  const { data: farmsData } = useFetch<{ data: Farm[] }>(
    'farms-dropdown',
    () => farmsAPI.list({ limit: 100 }),
    { cacheTime: 60_000 }
  );

  const livestock = livestockData?.data || [];
  const farms = farmsData?.data || [];

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (['created', 'updated', 'deleted'].includes(event.action)) {
        clearFetchCache('livestock');
        refetch();
      }
    },
    [refetch]
  );
  useRealtime('livestock', handleRealtimeEvent);

  const filtered = useMemo(() => {
    let result = livestock;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.species.toLowerCase().includes(q) || l.breed?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter((l) => l.status === statusFilter);
    }
    return result;
  }, [livestock, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = livestockFormSchema.safeParse(form);
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
      await livestockAPI.create({
        species: form.species,
        breed: form.breed || undefined,
        gender: form.gender,
        farmId: form.farmId,
        birthDate: form.birthDate || undefined,
        status: form.status || undefined,
      });
      toast({ type: 'success', title: 'Livestock created successfully' });
      setShowAdd(false);
      setForm({ species: '', breed: '', gender: '', farmId: '', birthDate: '', status: '' });
      clearFetchCache('livestock');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to create livestock',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;
    try {
      await livestockAPI.delete(id);
      toast({ type: 'success', title: 'Livestock deleted' });
      clearFetchCache('livestock');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete livestock',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Livestock</h1>
          <p className="text-muted-foreground">Manage your livestock inventory</p>
        </div>
        {!readOnly && (
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Livestock
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by species or breed..."
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
                { value: 'sold', label: 'Sold' },
                { value: 'deceased', label: 'Deceased' },
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
            <Beef className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {search || statusFilter
                ? 'No livestock match your filters.'
                : 'No livestock yet. Add your first animal!'}
            </p>
            {!search && !statusFilter && !readOnly && (
              <Button className="mt-4" onClick={() => setShowAdd(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Livestock
              </Button>
            )}
          </CardContent>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Species</TableHead>
                    <TableHead>Breed</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Farm</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Birth Date</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((animal) => (
                    <TableRow
                      key={animal.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/livestock/${animal.id}`)}
                    >
                      <TableCell>
                        <span className="font-medium">{animal.species}</span>
                      </TableCell>
                      <TableCell>{animal.breed || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={animal.gender === 'Male' ? 'default' : 'secondary'}>
                          {animal.gender}
                        </Badge>
                      </TableCell>
                      <TableCell>{animal.farmName || '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            animal.status === 'active' ? 'success' : 'secondary'
                          }
                        >
                          {animal.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="h-3 w-3" />
                          {animal.birthDate
                            ? new Date(animal.birthDate).toLocaleDateString()
                            : '—'}
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
                            onClick={() => router.push(`/livestock/${animal.id}`)}
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
                                  router.push(`/livestock/${animal.id}/edit`)
                                }
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() =>
                                  handleDelete(animal.id, `${animal.species} (${animal.breed || 'N/A'})`)
                                }
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
        <Dialog open={showAdd} onOpenChange={setShowAdd} title="Add Livestock">
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Species <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Cattle, Goat, Sheep"
                value={form.species}
                onChange={(e) => setForm({ ...form, species: e.target.value })}
              />
              {formErrors.species && (
                <p className="text-sm text-destructive mt-1">{formErrors.species}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Breed</label>
              <Input
                placeholder="e.g. Holstein, Angus"
                value={form.breed}
                onChange={(e) => setForm({ ...form, breed: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Gender <span className="text-destructive">*</span>
              </label>
              <Select
                placeholder="Select gender"
                options={[
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                ]}
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              />
              {formErrors.gender && (
                <p className="text-sm text-destructive mt-1">{formErrors.gender}</p>
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
              <label className="text-sm font-medium mb-1 block">Birth Date</label>
              <Input
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select
                placeholder="Select status"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'sold', label: 'Sold' },
                  { value: 'deceased', label: 'Deceased' },
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
                Create Livestock
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
