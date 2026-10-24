'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { NavTabs } from '@/components/NavTabs';
import {
  Plus,
  Search,
  Calendar,
  Pencil,
  Trash2,
  Eye,
  X,
  Sprout,
} from 'lucide-react';
import { cropsAPI, cropStagesAPI, farmsAPI } from '@/lib/api';
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
import { usePermission } from '@/lib/usePermission';

interface CropCycle {
  id: string;
  fieldId: string;
  fieldName?: string;
  cropId: string;
  cropName?: string;
  farmId?: string;
  farmName?: string;
  plantingDate: string;
  harvestDate?: string | null;
  health?: number;
  status?: string;
  createdAt: string;
}

interface Farm {
  id: string;
  name: string;
}

interface Crop {
  id: string;
  name: string;
}

const PAGE_SIZE = 10;

const CYCLE_STATUS_OPTIONS = [
  { value: 'PLANNED', label: 'Planned' },
  { value: 'BRED', label: 'Bred' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PREGNANT', label: 'Pregnant' },
  { value: 'BORN', label: 'Born' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
];

export default function CropsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canCreate } = usePermission();
  const readOnly = !canCreate('crop');
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  // Arrives from the farm detail page's Related Data links.
  const [farmFilter, setFarmFilter] = useState(() => searchParams.get('farmId') || '');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    fieldId: '',
    cropId: '',
    plantingDate: '',
    harvestDate: '',
    health: '',
    status: 'PLANNED',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const {
    data: cyclesData,
    loading,
    refetch,
  } = useFetch<{ data: CropCycle[]; total: number; page: number; totalPages: number }>(
    `crop-cycles-list-${page}-${statusFilter}`,
    () =>
      cropsAPI.listCycles({
        page,
        limit: PAGE_SIZE,
        status: statusFilter || undefined,
      }),
    { cacheTime: 30_000 }
  );

  const { data: farmsData } = useFetch<{ data: Farm[] }>(
    'farms-list',
    () => farmsAPI.list({ limit: 200 }),
    { cacheTime: 60_000 }
  );

  const { data: cropsData } = useFetch<{ data: Crop[] }>(
    'crops-catalog',
    () => cropsAPI.getCatalog(),
    { cacheTime: 60_000 }
  );

  const cycles = cyclesData?.data || [];
  const farms = farmsData?.data || [];
  const crops = cropsData?.data || [];

  const getFarmName = (cycle: CropCycle) =>
    cycle.farmName || farms.find((f) => f.id === cycle.farmId)?.name || '—';
  const getCropName = (cycle: CropCycle) =>
    cycle.cropName || crops.find((c) => c.id === cycle.cropId)?.name || '—';
  const getFieldName = (cycle: CropCycle) =>
    cycle.fieldName || '—';

  const filtered = useMemo(() => {
    let result = cycles;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          getCropName(c).toLowerCase().includes(q) ||
          getFarmName(c).toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (farmFilter) {
      result = result.filter((c) => (c.farmId || '') === farmFilter);
    }
    return result;
  }, [cycles, search, statusFilter, farmFilter, farms, crops]);

  // The server already paginates (`page`/`limit` above) and `status` is applied
  // server-side; search + farm are filtered client-side within the returned page.
  // Do NOT re-slice here — that double-paginated and emptied every page past 1.
  const totalPages = cyclesData?.totalPages || 1;
  const paginated = filtered;

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
      await cropsAPI.createCycle({
        fieldId: form.fieldId,
        cropId: form.cropId,
        plantingDate: form.plantingDate,
        harvestDate: form.harvestDate || undefined,
        health: form.health ? Number(form.health) : undefined,
        status: form.status || 'PLANNED',
      });
      toast({ type: 'success', title: 'Crop cycle created successfully' });
      setShowAdd(false);
      setForm({ fieldId: '', cropId: '', plantingDate: '', harvestDate: '', health: '', status: 'PLANNED' });
      clearFetchCache('crop-cycles');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to create crop cycle',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete crop cycle "${name}"? This action cannot be undone.`)) return;
    try {
      await cropsAPI.deleteCycle(id);
      toast({ type: 'success', title: 'Crop cycle deleted' });
      clearFetchCache('crop-cycles');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete crop cycle',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (['created', 'updated', 'deleted'].includes(event.action)) {
        clearFetchCache('crop-cycles');
        refetch();
      }
    },
    [refetch]
  );
  useRealtime('crop', handleRealtimeEvent);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Crop Cycles</h1>
          <p className="text-muted-foreground">Track planting and harvest per field</p>
        </div>
        {!readOnly && (
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Cycle
          </Button>
        )}
      </div>

      <NavTabs
        ariaLabel="Crops section"
        tabs={[
          { label: 'Cycles', href: '/crops' },
          { label: 'Calendar', href: '/crops/calendar' },
          { label: 'Pest & Disease', href: '/crops/pest-disease' },
          { label: 'Irrigation', href: '/irrigation' },
        ]}
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by crop, farm, or cycle..."
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
              options={CYCLE_STATUS_OPTIONS}
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

      {/* Farm filter chip (from /farms/:id Related Data links) */}
      {farmFilter && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setFarmFilter('');
              setPage(1);
              router.replace('/crops');
            }}
            className="inline-flex items-center gap-1 rounded-full border border-primary/50 bg-primary/5 px-3 py-1 text-sm text-foreground hover:bg-primary/10 transition-colors"
            aria-label="Clear farm filter"
          >
            Filtered to farm: {farms.find((f) => f.id === farmFilter)?.name || farmFilter}
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

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
              {search || statusFilter || farmFilter
                ? 'No crop cycles match your filters.'
                : 'No crop cycles yet. Create your first cycle!'}
            </p>
            {!search && !statusFilter && !farmFilter && !readOnly && (
              <Button className="mt-4" onClick={() => setShowAdd(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Cycle
              </Button>
            )}
          </CardContent>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Crop</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Farm</TableHead>
                    <TableHead>Planting Date</TableHead>
                    <TableHead>Harvest Date</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((cycle) => (
                    <TableRow
                      key={cycle.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/crops/${cycle.id}`)}
                    >
                      <TableCell>
                        <span className="font-medium">{getCropName(cycle)}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getFieldName(cycle)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getFarmName(cycle)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(cycle.plantingDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {cycle.harvestDate
                          ? new Date(cycle.harvestDate).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {cycle.health != null ? `${cycle.health}%` : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            cycle.status?.toUpperCase() === 'COMPLETED'
                              ? 'success'
                              : cycle.status?.toUpperCase() === 'FAILED'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {cycle.status || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => router.push(`/crops/${cycle.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!readOnly && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => router.push(`/crops/${cycle.id}/edit`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {!readOnly && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(cycle.id, getCropName(cycle))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </Card>

      {/* Add Crop Cycle Dialog */}
      {!readOnly && (
        <Dialog open={showAdd} onOpenChange={setShowAdd} title="Add Crop Cycle">
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Field <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Field ID"
                value={form.fieldId}
                onChange={(e) => setForm({ ...form, fieldId: e.target.value })}
              />
              {formErrors.fieldId && (
                <p className="text-sm text-destructive mt-1">{formErrors.fieldId}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Crop <span className="text-destructive">*</span>
              </label>
              <Select
                placeholder="Select a crop"
                options={crops.map((c) => ({ value: c.id, label: c.name }))}
                value={form.cropId}
                onChange={(e) => setForm({ ...form, cropId: e.target.value })}
              />
              {formErrors.cropId && (
                <p className="text-sm text-destructive mt-1">{formErrors.cropId}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Planting Date <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                value={form.plantingDate}
                onChange={(e) => setForm({ ...form, plantingDate: e.target.value })}
              />
              {formErrors.plantingDate && (
                <p className="text-sm text-destructive mt-1">{formErrors.plantingDate}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Harvest Date</label>
              <Input
                type="date"
                value={form.harvestDate}
                onChange={(e) => setForm({ ...form, harvestDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Health (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={form.health}
                onChange={(e) => setForm({ ...form, health: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select
                placeholder="Select status"
                options={CYCLE_STATUS_OPTIONS}
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
                Create Cycle
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
