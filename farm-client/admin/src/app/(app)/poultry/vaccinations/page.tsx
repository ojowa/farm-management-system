'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Syringe,
  Calendar,
  Pencil,
  Trash2,
  Eye,
} from 'lucide-react';
import { vaccinationRecordsAPI, flocksAPI } from '@/lib/api';
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
import { vaccinationRecordFormSchema } from '@/lib/validation';

interface VaccinationRecord {
  id: string;
  flockId: string;
  flockName?: string;
  vaccine: string;
  dosage: string;
  date: string;
  createdAt: string;
}

interface Flock {
  id: string;
  batchCode: string;
}

const PAGE_SIZE = 10;

export default function VaccinationsPage() {
  const readOnly = useReadOnly();
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    flockId: '',
    vaccine: '',
    dosage: '',
    date: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const {
    data: recordsData,
    loading,
    refetch,
  } = useFetch<{ data: VaccinationRecord[]; total: number; page: number; totalPages: number }>(
    'vaccination-records-list',
    () => vaccinationRecordsAPI.list({ page, limit: PAGE_SIZE }),
    { cacheTime: 30_000 }
  );

  const {
    data: flocksData,
  } = useFetch<{ data: Flock[] }>('flocks-list', () => flocksAPI.list({ limit: 100 }), {
    cacheTime: 60_000,
  });

  const records = recordsData?.data || [];
  const flocks = flocksData?.data || [];

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (['created', 'updated', 'deleted'].includes(event.action)) {
        clearFetchCache('vaccination-records');
        refetch();
      }
    },
    [refetch]
  );
  useRealtime('vaccinationRecord', handleRealtimeEvent);

  const filtered = useMemo(() => {
    let result = records;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.vaccine.toLowerCase().includes(q) ||
          r.flockName?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [records, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = vaccinationRecordFormSchema.safeParse(form);
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
      await vaccinationRecordsAPI.create({
        flockId: form.flockId,
        vaccine: form.vaccine,
        dosage: form.dosage,
        date: form.date,
      });
      toast({ type: 'success', title: 'Vaccination record created successfully' });
      setShowAdd(false);
      setForm({ flockId: '', vaccine: '', dosage: '', date: '' });
      clearFetchCache('vaccination-records');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to create vaccination record',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vaccination record? This action cannot be undone.')) return;
    try {
      await vaccinationRecordsAPI.delete(id);
      toast({ type: 'success', title: 'Vaccination record deleted' });
      clearFetchCache('vaccination-records');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete vaccination record',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vaccination Records</h1>
          <p className="text-muted-foreground">Track vaccinations for your flocks</p>
        </div>
        {!readOnly && (
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Record
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by vaccine or flock..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            {search && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
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
            <Syringe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {search
                ? 'No vaccination records match your search.'
                : 'No vaccination records yet. Add your first record!'}
            </p>
            {!search && !readOnly && (
              <Button className="mt-4" onClick={() => setShowAdd(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Record
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
                    <TableHead>Vaccine</TableHead>
                    <TableHead>Dosage</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <span className="font-medium">{record.flockName || '—'}</span>
                      </TableCell>
                      <TableCell>{record.vaccine}</TableCell>
                      <TableCell>{record.dosage}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(record.date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => router.push(`/poultry/vaccinations/${record.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!readOnly && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => router.push(`/poultry/vaccinations/${record.id}/edit`)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(record.id)}
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
        <Dialog open={showAdd} onOpenChange={setShowAdd} title="Add Vaccination Record">
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
              Vaccine <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Newcastle Disease"
              value={form.vaccine}
              onChange={(e) => setForm({ ...form, vaccine: e.target.value })}
            />
            {formErrors.vaccine && (
              <p className="text-sm text-destructive mt-1">{formErrors.vaccine}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Dosage <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="0.5ml"
              value={form.dosage}
              onChange={(e) => setForm({ ...form, dosage: e.target.value })}
            />
            {formErrors.dosage && (
              <p className="text-sm text-destructive mt-1">{formErrors.dosage}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Date <span className="text-destructive">*</span>
            </label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            {formErrors.date && (
              <p className="text-sm text-destructive mt-1">{formErrors.date}</p>
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
              Create Record
            </Button>
          </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}