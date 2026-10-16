'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { farmsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch } from '@/hooks/useFetch';
import { farmFormSchema, fieldErrorsFromFarmApiError } from '@/lib/validation';
import { clearFarmCaches } from '@/lib/farmCaches';
import { usePermission } from '@/lib/usePermission';
import { useAuth } from '@/lib/auth';

import { FARM_TYPE_ROWS, FARM_TYPE_OPTIONS, farmTypesForPlan } from '@/lib/farmTypes';

export default function EditFarmPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { canCreate } = usePermission();
  const { user } = useAuth();
  const readOnly = !canCreate('farm');
  // Plan-filtered picker — the farm's current type is always kept so an
  // existing value can't be "invalid"; the server re-validates on save.
  const allowedFarmTypes = farmTypesForPlan(user?.planFeatures);

  const {
    data: farmData,
    loading: loadingFarm,
    error: farmError,
    refetch,
  } = useFetch<{ data: any }>(`farm-${id}`, () => farmsAPI.get(id));

  const farm = farmData?.data;

  const [form, setForm] = useState({
    name: '',
    farmType: '',
    location: '',
    size: '',
    status: 'active',
    latitude: '',
    longitude: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // The redirect must not run mid-render: every hook above/below has to
  // execute unconditionally, so it lives in an effect.
  useEffect(() => {
    if (readOnly) router.push('/farms');
  }, [readOnly, router]);

  useEffect(() => {
    if (farm) {
      setForm({
        name: farm.name || '',
        farmType: farm.farmType || '',
        location: farm.location || '',
        size: farm.size?.toString() || '',
        status: farm.status || 'active',
        latitude: farm.latitude != null ? String(farm.latitude) : '',
        longitude: farm.longitude != null ? String(farm.longitude) : '',
      });
    }
  }, [farm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = farmFormSchema.safeParse(form);
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
      await farmsAPI.update(id, {
        name: form.name,
        farmType: form.farmType,
        location: form.location,
        size: form.size ? Number(form.size) : undefined,
        status: form.status,
        // Empty clears the coordinate; the server range-checks numbers.
        latitude: form.latitude.trim() === '' ? null : Number(form.latitude),
        longitude: form.longitude.trim() === '' ? null : Number(form.longitude),
      });
      toast({ type: 'success', title: 'Farm updated successfully' });
      clearFarmCaches();
      router.push(`/farms/${id}`);
    } catch (err: any) {
      // `"field" is required`-style 400s map onto the offending input.
      const fieldErrors = fieldErrorsFromFarmApiError(err);
      if (fieldErrors) {
        setErrors(fieldErrors);
      } else {
        toast({
          type: 'error',
          title: 'Failed to update farm',
          message: err.response?.data?.message || 'An error occurred',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (readOnly) return null;

  if (loadingFarm) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (farmError && !farm) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <p className="text-lg font-medium text-destructive">Failed to load farm</p>
          <p className="text-sm text-muted-foreground mt-1">{farmError}</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!farm) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Farm not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/farms')}
        >
          Back to Farms
        </Button>
      </div>
    );
  }

  // Offer every plan-allowed type, plus whatever the farm already is.
  const typeOptions = FARM_TYPE_OPTIONS.filter(
    (t) => !allowedFarmTypes || allowedFarmTypes.includes(t.value) || t.value === farm.farmType
  );
  const excludedTypes = allowedFarmTypes
    ? FARM_TYPE_ROWS.filter((t) => !allowedFarmTypes.includes(t.value))
    : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/farms/${id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Farm
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Edit Farm</h1>
        <p className="text-muted-foreground">Update {farm.name}</p>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="farm-name" className="text-sm font-medium mb-1 block">
                Farm Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="farm-name"
                placeholder="e.g. Green Valley Farm"
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
              <label htmlFor="farm-type" className="text-sm font-medium mb-1 block">
                Farm Type <span className="text-destructive">*</span>
              </label>
              <Select
                id="farm-type"
                placeholder="Select farm type"
                options={typeOptions}
                value={form.farmType}
                onChange={(e) => {
                  setForm({ ...form, farmType: e.target.value });
                  if (errors.farmType) setErrors({ ...errors, farmType: '' });
                }}
              />
              {excludedTypes.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {excludedTypes.map((t) => t.label).join(', ')}
                  {excludedTypes.length === 1 ? ' requires' : ' require'} a higher plan — ask
                  your administrator.
                </p>
              )}
              {errors.farmType && (
                <p className="text-sm text-destructive mt-1">{errors.farmType}</p>
              )}
            </div>

            <div>
              <label htmlFor="farm-location" className="text-sm font-medium mb-1 block">
                Location
              </label>
              <Input
                id="farm-location"
                placeholder="e.g. Nairobi, Kenya"
                value={form.location}
                onChange={(e) =>
                  setForm({ ...form, location: e.target.value })
                }
              />
              {errors.location && (
                <p className="text-sm text-destructive mt-1">{errors.location}</p>
              )}
            </div>

            <div>
              <label htmlFor="farm-size" className="text-sm font-medium mb-1 block">
                Size (acres)
              </label>
              <Input
                id="farm-size"
                type="number"
                placeholder="e.g. 150"
                min="0"
                step="0.1"
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
              />
              {errors.size && (
                <p className="text-sm text-destructive mt-1">{errors.size}</p>
              )}
            </div>

            <div>
              <label htmlFor="farm-status" className="text-sm font-medium mb-1 block">
                Status
              </label>
              <Select
                id="farm-status"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="farm-latitude" className="text-sm font-medium mb-1 block">
                  Latitude
                </label>
                <Input
                  id="farm-latitude"
                  type="number"
                  placeholder="e.g. -1.2921"
                  step="any"
                  min="-90"
                  max="90"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                />
                {errors.latitude && (
                  <p className="text-sm text-destructive mt-1">{errors.latitude}</p>
                )}
              </div>
              <div>
                <label htmlFor="farm-longitude" className="text-sm font-medium mb-1 block">
                  Longitude
                </label>
                <Input
                  id="farm-longitude"
                  type="number"
                  placeholder="e.g. 36.8219"
                  step="any"
                  min="-180"
                  max="180"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                />
                {errors.longitude && (
                  <p className="text-sm text-destructive mt-1">{errors.longitude}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/farms/${id}`)}
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
