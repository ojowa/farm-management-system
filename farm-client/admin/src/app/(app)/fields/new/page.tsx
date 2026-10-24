'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { farmsAPI, fieldsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { fieldFormSchema } from '@/lib/validation';
import { usePermission } from '@/lib/usePermission';
import { useAuth } from '@/lib/auth';

interface Farm {
  id: string;
  name: string;
}

export default function NewFieldPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canCreate } = usePermission();
  const readOnly = !canCreate('farm');
  const { isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Redirect only once the auth context has settled — an early return
  // before the hooks below used to crash these pages on a cold load
  // (the hook count flipped the moment `user` hydrated).
  useEffect(() => {
    if (!authLoading && readOnly) router.push('/farms');
  }, [authLoading, readOnly, router]);

  const [form, setForm] = useState({ farmId: '', name: '', size: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Seed the farm picker from ?farmId= — the farm detail page's "Add Field"
  // and the add-crop page both link here. Only seed values the user hasn't
  // touched, so later param changes never stomp an edit.
  useEffect(() => {
    const farm = searchParams.get('farmId');
    if (farm) setForm((f) => (f.farmId ? f : { ...f, farmId: farm }));
  }, [searchParams]);

  const {
    data: farmsData,
    loading: loadingFarms,
  } = useFetch<{ data: Farm[] }>(
    'farms-dropdown',
    () => farmsAPI.list({ limit: 200 }),
    { cacheTime: 60_000 }
  );
  const farms = farmsData?.data || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = fieldFormSchema.safeParse(form);
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
      await fieldsAPI.create({
        farmId: form.farmId,
        name: form.name.trim(),
        size: Number(form.size),
      });
      toast({ type: 'success', title: 'Field added' });
      // Both the farm detail "Fields" card and the add-crop field picker
      // cache their field lists — drop them so the new field shows up.
      clearFetchCache('farm-fields');
      clearFetchCache('crop-new-fields');
      router.push(`/farms/${form.farmId}`);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to add field',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!authLoading && readOnly) return null;

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
          href="/farms"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Farms
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Add Field</h1>
        <p className="text-muted-foreground">
          Register a parcel on a farm — crop cycles are planted on fields
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                Field Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. North Valley Plot"
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
                Size (acres) <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                min={0}
                step="0.1"
                placeholder="e.g. 12.5"
                value={form.size}
                onChange={(e) => {
                  setForm({ ...form, size: e.target.value });
                  if (errors.size) setErrors({ ...errors, size: '' });
                }}
              />
              {errors.size && (
                <p className="text-sm text-destructive mt-1">{errors.size}</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Add Field
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
