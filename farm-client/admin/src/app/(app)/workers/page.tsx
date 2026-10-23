'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NavTabs } from '@/components/NavTabs';
import {
  Plus,
  Search,
  Users,
  Pencil,
  Trash2,
  Eye,
  Calendar,
  Copy,
  Download,
} from 'lucide-react';
import { workersAPI, farmsAPI, rolesAPI } from '@/lib/api';
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
import { usePermission } from '@/lib/usePermission';
import {
  workerFormSchema,
  WORKER_POSITION_OPTIONS,
  WORKER_DEPARTMENT_OPTIONS,
} from '@/lib/validation';

interface Worker {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  phone?: string;
  position: string;
  department?: string;
  status: string;
  hireDate?: string;
  farmId: string;
  farm?: { id: string; name: string };
  createdAt: string;
}

interface RoleOption {
  id: string;
  name: string;
  description?: string;
}

const PAGE_SIZE = 10;

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  PROBATION: 'bg-yellow-100 text-yellow-800',
  TERMINATED: 'bg-red-100 text-red-800',
};

const statusFilterOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'PROBATION', label: 'Probation' },
  { value: 'TERMINATED', label: 'Terminated' },
];

export default function WorkersPage() {
  const router = useRouter();
  const { canCreate, canDelete } = usePermission();
  const readOnly = !canCreate('hr');
  const canRemove = canDelete('hr');
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [farmFilter, setFarmFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ firstName: '', middleName: '', lastName: '', email: '', phone: '', position: '', department: '', farmId: '', roleId: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: workersData,
    loading,
    error,
    refetch,
  } = useFetch<{ data: Worker[]; total: number; page: number; totalPages: number }>(
    `workers-list-${debouncedSearch}-${statusFilter}-${farmFilter}-${departmentFilter}-${page}`,
    () =>
      workersAPI.list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        farmId: farmFilter || undefined,
        department: departmentFilter || undefined,
      }),
    { cacheTime: 30_000 }
  );

  const { data: farmsData } = useFetch<{ data: { id: string; name: string }[] }>(
    'farms-list',
    () => farmsAPI.list({ limit: 100 }),
    { cacheTime: 60_000 }
  );

  const { data: rolesData } = useFetch<{ data: RoleOption[] }>(
    'roles-list',
    () => rolesAPI.list(),
    { cacheTime: 60_000 }
  );

  const farms = farmsData?.data || [];
  const roles = rolesData?.data || [];
  const workers = workersData?.data || [];
  const totalPages = workersData?.totalPages || 1;

  // Default the login role to the system WORKER role once roles arrive; an
  // empty value still works — the backend falls back to WORKER as well.
  useEffect(() => {
    if (!roles.length || form.roleId) return;
    const preferred = roles.find((r) => r.name === 'WORKER') || roles[0];
    if (preferred) setForm((f) => (f.roleId ? f : { ...f, roleId: preferred.id }));
  }, [roles, form.roleId]);

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

  /** CSV of everything matching the current filters (not just this page). */
  const handleExport = async () => {
    setExporting(true);
    try {
      // B3: the server caps `limit` at 100 — a single `limit: 1000` request
      // silently truncated the export. Page through until totalPages (bounded
      // so a pathological dataset can't loop forever).
      const rows: Worker[] = [];
      const MAX_EXPORT_PAGES = 50;
      let current = 1;
      let totalPages = 1;
      do {
        const { data } = await workersAPI.list({
          page: current,
          limit: 100,
          search: debouncedSearch || undefined,
          status: statusFilter || undefined,
          farmId: farmFilter || undefined,
          department: departmentFilter || undefined,
        });
        rows.push(...(data?.data || []));
        totalPages = data?.totalPages || 1;
        current += 1;
      } while (current <= totalPages && current <= MAX_EXPORT_PAGES);
      const header = ['Name', 'Email', 'Phone', 'Position', 'Department', 'Status', 'Hire Date', 'Created'];
      const csv = [
        header.join(','),
        ...rows.map((w) =>
          [
            `${w.firstName} ${w.middleName ? `${w.middleName} ` : ''}${w.lastName}`,
            w.email || '',
            w.phone || '',
            w.position,
            w.department || '',
            w.status,
            w.hireDate ? new Date(w.hireDate).toLocaleDateString() : '',
            new Date(w.createdAt).toLocaleDateString(),
          ]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(',')
        ),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'workers.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast({ type: 'success', title: `Exported ${rows.length} workers` });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Export failed',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setExporting(false);
    }
  };

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
      const { data } = await workersAPI.create({
        firstName: form.firstName,
        middleName: form.middleName || undefined,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        position: form.position,
        department: form.department || undefined,
        farmId: form.farmId,
        roleId: form.roleId || undefined,
      });
      setShowAdd(false);
      setForm({ firstName: '', middleName: '', lastName: '', email: '', phone: '', position: '', department: '', farmId: '', roleId: '' });
      clearFetchCache('workers');
      refetch();
      if (data?.tempPassword) {
        setCreated({ email: data.email || form.email, tempPassword: data.tempPassword });
      } else {
        toast({ type: 'success', title: 'Worker created successfully' });
      }
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workers</h1>
          <p className="text-muted-foreground">Manage your farm workers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} loading={exporting}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          {!readOnly && (
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Worker
            </Button>
          )}
        </div>
      </div>

      <NavTabs
        ariaLabel="Workers section"
        tabs={[
          { label: 'Workers', href: '/workers' },
          { label: 'Attendance', href: '/workers/attendance' },
        ]}
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, phone or position..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              options={statusFilterOptions}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            />
            <Select
              placeholder="All Farms"
              options={farms.map((f) => ({ value: f.id, label: f.name }))}
              value={farmFilter}
              onChange={(e) => {
                setFarmFilter(e.target.value);
                setPage(1);
              }}
            />
            <Select
              placeholder="All Departments"
              options={WORKER_DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d }))}
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPage(1);
              }}
            />
            {(search || statusFilter || farmFilter || departmentFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setFarmFilter('');
                  setDepartmentFilter('');
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
        ) : error ? (
          <CardContent className="p-12 text-center">
            <p className="text-lg font-medium text-destructive">Failed to load workers</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        ) : workers.length === 0 ? (
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {search || statusFilter || farmFilter || departmentFilter
                ? 'No workers match your filters.'
                : 'No workers yet. Add your first worker!'}
            </p>
            {!search && !statusFilter && !farmFilter && !departmentFilter && !readOnly && (
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
                    <TableHead>Status</TableHead>
                    <TableHead>Farm</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers.map((worker) => (
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
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${statusColors[worker.status] || 'bg-gray-100 text-gray-800'}`}
                        >
                          {worker.status || 'ACTIVE'}
                        </span>
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
                          )}
                          {canRemove && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(worker.id, `${worker.firstName} ${worker.lastName}`)}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Position <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. Farm Manager"
                  list="worker-positions"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                />
                <datalist id="worker-positions">
                  {WORKER_POSITION_OPTIONS.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
                {formErrors.position && (
                  <p className="text-sm text-destructive mt-1">{formErrors.position}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Department</label>
                <Input
                  placeholder="e.g. Operations"
                  list="worker-departments"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
                <datalist id="worker-departments">
                  {WORKER_DEPARTMENT_OPTIONS.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Email <span className="text-destructive">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="e.g. john@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Login email — credentials are created for it and the invitation is sent here.
                </p>
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
            <div>
              <label className="text-sm font-medium mb-1 block">
                Login Role <span className="text-destructive">*</span>
              </label>
              <Select
                placeholder="Select a role"
                options={roles.map((r) => ({ value: r.id, label: r.name }))}
                value={form.roleId}
                onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Permissions the worker's login gets — defaults to the WORKER role.
              </p>
              {formErrors.roleId && (
                <p className="text-sm text-destructive mt-1">{formErrors.roleId}</p>
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

      {/* Credentials dialog — shown once the login has been created */}
      {created && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setCreated(null);
          }}
          title="Worker created — login credentials"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {created.email} can now log in to the admin app with this
              temporary password (it was also emailed if delivery is configured).
              Ask them to change it after first login.
            </p>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <code className="block rounded bg-muted px-3 py-2 text-sm font-mono break-all">
                {created.email}
              </code>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Temporary password</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono break-all">
                  {created.tempPassword}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(created.tempPassword);
                    toast({ type: 'success', title: 'Password copied' });
                  }}
                >
                  <Copy className="mr-1 h-4 w-4" />
                  Copy
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setCreated(null)}>
                Done
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
