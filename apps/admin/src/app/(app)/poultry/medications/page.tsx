'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Pill,
  Calendar,
  Pencil,
  Trash2,
  Eye,
} from 'lucide-react';
import { medicationAPI, flocksAPI } from '@/lib/api';
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
import { medicationFormSchema } from '@/lib/validation';

interface Medication {
  id: string;
  flockId: string;
  flockName?: string;
  name: string;
  dosage: string;
  frequency: string;
  status: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

interface Flock {
  id: string;
  batchCode: string;
}

const PAGE_SIZE = 10;

export default function MedicationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    flockId: '',
    name: '',
    dosage: '',
    frequency: '',
    startDate: '',
    endDate: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const {
    data: medicationsData,
    loading,
    refetch,
  } = useFetch<{ data: Medication[]; total: number; page: number; totalPages: number }>(
    'medications-list',
    () => medicationAPI.list({ page, limit: PAGE_SIZE }),
    { cacheTime: 30_000 }
  );

  const {
    data: flocksData,
  } = useFetch<{ data: Flock[] }>('flocks-list', () => flocksAPI.list({ limit: 100 }), {
    cacheTime: 60_000,
  });

  const medications = medicationsData?.data || [];
  const flocks = flocksData?.data || [];

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (['created', 'updated', 'deleted'].includes(event.action)) {
        clearFetchCache('medications');
        refetch();
      }
    },
    [refetch]
  );
  useRealtime('medication', handleRealtimeEvent);

  const filtered = useMemo(() => {
    let result = medications;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.flockName?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter((m) => m.status === statusFilter);
    }
    return result;
  }, [medications, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = medicationFormSchema.safeParse(form);
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
      await medicationAPI.create({
        flockId: form.flockId,
        name: form.name,
        dosage: form.dosage,
        frequency: form.frequency,
        startDate: form.startDate,
        endDate: form.endDate,
      });
      toast({ type: 'success', title: 'Medication created successfully' });
      setShowAdd(false);
      setForm({ flockId: '', name: '', dosage: '', frequency: '', startDate: '', endDate: '' });
      clearFetchCache('medications');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to create medication',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this medication? This action cannot be undone.')) return;
    try {
      await medicationAPI.delete(id);
      toast({ type: 'success', title: 'Medication deleted' });
      clearFetchCache('medications');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete medication',
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
      case 'discontinued':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medications</h1>
          <p className="text-muted-foreground">Track medications for your flocks</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Medication
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or flock..."
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
                { value: 'discontinued', label: 'Discontinued' },
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
            <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {search || statusFilter
                ? 'No medications match your filters.'
                : 'No medications yet. Add your first medication!'}
            </p>
            {!search && !statusFilter && (
              <Button className="mt-4" onClick={() => setShowAdd(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Medication
              </Button>
            )}
          </CardContent>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flock</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Dosage</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((med) => (
                    <TableRow key={med.id}>
                      <TableCell>
                        <span className="font-medium">{med.flockName || '—'}</span>
                      </TableCell>
                      <TableCell>{med.name}</TableCell>
                      <TableCell>{med.dosage}</TableCell>
                      <TableCell>{med.frequency}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(med.status)}>
                          {med.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => router.push(`/poultry/medications/${med.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => router.push(`/poultry/medications/${med.id}/edit`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(med.id)}
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

      <Dialog open={showAdd} onOpenChange={setShowAdd} title="Add Medication">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Flock <span className="text-destructive">*</span>
            </label>
            <Select
              placeholder="Select a flock"
              options={flocks.map((f) => ({ value: f.id, label: f.batchCode }))}
              value={form.flockId}
              onChange={(e) => setForm({ ...form, flockId: e.target.value })}
            />
            {formErrors.flockId && (
              <p className="text-sm text-destructive mt-1">{formErrors.flockId}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Medication Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Oxytetracycline"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {formErrors.name && (
              <p className="text-sm text-destructive mt-1">{formErrors.name}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Dosage <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="500mg"
              value={form.dosage}
              onChange={(e) => setForm({ ...form, dosage: e.target.value })}
            />
            {formErrors.dosage && (
              <p className="text-sm text-destructive mt-1">{formErrors.dosage}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Frequency <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Daily"
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
            />
            {formErrors.frequency && (
              <p className="text-sm text-destructive mt-1">{formErrors.frequency}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Start Date</label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">End Date</label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
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
              Create Medication
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}