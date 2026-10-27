'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NavTabs } from '@/components/NavTabs';
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import { departmentsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';

interface Department {
  id: string;
  name: string;
  description?: string | null;
  counts?: { workers: number; tasks: number; shifts: number };
}

const EMPTY_FORM = { name: '', description: '' };

export default function DepartmentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { canCreate, canDelete } = usePermission();
  const readOnly = !canCreate('worker');
  const canRemove = canDelete('worker');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const {
    data,
    loading,
    error,
    refetch,
  } = useFetch<{ data: Department[] }>('departments-list', () => departmentsAPI.list(), {
    cacheTime: 30_000,
  });
  const departments = data?.data || [];

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (department: Department) => {
    setEditingId(department.id);
    setForm({ name: department.name, description: department.description || '' });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('Name is required');
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
      };
      if (editingId) {
        await departmentsAPI.update(editingId, payload);
        toast({ type: 'success', title: 'Department updated' });
      } else {
        await departmentsAPI.create(payload);
        toast({ type: 'success', title: 'Department created' });
      }
      clearFetchCache('departments');
      setShowForm(false);
      refetch();
    } catch (err: any) {
      // 409 on create = duplicate name; the server's message is the useful part.
      setFormError(err.response?.data?.message || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (department: Department) => {
    const inUse = (department.counts?.workers ?? 0) + (department.counts?.tasks ?? 0) + (department.counts?.shifts ?? 0);
    if (
      !confirm(
        inUse > 0
          ? `"${department.name}" is still used by ${inUse} record(s) — the server will refuse the delete. Continue?`
          : `Delete department "${department.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await departmentsAPI.delete(department.id);
      toast({ type: 'success', title: 'Department deleted' });
      clearFetchCache('departments');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Cannot delete department',
        message:
          err.response?.data?.message ||
          'It is still assigned to workers, tasks or shifts',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground">
            Group workers, tasks and shifts by department
          </p>
        </div>
        {!readOnly && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        )}
      </div>

      <NavTabs
        ariaLabel="Workers section"
        tabs={[
          { label: 'Workers', href: '/workers' },
          { label: 'Attendance', href: '/workers/attendance' },
          { label: 'Departments', href: '/workers/departments' },
        ]}
      />

      <Card>
        {loading ? (
          <CardContent className="p-8 flex items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
          </CardContent>
        ) : error ? (
          <CardContent className="p-12 text-center">
            <p className="text-lg font-medium text-destructive">Failed to load departments</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        ) : departments.length === 0 ? (
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              No departments yet. Workers you onboard with a department name will
              appear here too.
            </p>
            {!readOnly && (
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Department
              </Button>
            )}
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Workers</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Shifts</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((department) => (
                  <TableRow key={department.id}>
                    <TableCell className="font-medium">{department.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {department.description || '—'}
                    </TableCell>
                    <TableCell>
                      {/* Counts double as the delete guard's explanation. */}
                      <Badge
                        variant={department.counts?.workers ? 'secondary' : 'outline'}
                      >
                        {department.counts?.workers ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={department.counts?.tasks ? 'secondary' : 'outline'}>
                        {department.counts?.tasks ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={department.counts?.shifts ? 'secondary' : 'outline'}>
                        {department.counts?.shifts ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/workers?department=${encodeURIComponent(department.name)}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
                          title={`View workers in ${department.name}`}
                        >
                          <Building2 className="h-4 w-4" />
                        </Link>
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(department)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canRemove && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(department)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog
        open={showForm}
        onOpenChange={setShowForm}
        title={editingId ? 'Edit department' : 'Add department'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Irrigation"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional — what this department is responsible for"
              rows={3}
            />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingId ? 'Save changes' : 'Create department'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
