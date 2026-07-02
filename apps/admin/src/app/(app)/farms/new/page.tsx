'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { farmsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { useToast } from '@/lib/toasts';
import { farmFormSchema } from '@/lib/validation';
import { clearFetchCache } from '@/hooks/useFetch';
import { useReadOnly } from '@/lib/useReadOnly';
import { useAuth } from '@/lib/auth';

const ALL_FARM_TYPES = [
  { value: 'CROP', label: 'Crop' },
  { value: 'LIVESTOCK', label: 'Livestock' },
  { value: 'POULTRY', label: 'Poultry' },
  { value: 'DAIRY', label: 'Dairy' },
  { value: 'AQUACULTURE', label: 'Aquaculture' },
];

export default function NewFarmPage() {
  const router = useRouter();
  const { toast } = useToast();
  const readOnly = useReadOnly();
  const { user } = useAuth();
  const allowedFarmTypes = user?.planFeatures?.farmTypes;

  if (readOnly) {
    router.push('/farms');
    return null;
  }
  const [form, setForm] = useState({
    name: '',
    farmType: '',
    location: '',
    size: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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
        description: form.description,
      });
      toast({ type: 'success', title: 'Farm created successfully' });
      clearFetchCache('farms');
      router.push('/farms');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to create farm',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

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
              <label className="text-sm font-medium mb-1 block">
                Farm Name <span className="text-destructive">*</span>
              </label>
              <Input
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
              <label className="text-sm font-medium mb-1 block">
                Farm Type <span className="text-destructive">*</span>
              </label>
              <Select
                placeholder="Select farm type"
                options={allowedFarmTypes ? ALL_FARM_TYPES.filter(t => allowedFarmTypes.includes(t.value)) : ALL_FARM_TYPES}
                value={form.farmType}
                onChange={(e) => {
                  setForm({ ...form, farmType: e.target.value });
                  if (errors.farmType) setErrors({ ...errors, farmType: '' });
                }}
              />
              {errors.farmType && (
                <p className="text-sm text-destructive mt-1">{errors.farmType}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Location</label>
              <Input
                placeholder="e.g. Nairobi, Kenya"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Size (acres)
              </label>
              <Input
                type="number"
                placeholder="e.g. 150"
                min="0"
                step="0.1"
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Description
              </label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Brief description of your farm..."
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={4}
              />
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
