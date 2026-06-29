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
import { workerFormSchema } from '@/lib/validation';

export default function EditWorkerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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

  const [form, setForm] = useState({ name: '', role: '', farmId: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (worker) {
      setForm({
        name: worker.name || '',
        role: worker.role || '',
        farmId: worker.farmId || '',
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
        name: form.name,
        role: form.role,
        farmId: form.farmId,
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
        <p className="text-muted-foreground">Update {worker.name}</p>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Worker Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. John Doe"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Role <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Farm Manager, Field Worker"
                value={form.role}
                onChange={(e) => {
                  setForm({ ...form, role: e.target.value });
                  if (errors.role) setErrors({ ...errors, role: '' });
                }}
              />
              {errors.role && (
                <p className="text-sm text-destructive mt-1">{errors.role}</p>
              )}
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
