'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { farmsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { useToast } from '@/lib/toasts';
import { farmFormSchema, fieldErrorsFromFarmApiError } from '@/lib/validation';
import { clearFarmCaches } from '@/lib/farmCaches';
import { usePermission } from '@/lib/usePermission';
import { useAuth } from '@/lib/auth';
import {
  FARM_TYPE_ROWS,
  FARM_TYPE_OPTIONS,
  farmTypesForPlan,
} from '@/lib/farmTypes';

export default function NewFarmPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { canCreate } = usePermission();
  const { user } = useAuth();
  const readOnly = !canCreate('farm');
  // Plan-filtered picker: only farm types the org's plan includes are
  // offered (undefined = no filtering, e.g. plan features not yet received).
  // The server re-checks the plan on create.
  const allowedFarmTypes = farmTypesForPlan(user?.planFeatures);
  const [form, setForm] = useState({
    name: '',
    farmType: '',
    location: '',
    size: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // The redirect must not run mid-render: every hook above/below has to
  // execute unconditionally, so it lives in an effect.
  useEffect(() => {
    if (readOnly) router.push('/farms');
  }, [readOnly, router]);

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
      await farmsAPI.create({
        name: form.name,
        farmType: form.farmType,
        location: form.location,
        size: form.size ? Number(form.size) : undefined,
      });
      toast({ type: 'success', title: 'Farm created successfully' });
      clearFarmCaches();
      router.push('/farms');
    } catch (err: any) {
      // `"field" is required`-style 400s map onto the offending input.
      const fieldErrors = fieldErrorsFromFarmApiError(err);
      if (fieldErrors) {
        setErrors(fieldErrors);
      } else {
        toast({
          type: 'error',
          title: 'Failed to create farm',
          message: err.response?.data?.message || 'An error occurred',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (readOnly) return null;

  const excludedTypes = allowedFarmTypes
    ? FARM_TYPE_ROWS.filter((t) => !allowedFarmTypes.includes(t.value))
    : [];

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
        <h1 className="text-3xl font-bold tracking-tight">Add Farm</h1>
        <p className="text-muted-foreground">Create a new farm property</p>
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
                options={FARM_TYPE_OPTIONS.filter((t) => !allowedFarmTypes || allowedFarmTypes.includes(t.value))}
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
                onChange={(e) => setForm({ ...form, location: e.target.value })}
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

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/farms')}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                <Save className="mr-2 h-4 w-4" />
                Create Farm
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
