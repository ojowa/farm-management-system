'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { cropsAPI, farmsAPI, fieldsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch } from '@/hooks/useFetch';
import { cropFormSchema } from '@/lib/validation';
import { usePermission } from '@/lib/usePermission';
import { useAuth } from '@/lib/auth';

interface Farm {
  id: string;
  name: string;
}

interface Crop {
  id: string;
  name: string;
}

export default function NewCropPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canCreate } = usePermission();
  const readOnly = !canCreate('crop');
  const { isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Redirect only once the auth context has settled. This used to be an
  // early `return null` BEFORE the hooks below — when `user` hydrated a
  // moment later the hook count flipped and React crashed the page, so a
  // cold load of the add-crop screen rendered nothing at all.
  useEffect(() => {
    if (!authLoading && readOnly) router.push('/crops');
  }, [authLoading, readOnly, router]);

  // Prefill from ?farmId=&fieldId= — the crop-cycle detail page links here
  // via "Add Cycle for this Field". Only seed values the user hasn't touched,
  // so a later param change never stomps an in-progress edit.
  useEffect(() => {
    const farm = searchParams.get('farmId');
    const field = searchParams.get('fieldId');
    if (farm) setFarmId((prev) => prev || farm);
    if (field) setForm((prev) => (prev.fieldId ? prev : { ...prev, fieldId: field }));
  }, [searchParams]);
  const [form, setForm] = useState({
    fieldId: '',
    cropId: '',
    plantingDate: '',
    harvestDate: '',
    health: '',
    status: 'PLANNED',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  // Farm isn't posted (a cycle's farm comes via its field) — it drives the
  // field picker below.
  const [farmId, setFarmId] = useState('');

  const { data: farmsData, loading: loadingFarms } = useFetch<{ data: Farm[] }>(
    'farms-list',
    () => farmsAPI.list({ limit: 200 }),
    { cacheTime: 60_000 }
  );

  const { data: cropsData } = useFetch<{ data: Crop[] }>(
    'crops-catalog',
    () => cropsAPI.list({ limit: 500 }),
    { cacheTime: 60_000 }
  );

  // The server requires farmId on /fields, so only fetch once a farm is picked.
  const { data: fieldsData, loading: loadingFields } = useFetch<{ data: { id: string; name: string }[] }>(
    `crop-new-fields-${farmId}`,
    () => fieldsAPI.list({ farmId }),
    { enabled: Boolean(farmId), cacheTime: 60_000 }
  );

  const farms = farmsData?.data || [];
  const crops = cropsData?.data || [];
  const fields = fieldsData?.data || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = cropFormSchema.safeParse(form);
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
      await cropsAPI.createCycle({
        fieldId: form.fieldId,
        cropId: form.cropId,
        plantingDate: form.plantingDate,
        harvestDate: form.harvestDate || undefined,
        health: form.health ? Number(form.health) : undefined,
        status: form.status || 'PLANNED',
      });
      toast({ type: 'success', title: 'Crop cycle created successfully' });
      router.push('/crops');
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
          href="/crops"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Crop Cycles
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Add Crop Cycle</h1>
        <p className="text-muted-foreground">
          Create a new planting cycle on a field
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Farm <span className="text-destructive">*</span>
              </label>
              <Select
                placeholder="Select a farm"
                options={farms.map((f) => ({ value: f.id, label: f.name }))}
                value={farmId}
                onChange={(e) => {
                  // Switching farms invalidates the previously picked field.
                  setFarmId(e.target.value);
                  setForm((f) => ({ ...f, fieldId: '' }));
                  setErrors((prev) => ({ ...prev, fieldId: '' }));
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Field <span className="text-destructive">*</span>
              </label>
              {farmId ? (
                loadingFields ? (
                  <LoadingSpinner className="h-5 w-5" />
                ) : fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No fields on this farm yet.{' '}
                    <Link
                      href={`/fields/new?farmId=${farmId}`}
                      className="text-primary underline underline-offset-2"
                    >
                      Add a field
                    </Link>{' '}
                    to plant here.
                  </p>
                ) : (
                  <Select
                    placeholder="Select a field"
                    options={fields.map((f) => ({ value: f.id, label: f.name }))}
                    value={form.fieldId}
                    onChange={(e) => {
                      setForm({ ...form, fieldId: e.target.value });
                      if (errors.fieldId) setErrors({ ...errors, fieldId: '' });
                    }}
                  />
                )
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a farm above to list its fields.
                </p>
              )}
              {errors.fieldId && (
                <p className="text-sm text-destructive mt-1">{errors.fieldId}</p>
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
                onChange={(e) => {
                  setForm({ ...form, cropId: e.target.value });
                  if (errors.cropId) setErrors({ ...errors, cropId: '' });
                }}
              />
              {errors.cropId && (
                <p className="text-sm text-destructive mt-1">{errors.cropId}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Planting Date <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                value={form.plantingDate}
                onChange={(e) => {
                  setForm({ ...form, plantingDate: e.target.value });
                  if (errors.plantingDate)
                    setErrors({ ...errors, plantingDate: '' });
                }}
              />
              {errors.plantingDate && (
                <p className="text-sm text-destructive mt-1">{errors.plantingDate}</p>
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
                options={[
                  { value: 'PLANNED', label: 'Planned' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'FAILED', label: 'Failed' },
                ]}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/crops')}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                <Save className="mr-2 h-4 w-4" />
                Create Cycle
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
