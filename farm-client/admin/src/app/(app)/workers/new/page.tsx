'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { workersAPI, farmsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch } from '@/hooks/useFetch';
import { workerFormSchema } from '@/lib/validation';
import { clearFetchCache } from '@/hooks/useFetch';
import { useReadOnly } from '@/lib/useReadOnly';

export default function NewWorkerPage() {
  const router = useRouter();
  const readOnly = useReadOnly();
  const { toast } = useToast();
  const [form, setForm] = useState({ firstName: '', middleName: '', lastName: '', email: '', phone: '', position: '', department: '', farmId: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: farmsData, loading: loadingFarms } = useFetch<{ data: { id: string; name: string }[] }>(
    'farms-list',
    () => farmsAPI.list({ limit: 100 }),
    { cacheTime: 60_000 }
  );

  const farms = farmsData?.data || [];

  if (readOnly) {
    router.push('/workers');
    return null;
  }

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
      await workersAPI.create({
        firstName: form.firstName,
        middleName: form.middleName || undefined,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        position: form.position,
        department: form.department || undefined,
        farmId: form.farmId,
      });
      toast({ type: 'success', title: 'Worker created successfully' });
      clearFetchCache('workers');
      router.push('/workers');
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

  if (loadingFarms) {
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
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Workers
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Add Worker</h1>
        <p className="text-muted-foreground">Register a new farm worker</p>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Position <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. Farm Manager"
                  value={form.position}
                  onChange={(e) => {
                    setForm({ ...form, position: e.target.value });
                    if (errors.position) setErrors({ ...errors, position: '' });
                  }}
                />
                {errors.position && (
                  <p className="text-sm text-destructive mt-1">{errors.position}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Department</label>
                <Input
                  placeholder="e.g. Operations"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input
                  placeholder="e.g. john@example.com"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                />
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
    </div>
  );
}
