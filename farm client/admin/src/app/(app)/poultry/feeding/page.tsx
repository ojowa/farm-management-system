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
import { feedingRecordsAPI, flocksAPI } from '@/lib/api';
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
import { feedingRecordFormSchema } from '@/lib/validation';

interface FeedingRecord {
  id: string;
  flockId: string;
  flockName?: string;
  feedType: string;
  quantity: number;
  unit?: string;
  date: string;
  createdAt: string;
}

interface Flock {
  id: string;
  batchCode: string;
}

const PAGE_SIZE = 10;

export default function FeedingPage() {
  const readOnly = useReadOnly();
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    flockId: '',
    feedType: '',
    quantity: '',
    date: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const {
    data: recordsData,
    loading,
    refetch,
  } = useFetch<{ data: FeedingRecord[]; total: number; page: number; totalPages: number }>(
    'feeding-records-list',
    () => feedingRecordsAPI.list({ page, limit: PAGE_SIZE }),
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
        clearFetchCache('feeding-records');
        refetch();
      }
    },
    [refetch]
  );
  useRealtime('feedingRecord', handleRealtimeEvent);

  const filtered = useMemo(() => {
    let result = records;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.feedType.toLowerCase().includes(q) ||
          r.flockName?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [records, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = feedingRecordFormSchema.safeParse(form);
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
      await feedingRecordsAPI.create({
        flockId: form.flockId,
        feedType: form.feedType,
        quantity: Number(form.quantity),
        date: form.date,
      });
      toast({ type: 'success', title: 'Feeding record created successfully' });
      setShowAdd(false);
      setForm({ flockId: '', feedType: '', quantity: '', date: '' });
      clearFetchCache('feeding-records');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to create feeding record',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this feeding record? This action cannot be undone.')) return;
    try {
      await feedingRecordsAPI.delete(id);
      toast({ type: 'success', title: 'Feeding record deleted' });
      clearFetchCache('feeding-records');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete feeding record',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feeding Records</h1>
          <p className="text-muted-foreground">Track feed consumption for your flocks</p>
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
                placeholder="Search by feed type or flock..."
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
            <Egg className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {search
                ? 'No feeding records match your search.'
                : 'No feeding records yet. Add your first record!'}
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
                    <TableHead>Feed Type</TableHead>
                    <TableHead>Quantity (kg)</TableHead>
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
                      <TableCell>{record.feedType}</TableCell>
                      <TableCell>{record.quantity} {record.unit || 'kg'}</TableCell>
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
                            onClick={() => router.push(`/poultry/feeding/${record.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!readOnly && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => router.push(`/poultry/feeding/${record.id}/edit`)}
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
        <Dialog open={showAdd} onOpenChange={setShowAdd} title="Add Feeding Record">
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
              Feed Type <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Starter Feed"
              value={form.feedType}
              onChange={(e) => setForm({ ...form, feedType: e.target.value })}
            />
            {formErrors.feedType && (
              <p className="text-sm text-destructive mt-1">{formErrors.feedType}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Quantity (kg) <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              placeholder="50"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
            {formErrors.quantity && (
              <p className="text-sm text-destructive mt-1">{formErrors.quantity}</p>
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