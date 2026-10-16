'use client';

import React, { useState, useCallback, useRef } from 'react';
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
  Archive,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Download,
  Upload,
  X,
  AlertCircle,
} from 'lucide-react';
import { farmsAPI } from '@/lib/api';
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch } from '@/hooks/useFetch';
import { useDebounce } from '@/hooks/useDebounce';
import { useRealtime } from '@/hooks/useRealtime';
import { farmFormSchema, fieldErrorsFromFarmApiError } from '@/lib/validation';
import { clearFarmCaches } from '@/lib/farmCaches';
import { usePermission } from '@/lib/usePermission';
import { useAuth } from '@/lib/auth';
import { exportToCSV, exportToJSON } from '@/lib/export';

import {
  FARM_TYPE_ROWS as FARM_TYPES,
  FARM_TYPE_MAP,
  FARM_TYPE_OPTIONS,
  farmTypesForPlan,
} from '@/lib/farmTypes';

interface Farm {
  id: string;
  name: string;
  farmType: string;
  location?: string;
  size?: number;
  status?: string;
  createdAt: string;
}

const PAGE_SIZE = 10;

/** Sortable columns — must stay within the server's FARM_SORT_COLUMNS whitelist. */
type SortField = 'name' | 'farmType' | 'size' | 'status' | 'createdAt';

const SORTABLE_COLUMNS: Array<{ field: SortField; label: string }> = [
  { field: 'name', label: 'Name' },
  { field: 'farmType', label: 'Type' },
  { field: 'size', label: 'Size' },
  { field: 'status', label: 'Status' },
  { field: 'createdAt', label: 'Created' },
];

