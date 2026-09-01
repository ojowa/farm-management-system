'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { cropsAPI, farmsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { cropFormSchema } from '@/lib/validation';
import { useReadOnly } from '@/lib/useReadOnly';

interface Farm {
  id: string;
  name: string;
}

export default function EditCropPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const readOnly = useReadOnly();
  const { toast } = useToast();

  if (readOnly) {
    router.push('/crops');
    return null;
  }

  const {
    data: cropData,
    loading: loadingCrop,
  } = useFetch<{ data: any }>(`crop-${id}`, () => cropsAPI.get(id));

  const {
    data: farmsData,
    loading: loadingFarms,
  } = useFetch<{ data: Farm[] }>(
    'farms-list',
    () => farmsAPI.list({ limit: 200 }),
    { cacheTime: 60_000 }
  );

  const crop = cropData?.data;
  const farms = farmsData?.data || [];

  const [form, setForm] = useState({
    name: '',
    farmId: '',
    cropType: '',
    area: '',
    status: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (crop) {
      setForm({
        name: crop.name || '',
        farmId: crop.farmId || '',
        cropType: crop.cropType || '',
        area: crop.area?.toString() || '',
        status: crop.status || '',
      });
    }
  }, [crop]);

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
      await cropsAPI.update(id, {
        name: form.name,
        farmId: form.farmId,
        cropType: form.cropType || undefined,
        area: form.area ? Number(form.area) : undefined,
        status: form.status || undefined,
      });
      toast({ type: 'success', title: 'Crop updated successfully' });
      clearFetchCache('crops');
      router.push(`/crops/${id}`);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to update crop',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loadingCrop || loadingFarms) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (!crop) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Crop not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/crops')}
        >
          Back to Crops
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/crops/${id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Crop
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Edit Crop</h1>
        <p className="text-muted-foreground">Update {crop.name}</p>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Crop Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Maize, Wheat"
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
              <label className="text-sm font-medium mb-1 block">Crop Type</label>
              <Input
                placeholder="e.g. Grain, Vegetable, Fruit"
                value={form.cropType}
                onChange={(e) =>
                  setForm({ ...form, cropType: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Area (acres)
              </label>
              <Input
                type="number"
                placeholder="e.g. 50"
                min="0"
                step="0.1"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select
                placeholder="Select status"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'harvested', label: 'Harvested' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/crops/${id}`)}
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
