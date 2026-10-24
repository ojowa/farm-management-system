'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Copy, Save } from 'lucide-react';
import { workersAPI, farmsAPI, rolesAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch } from '@/hooks/useFetch';
import {
  workerFormSchema,
  WORKER_POSITION_OPTIONS,
  WORKER_DEPARTMENT_OPTIONS,
} from '@/lib/validation';
import { clearFetchCache } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';
import { useAuth } from '@/lib/auth';

interface RoleOption {
  id: string;
  name: string;
  description?: string;
}

export default function NewWorkerPage() {
  const router = useRouter();
  const { canCreate } = usePermission();
  const readOnly = !canCreate('hr');
  const { isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    farmId: '',
    roleId: '',
    hireDate: '',
    payRate: '',
    payType: '',
    skills: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  const { data: farmsData, loading: loadingFarms } = useFetch<{ data: { id: string; name: string }[] }>(
    'farms-list',
    () => farmsAPI.list({ limit: 100 }),
    { cacheTime: 60_000 }
  );

  const { data: rolesData, loading: loadingRoles } = useFetch<{ data: RoleOption[] }>(
    'roles-list',
    () => rolesAPI.list(),
    { cacheTime: 60_000 }
  );

  const farms = farmsData?.data || [];
  const roles = rolesData?.data || [];

  // Default the login role to the system WORKER role once roles arrive; an
  // empty value still works — the backend falls back to WORKER as well.
  useEffect(() => {
    if (!roles.length || form.roleId) return;
    const preferred = roles.find((r) => r.name === 'WORKER') || roles[0];
    if (preferred) setForm((f) => (f.roleId ? f : { ...f, roleId: preferred.id }));
  }, [roles, form.roleId]);

  // Redirect once the auth context has settled instead of pushing during
  // render (which React flags as updating while rendering).
  useEffect(() => {
    if (!authLoading && readOnly) router.push('/workers');
  }, [authLoading, readOnly, router]);
  if (!authLoading && readOnly) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = workerFormSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
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
        hireDate: form.hireDate || undefined,
        payRate: form.payRate ? Number(form.payRate) : undefined,
        payType: form.payType || undefined,
        skills: form.skills
          ? form.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        emergencyContactName: form.emergencyContactName || undefined,
        emergencyContactPhone: form.emergencyContactPhone || undefined,
        emergencyContactRelation: form.emergencyContactRelation || undefined,
      });
      clearFetchCache('workers');
      if (data?.tempPassword) {
        setCreated({ email: data.email || form.email, tempPassword: data.tempPassword });
      } else {
        toast({ type: 'success', title: 'Worker created successfully' });
        router.push('/workers');
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

  const closeCreated = () => {
    setCreated(null);
    router.push('/workers');
  };

  if (loadingFarms || loadingRoles) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/workers"
          className="inline-flex text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Workers
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Add Worker</h1>
        <p className="text-muted-foreground">Register a new farm worker — their login is created automatically</p>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  First Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. John"
                  value={form.firstName}
                  onChange={(e) => {
                    setForm({ ...form, firstName: e.target.value });
                    if (errors.firstName) setErrors({ ...errors, firstName: '' });
                  }}
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive mt-1">{errors.firstName}</p>
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
                onChange={(e) => {
                  setForm({ ...form, lastName: e.target.value });
                  if (errors.lastName) setErrors({ ...errors, lastName: '' });
                }}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive mt-1">{errors.lastName}</p>
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
                  onChange={(e) => {
                    setForm({ ...form, position: e.target.value });
                    if (errors.position) setErrors({ ...errors, position: '' });
                  }}
                />
                <datalist id="worker-positions">
                  {WORKER_POSITION_OPTIONS.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
                {errors.position && (
                  <p className="text-sm text-destructive mt-1">{errors.position}</p>
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
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Login email — credentials are created for it and the invitation is sent here.
                </p>
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email}</p>
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
                onChange={(e) => {
                  setForm({ ...form, farmId: e.target.value });
                  if (errors.farmId) setErrors({ ...errors, farmId: '' });
                }}
              />
              {errors.farmId && (
                <p className="text-sm text-destructive mt-1">{errors.farmId}</p>
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
                onChange={(e) => {
                  setForm({ ...form, roleId: e.target.value });
                  if (errors.roleId) setErrors({ ...errors, roleId: '' });
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Permissions the worker's login gets — defaults to the WORKER role.
              </p>
              {errors.roleId && (
                <p className="text-sm text-destructive mt-1">{errors.roleId}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Hire Date</label>
                <Input
                  type="date"
                  value={form.hireDate}
                  onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Pay Rate</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 15.50"
                  value={form.payRate}
                  onChange={(e) => setForm({ ...form, payRate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Pay Type</label>
                <Select
                  placeholder="Select pay type"
                  options={[
                    { value: 'HOURLY', label: 'Hourly' },
                    { value: 'SALARY', label: 'Salary' },
                    { value: 'PIECE', label: 'Piece rate' },
                  ]}
                  value={form.payType}
                  onChange={(e) => setForm({ ...form, payType: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Skills</label>
              <Input
                placeholder="Irrigation, Tractor, First aid"
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated</p>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Emergency Contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  placeholder="Contact name"
                  value={form.emergencyContactName}
                  onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                />
                <Input
                  placeholder="Contact phone"
                  value={form.emergencyContactPhone}
                  onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
                />
                <Input
                  placeholder="Relationship"
                  value={form.emergencyContactRelation}
                  onChange={(e) => setForm({ ...form, emergencyContactRelation: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/workers')}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                <Save className="mr-2 h-4 w-4" />
                Create Worker
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Credentials dialog — shown once the login has been created */}
      {created && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) closeCreated();
          }}
          title="Worker created — login credentials"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {created.email} can now log in to the admin app with this
              temporary password{''}
              {created.tempPassword && ' (it was also emailed if delivery is configured)'}. Ask them to change it after first login.
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
              <Button type="button" onClick={closeCreated}>
                Done
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
