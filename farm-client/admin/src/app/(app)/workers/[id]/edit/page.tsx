'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { workersAPI, farmsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';
import {
  workerFormSchema,
  WORKER_POSITION_OPTIONS,
  WORKER_DEPARTMENT_OPTIONS,
} from '@/lib/validation';

export default function EditWorkerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canCreate } = usePermission();
  const readOnly = !canCreate('hr');
  const { toast } = useToast();

  const {
    data: workerData,
    loading: loadingWorker,
  } = useFetch<{ data: any }>(`worker-${id}`, () => workersAPI.get(id));

  const { data: farmsData, loading: loadingFarms } = useFetch<{ data: { id: string; name: string }[] }>(
    'farms-list',
    () => farmsAPI.list({ limit: 100 }),
    { cacheTime: 60_000 }
  );

  const worker = workerData?.data;
  const farms = farmsData?.data || [];

  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    farmId: '',
    status: 'ACTIVE',
    hireDate: '',
    payRate: '',
    payType: '',
    skills: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    terminationDate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Redirect in an effect — an early return above the hooks below used to
  // break the conditional-hooks rule for read-only users.
  useEffect(() => {
    if (readOnly) router.push('/workers');
  }, [readOnly, router]);

  useEffect(() => {
    if (worker) {
      setForm({
        firstName: worker.firstName || '',
        middleName: worker.middleName || '',
        lastName: worker.lastName || '',
        email: worker.email || '',
        phone: worker.phone || '',
        position: worker.position || '',
        department: worker.department || '',
        farmId: worker.farmId || '',
        status: worker.status || 'ACTIVE',
        hireDate: worker.hireDate ? worker.hireDate.split('T')[0] : '',
        payRate: worker.payRate != null ? String(worker.payRate) : '',
        payType: worker.payType || '',
        skills: Array.isArray(worker.skills) ? worker.skills.join(', ') : '',
        emergencyContactName: worker.emergencyContactName || '',
        emergencyContactPhone: worker.emergencyContactPhone || '',
        emergencyContactRelation: worker.emergencyContactRelation || '',
        terminationDate: worker.terminationDate
          ? worker.terminationDate.split('T')[0]
          : '',
      });
    }
  }, [worker]);

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
      await workersAPI.update(id, {
        firstName: form.firstName,
        middleName: form.middleName || undefined,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        position: form.position,
        department: form.department || undefined,
        farmId: form.farmId,
        status: form.status,
        hireDate: form.hireDate || undefined,
        payRate: form.payRate ? Number(form.payRate) : undefined,
        payType: form.payType || undefined,
        skills: form.skills
          ? form.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        emergencyContactName: form.emergencyContactName || undefined,
        emergencyContactPhone: form.emergencyContactPhone || undefined,
        emergencyContactRelation: form.emergencyContactRelation || undefined,
        terminationDate: form.terminationDate || undefined,
      });
      toast({ type: 'success', title: 'Worker updated successfully' });
      clearFetchCache('workers');
      router.push(`/workers/${id}`);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to update worker',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  if (readOnly) return null;

  if (loadingWorker || loadingFarms) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Worker not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/workers')}
        >
          Back to Workers
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/workers/${id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Worker
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Edit Worker</h1>
        <p className="text-muted-foreground">Update {worker.firstName} {worker.lastName}</p>
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
                  placeholder="e.g. john@example.com"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Login email — credentials are created for it and the
                  invitation is sent here.
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select
                  options={[
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'INACTIVE', label: 'Inactive' },
                    { value: 'PROBATION', label: 'Probation' },
                    { value: 'TERMINATED', label: 'Terminated' },
                  ]}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Hire Date</label>
                <Input
                  type="date"
                  value={form.hireDate}
                  onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Termination Date</label>
                <Input
                  type="date"
                  value={form.terminationDate}
                  onChange={(e) => setForm({ ...form, terminationDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <div>
                <label className="text-sm font-medium mb-1 block">Skills</label>
                <Input
                  placeholder="Irrigation, Tractor, First aid"
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">Comma-separated</p>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Emergency Contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  placeholder="Contact name"
                  value={form.emergencyContactName}
                  onChange={(e) =>
                    setForm({ ...form, emergencyContactName: e.target.value })
                  }
                />
                <Input
                  placeholder="Contact phone"
                  value={form.emergencyContactPhone}
                  onChange={(e) =>
                    setForm({ ...form, emergencyContactPhone: e.target.value })
                  }
                />
                <Input
                  placeholder="Relationship"
                  value={form.emergencyContactRelation}
                  onChange={(e) =>
                    setForm({ ...form, emergencyContactRelation: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/workers/${id}`)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
