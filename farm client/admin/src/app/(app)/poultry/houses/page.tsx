'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Home,
  MapPin,
  Calendar,
  Pencil,
  Trash2,
  Eye,
} from 'lucide-react';
import { poultryHousesAPI, farmsAPI } from '@/lib/api';
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
import { poultryHouseFormSchema } from '@/lib/validation';

interface PoultryHouse {
  id: string;
  name: string;
  farmId: string;
  farmName?: string;
  capacity?: number;
  status?: string;
  createdAt: string;
}

interface Farm {
  id: string;
  name: string;
}

const PAGE_SIZE = 10;

export default function PoultryHousesPage() {
  const readOnly = useReadOnly();
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', farmId: '', capacity: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const {
    data: housesData,
    loading,
    refetch,
  } = useFetch<{ data: PoultryHouse[]; total: number; page: number; totalPages: number }>(
    'poultry-houses-list',
    () => poultryHousesAPI.list({ page, limit: PAGE_SIZE }),
    { cacheTime: 30_000 }
  );

  const {
    data: farmsData,
  } = useFetch<{ data: Farm[] }>('farms-list', () => farmsAPI.list({ limit: 100 }), {
    cacheTime: 60_000,
  });

  const houses = housesData?.data || [];
  const farms = farmsData?.data || [];

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (['created', 'updated', 'deleted'].includes(event.action)) {
        clearFetchCache('poultry-houses');
        refetch();
      }
    },
    [refetch]
  );
  useRealtime('poultryHouse', handleRealtimeEvent);

  const filtered = useMemo(() => {
    let result = houses;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (h) =>
          h.name.toLowerCase().includes(q) || h.farmName?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter((h) => h.status === statusFilter);
    }
    return result;
  }, [houses, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = poultryHouseFormSchema.safeParse(form);
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
      await poultryHousesAPI.create({
        name: form.name,
        farmId: form.farmId,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      });
      toast({ type: 'success', title: 'Poultry house created successfully' });
      setShowAdd(false);
      setForm({ name: '', farmId: '', capacity: '' });
      clearFetchCache('poultry-houses');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to create poultry house',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;
    try {
      await poultryHousesAPI.delete(id);
      toast({ type: 'success', title: 'Poultry house deleted' });
      clearFetchCache('poultry-houses');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete poultry house',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Poultry Houses</h1>
          <p className="text-muted-foreground">Manage your poultry houses</p>
        </div>
        {!readOnly && (
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add House
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search houses by name or farm..."
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

      <Card>
        {loading ? (
          <CardContent className="p-8 flex items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
          </CardContent>
        ) : paginated.length === 0 ? (
          <CardContent className="p-12 text-center">
            <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {search || statusFilter
                ? 'No houses match your filters.'
                : 'No poultry houses yet. Create your first house!'}
            </p>
            {!search && !statusFilter && !readOnly && (
              <Button className="mt-4" onClick={() => setShowAdd(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add House
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
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((house) => (
                    <TableRow
                      key={house.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/poultry/houses/${house.id}`)}
                    >
                      <TableCell>
                        <span className="font-medium">{house.name}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Home className="h-3 w-3" />
                          {house.farmName || '—'}
                        </div>
                      </TableCell>
                      <TableCell>{house.capacity ? `${house.capacity} birds` : '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={house.status === 'active' ? 'success' : 'secondary'}
                        >
                          {house.status || 'active'}
                        </Badge>
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
                            onClick={() => router.push(`/poultry/houses/${house.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!readOnly && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => router.push(`/poultry/houses/${house.id}/edit`)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(house.id, house.name)}
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
        <Dialog open={showAdd} onOpenChange={setShowAdd} title="Add Poultry House">
          <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              House Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="House A"
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
            <label className="text-sm font-medium mb-1 block">Capacity (birds)</label>
            <Input
              type="number"
              placeholder="5000"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
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
              Create House
            </Button>
          </div>
          </form>
        </Dialog>
      )}
      </div>
  );
}