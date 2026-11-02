'use client';

import React, { useEffect, useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { farmsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch } from '@/hooks/useFetch';
import { farmFormSchema, fieldErrorsFromFarmApiError } from '@/lib/validation';
import { clearFarmCaches } from '@/lib/farmCaches';
import { usePermission } from '@/lib/usePermission';
import { useAuth } from '@/lib/auth';

import { FARM_TYPE_ROWS, FARM_TYPE_OPTIONS, farmTypesForPlan } from '@/lib/farmTypes';

export interface EditFarmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmId: string | null;
  onSave?: () => void;
}

export default function EditFarmDialog({
  open,
  onOpenChange,
  farmId,
  onSave,
}: EditFarmDialogProps) {
  const { toast } = useToast();
  const { canCreate } = usePermission();
  const { user } = useAuth();
  const readOnly = !canCreate('farm');
  const allowedFarmTypes = farmTypesForPlan(user?.planFeatures);

  const routerId = farmId;

  const {
    data: farmData,
    loading: loadingFarm,
    error: farmError,
    refetch,
  } = useFetch<{ data: any }>(`edit-farm-${routerId ?? ''}`, () =>
    routerId ? farmsAPI.get(routerId) : Promise.resolve({ data: null })
  );

  const farm = ((farmData as any)?.data ?? farmData ?? null) as any;

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

  // (Re)load the farm whenever the dialog opens with a target id.
  useEffect(() => {
    if (!open || !routerId) return;
    setForm({
      name: '',
      farmType: '',
      location: '',
      size: '',
      status: 'active',
      latitude: '',
      longitude: '',
    });
    setErrors({});
    refetch();
  }, [open, routerId, refetch]);

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
    if (!routerId) return;
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
      await farmsAPI.update(routerId, {
        name: form.name,
        farmType: form.farmType,
        location: form.location,
        size: form.size ? Number(form.size) : undefined,
        status: form.status,
        latitude: form.latitude.trim() === '' ? null : Number(form.latitude),
        longitude: form.longitude.trim() === '' ? null : Number(form.longitude),
      });
      toast({ type: 'success', title: 'Farm updated successfully' });
      clearFarmCaches();
      onSave?.();
      onOpenChange(false);
    } catch (err: any) {
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
  if (!open) return null;

  if (loadingFarm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange} title="Edit Farm">
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      </Dialog>
    );
  }

  if (farmError && !farm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange} title="Edit Farm">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-medium text-destructive">Failed to load farm</p>
            <p className="text-sm text-muted-foreground mt-1">{farmError}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </Dialog>
    );
  }

  if (!farm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange} title="Edit Farm">
        <div className="text-center py-16">
          <p className="text-muted-foreground">Farm not found.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </Dialog>
    );
  }

  const typeOptions = FARM_TYPE_OPTIONS.filter(
    (t) => !allowedFarmTypes || allowedFarmTypes.includes(t.value) || t.value === farm.farmType
  );
  const excludedTypes = allowedFarmTypes
    ? FARM_TYPE_ROWS.filter((t) => !allowedFarmTypes.includes(t.value))
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Edit Farm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="ef-farm-name" className="text-sm font-medium mb-1 block">
            Farm Name <span className="text-destructive">*</span>
          </label>
          <Input
            id="ef-farm-name"
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
          <label htmlFor="ef-farm-type" className="text-sm font-medium mb-1 block">
            Farm Type <span className="text-destructive">*</span>
          </label>
          <Select
            id="ef-farm-type"
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
          <label htmlFor="ef-farm-location" className="text-sm font-medium mb-1 block">
            Location
          </label>
          <Input
            id="ef-farm-location"
            placeholder="e.g. Nairobi, Kenya"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          {errors.location && (
            <p className="text-sm text-destructive mt-1">{errors.location}</p>
          )}
        </div>

        <div>
          <label htmlFor="ef-farm-size" className="text-sm font-medium mb-1 block">
            Size (acres)
          </label>
          <Input
            id="ef-farm-size"
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
          <label htmlFor="ef-farm-status" className="text-sm font-medium mb-1 block">
            Status
          </label>
          <Select
            id="ef-farm-status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="ef-farm-latitude" className="text-sm font-medium mb-1 block">
              Latitude
            </label>
            <Input
              id="ef-farm-latitude"
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
            <label htmlFor="ef-farm-longitude" className="text-sm font-medium mb-1 block">
              Longitude
            </label>
            <Input
              id="ef-farm-longitude"
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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
