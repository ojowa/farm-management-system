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
import { usePermission } from '@/lib/usePermission';

interface Farm {
  id: string;
  name: string;
}

interface Crop {
  id: string;
  name: string;
}

interface CropCycle {
  id: string;
  fieldId: string;
  cropId: string;
  cropName?: string;
  plantingDate: string;
  harvestDate?: string | null;
  health?: number;
  status?: string;
}

export default function EditCropPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canCreate } = usePermission();
  const readOnly = !canCreate('crop');
  const { toast } = useToast();

  if (readOnly) {
    router.push('/crops');
    return null;
  }

  const {
    data: cycleData,
    loading: loadingCycle,
  } = useFetch<{ data: CropCycle }>(`crop-cycle-${id}`, () => cropsAPI.getCycle(id));

  const {
    data: farmsData,
    loading: loadingFarms,
  } = useFetch<{ data: Farm[] }>(
    'farms-list',
    () => farmsAPI.list({ limit: 200 }),
    { cacheTime: 60_000 }
  );

  const {
    data: cropsData,
  } = useFetch<{ data: Crop[] }>(
    'crops-catalog',
    () => cropsAPI.list({ limit: 500 }),
    { cacheTime: 60_000 }
  );

  const cycle = cycleData?.data;
  const farms = farmsData?.data || [];
  const crops = cropsData?.data || [];

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

  useEffect(() => {
    if (cycle) {
      setForm({
        fieldId: cycle.fieldId || '',
        cropId: cycle.cropId || '',
        plantingDate: cycle.plantingDate ? new Date(cycle.plantingDate).toISOString().slice(0, 10) : '',
        harvestDate: cycle.harvestDate ? new Date(cycle.harvestDate).toISOString().slice(0, 10) : '',
        health: cycle.health?.toString() || '',
        status: cycle.status || 'PLANNED',
      });
    }
  }, [cycle]);

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
      await cropsAPI.updateCycle(id, {
        fieldId: form.fieldId,
        cropId: form.cropId,
        plantingDate: form.plantingDate,
        harvestDate: form.harvestDate || undefined,
        health: form.health ? Number(form.health) : undefined,
        status: form.status || 'PLANNED',
      });
      toast({ type: 'success', title: 'Crop cycle updated successfully' });
      clearFetchCache('crop-cycles');
      router.push(`/crops/${id}`);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to update crop cycle',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loadingCycle || loadingFarms) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Crop cycle not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/crops')}
        >
          Back to Crop Cycles
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
          Back to Crop Cycle
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Edit Crop Cycle</h1>
        <p className="text-muted-foreground">Update {cycle.cropName || 'this cycle'}</p>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Field <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Field ID"
                value={form.fieldId}
                onChange={(e) => {
                  setForm({ ...form, fieldId: e.target.value });
                  if (errors.fieldId) setErrors({ ...errors, fieldId: '' });
                }}
              />
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