/** Parse an imported JSON/CSV file into the row shape the import API expects. */
function parseImportedFile(text: string): any[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  }
  // Minimal CSV: split rows, honour double-quoted fields with "" escapes.
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inQuotes) {
      if (ch === '"') {
        if (trimmed[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && trimmed[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some((c) => c.trim())).map((r) =>
    Object.fromEntries(headers.map((h, i) => [h, r[i] ?? '']))
  );
}

export default function FarmsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { canCreate, canDelete } = usePermission();
  const { user } = useAuth();
  const readOnly = !canCreate('farm');
  const allowedFarmTypes = farmTypesForPlan(user?.planFeatures);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('');
  const [farmTypeFilter, setFarmTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', farmType: '', location: '', size: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Farm | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Farm | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: farmsData,
    loading,
    error,
    refetch,
  } = useFetch<{ data: Farm[]; total: number }>(
    // The key must vary with the query — with a constant key the hook's effect
    // never re-ran, so page/search/filter/sort changes never refetched. The
    // filters and sort are applied server-side so they span every page, not
    // just the loaded one. Search is debounced so typing doesn't spam requests.
    `farms-list-${page}-${debouncedSearch}-${statusFilter}-${farmTypeFilter}-${sortBy}-${sortOrder}`,
    () => farmsAPI.list({
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      farmType: farmTypeFilter || undefined,
      sortBy,
      sortOrder,
    }),
    { cacheTime: 30_000 }
  );

  const farms = farmsData?.data || [];
  // The API returns `{ data, total }` — there is no server-side totalPages.
  const totalPages = Math.ceil((farmsData?.total ?? 0) / PAGE_SIZE);

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (['created', 'updated', 'deleted'].includes(event.action)) {
        clearFarmCaches();
        refetch();
      }
    },
    [refetch]
  );
  useRealtime('farm', handleRealtimeEvent);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = farmFormSchema.safeParse(form);
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
      await farmsAPI.create({
        name: form.name,
        farmType: form.farmType,
        location: form.location,
        size: form.size ? Number(form.size) : undefined,
      });
      toast({ type: 'success', title: 'Farm created successfully' });
      setShowAdd(false);
      setForm({ name: '', farmType: '', location: '', size: '' });
      clearFarmCaches();
      refetch();
    } catch (err: any) {
      // `"field" is required`-style 400s map onto the offending input.
      const fieldErrors = fieldErrorsFromFarmApiError(err);
      if (fieldErrors) {
        setFormErrors(fieldErrors);
      } else {
        toast({
          type: 'error',
          title: 'Failed to create farm',
          message: err.response?.data?.message || 'An error occurred',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await farmsAPI.delete(deleteTarget.id);
      toast({ type: 'success', title: 'Farm deleted' });
      setDeleteTarget(null);
      clearFarmCaches();
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete farm',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!archiveTarget) return;
    const nextStatus = archiveTarget.status === 'inactive' ? 'active' : 'inactive';
    setActionLoading(true);
    try {
      await farmsAPI.update(archiveTarget.id, { status: nextStatus });
      toast({
        type: 'success',
        title: nextStatus === 'inactive' ? 'Farm archived' : 'Farm restored',
      });
      setArchiveTarget(null);
      clearFarmCaches();
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: `Failed to ${nextStatus === 'inactive' ? 'archive' : 'restore'} farm`,
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      // The endpoint always answers `{ data: [...] }`; convert to the chosen
      // format client-side so the download is real CSV (or pretty JSON).
      const res = await farmsAPI.exportFarms('json');
      const rows = res.data?.data || [];
      if (format === 'csv') {
        exportToCSV(rows, 'farms');
      } else {
        exportToJSON(rows, 'farms');
      }
      toast({ type: 'success', title: `Farms exported as ${format.toUpperCase()}` });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to export farms',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const rows = parseImportedFile(await file.text());
      if (!rows.length) {
        toast({ type: 'error', title: 'Import failed', message: 'No rows found in the selected file.' });
        return;
      }
      const res = await farmsAPI.importFarms(rows);
      const imported = res.data?.imported ?? res.data?.data?.length ?? rows.length;
      toast({ type: 'success', title: `Imported ${imported} farm${imported === 1 ? '' : 's'}` });
      clearFarmCaches();
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to import farms',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setImporting(false);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const getFarmTypeBadge = (farmType: string) => {
    const config = FARM_TYPE_MAP[farmType];
    if (!config) return <Badge variant="secondary">{farmType}</Badge>;
    return (
      <Badge className={config.color}>
        <config.icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const filtersActive = Boolean(debouncedSearch || statusFilter || farmTypeFilter);
  const excludedTypes = allowedFarmTypes
    ? FARM_TYPES.filter((t) => !allowedFarmTypes.includes(t.value))
    : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Farms</h1>
          <p className="text-muted-foreground">Manage your farm properties</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" disabled={exporting} onClick={() => handleExport('csv')}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" disabled={exporting} onClick={() => handleExport('json')}>
            <Download className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={readOnly || importing}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,application/json,text/csv"
            className="hidden"
            onChange={handleImportFile}
            aria-label="Import farms from a JSON or CSV file"
          />
          {!readOnly && (
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Farm
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search farms by name or location..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
                aria-label="Search farms"
              />
            </div>
            <Select
              placeholder="All types"
              options={FARM_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              value={farmTypeFilter}
              onChange={(e) => {
                setFarmTypeFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by farm type"
            />
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
              aria-label="Filter by status"
            />
            {filtersActive && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setFarmTypeFilter('');
                  setPage(1);
                }}
                aria-label="Clear filters"
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        {loading && !farmsData ? (
          <CardContent className="p-8 flex items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
          </CardContent>
        ) : error && !farmsData ? (
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-medium text-destructive">Failed to load farms</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        ) : farms.length === 0 ? (
          <CardContent className="p-12 text-center">
            <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {filtersActive
                ? 'No farms match your filters.'
                : 'No farms yet. Create your first farm!'}
            </p>
            {!filtersActive && !readOnly && (
              <Button className="mt-4" onClick={() => setShowAdd(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Farm
              </Button>
            )}
          </CardContent>
        ) : (
          <>
            {/* Background refetches keep the table mounted, just dimmed. */}
            <div className={`transition-opacity ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
              {loading && (
                <div className="h-0.5 w-full overflow-hidden bg-muted">
                  <div className="h-full w-1/3 animate-pulse bg-primary" />
                </div>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {SORTABLE_COLUMNS.map(({ field, label }) => (
                        <TableHead key={field}>
                          <button
                            type="button"
                            onClick={() => toggleSort(field)}
                            className="inline-flex items-center gap-1 hover:text-foreground"
                            aria-label={`Sort by ${label}`}
                          >
                            {label}
                            {sortBy === field ? (
                              sortOrder === 'asc' ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                            )}
                          </button>
                        </TableHead>
                      ))}
                      <TableHead>Location</TableHead>
                      <TableHead className="w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {farms.map((farm) => (
                      <TableRow
                        key={farm.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/farms/${farm.id}`)}
                      >
                        <TableCell>
                          <Link
                            href={`/farms/${farm.id}`}
                            className="font-medium hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {farm.name}
                          </Link>
                        </TableCell>
                        <TableCell>{getFarmTypeBadge(farm.farmType)}</TableCell>
                        <TableCell>{farm.size ? `${farm.size} acres` : '—'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={farm.status === 'inactive' ? 'secondary' : 'success'}
                          >
                            {farm.status === 'inactive' ? 'Inactive' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(farm.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {farm.location || '—'}
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
                              aria-label={`View ${farm.name}`}
                              onClick={() => router.push(`/farms/${farm.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!readOnly && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  aria-label={`Edit ${farm.name}`}
                                  onClick={() =>
                                    router.push(`/farms/${farm.id}/edit`)
                                  }
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  aria-label={
                                    farm.status === 'inactive'
                                      ? `Restore ${farm.name}`
                                      : `Archive ${farm.name}`
                                  }
                                  onClick={() => setArchiveTarget(farm)}
                                >
                                  {farm.status === 'inactive' ? (
                                    <RotateCcw className="h-4 w-4" />
                                  ) : (
                                    <Archive className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            )}
                            {canDelete('farm') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                aria-label={`Delete ${farm.name}`}
                                onClick={() => setDeleteTarget(farm)}
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

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete farm"
        message={`Delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Archive/Restore confirmation */}
      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title={archiveTarget?.status === 'inactive' ? 'Restore farm' : 'Archive farm'}
        message={
          archiveTarget?.status === 'inactive'
            ? `Restore "${archiveTarget?.name}"? It will appear as active again.`
            : `Archive "${archiveTarget?.name}"? It will be marked inactive.`
        }
        confirmLabel={archiveTarget?.status === 'inactive' ? 'Restore' : 'Archive'}
        loading={actionLoading}
        onConfirm={handleArchiveToggle}
        onCancel={() => setArchiveTarget(null)}
      />

      {/* Add Farm Dialog */}
      {!readOnly && (
        <Dialog open={showAdd} onOpenChange={setShowAdd} title="Add Farm">
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label htmlFor="farm-name" className="text-sm font-medium mb-1 block">
                Farm Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="farm-name"
                placeholder="My Farm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {formErrors.name && (
                <p className="text-sm text-destructive mt-1">{formErrors.name}</p>
              )}
            </div>
            <div>
              <label htmlFor="farm-type" className="text-sm font-medium mb-1 block">
                Farm Type <span className="text-destructive">*</span>
              </label>
              <Select
                id="farm-type"
                placeholder="Select farm type"
                options={FARM_TYPE_OPTIONS.filter(
                  (t) => !allowedFarmTypes || allowedFarmTypes.includes(t.value)
                )}
                value={form.farmType}
                onChange={(e) => setForm({ ...form, farmType: e.target.value })}
              />
              {excludedTypes.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {excludedTypes.map((t) => t.label).join(', ')}
                  {excludedTypes.length === 1 ? ' requires' : ' require'} a higher plan — ask
                  your administrator.
                </p>
              )}
              {formErrors.farmType && (
                <p className="text-sm text-destructive mt-1">{formErrors.farmType}</p>
              )}
            </div>
            <div>
              <label htmlFor="farm-location" className="text-sm font-medium mb-1 block">
                Location
              </label>
              <Input
                id="farm-location"
                placeholder="City, Country"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
              {formErrors.location && (
                <p className="text-sm text-destructive mt-1">{formErrors.location}</p>
              )}
            </div>
            <div>
              <label htmlFor="farm-size" className="text-sm font-medium mb-1 block">
                Size (acres)
              </label>
              <Input
                id="farm-size"
                type="number"
                placeholder="100"
                min="0"
                step="0.1"
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
              />
              {formErrors.size && (
                <p className="text-sm text-destructive mt-1">{formErrors.size}</p>
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
                Create Farm
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
