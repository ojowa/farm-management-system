'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { farmsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { farmFormSchema } from '@/lib/validation';
import { useReadOnly } from '@/lib/useReadOnly';

export default function EditFarmPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const readOnly = useReadOnly();

  if (readOnly) {
    router.push('/farms');
    return null;
  }

  const {
    data: farmData,
    loading: loadingFarm,
  } = useFetch<{ data: any }>(`farm-${id}`, () => farmsAPI.get(id));

  const farm = farmData?.data;

  const [form, setForm] = useState({
    name: '',
    location: '',
    size: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (farm) {
      setForm({
        name: farm.name || '',
        location: farm.location || '',
        size: farm.size?.toString() || '',
        description: farm.description || '',
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
        location: form.location,
        size: form.size ? Number(form.size) : undefined,
        description: form.description,
      });
      toast({ type: 'success', title: 'Farm updated successfully' });
      clearFetchCache('farms');
      router.push(`/farms/${id}`);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to update farm',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loadingFarm) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="h-8 w-8" />
      </div>
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
              <label className="text-sm font-medium mb-1 block">Location</label>
              <Input
                placeholder="e.g. Nairobi, Kenya"
                value={form.location}
                onChange={(e) =>
                  setForm({ ...form, location: e.target.value })
                }
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
