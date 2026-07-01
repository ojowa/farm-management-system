'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { livestockAPI, farmsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { livestockFormSchema } from '@/lib/validation';
import { useReadOnly } from '@/lib/useReadOnly';

export default function EditLivestockPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const readOnly = useReadOnly();

  if (readOnly) {
    router.push('/livestock');
    return null;
  }

  const {
    data: livestockData,
    loading: loadingLivestock,
  } = useFetch<{ data: any }>(`livestock-${id}`, () => livestockAPI.get(id));

  const { data: farmsData } = useFetch<{ data: { id: string; name: string }[] }>(
    'farms-dropdown',
    () => farmsAPI.list({ limit: 100 }),
    { cacheTime: 60_000 }
  );

  const livestock = livestockData?.data;
  const farms = farmsData?.data || [];

  const [form, setForm] = useState({
    species: '',
    breed: '',
    gender: '',
    farmId: '',
    birthDate: '',
    status: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (livestock) {
      setForm({
        species: livestock.species || '',
        breed: livestock.breed || '',
        gender: livestock.gender || '',
        farmId: livestock.farmId || '',
        birthDate: livestock.birthDate
          ? new Date(livestock.birthDate).toISOString().split('T')[0]
          : '',
        status: livestock.status || '',
      });
    }
  }, [livestock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = livestockFormSchema.safeParse(form);
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
      await livestockAPI.update(id, {
        species: form.species,
        breed: form.breed || undefined,
        gender: form.gender,
        farmId: form.farmId,
        birthDate: form.birthDate || undefined,
        status: form.status || undefined,
      });
      toast({ type: 'success', title: 'Livestock updated successfully' });
      clearFetchCache('livestock');
      router.push(`/livestock/${id}`);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to update livestock',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loadingLivestock) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (!livestock) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Livestock not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/livestock')}
        >
          Back to Livestock
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/livestock/${id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Livestock
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Edit Livestock</h1>
        <p className="text-muted-foreground">
          Update {livestock.species}
          {livestock.breed && ` (${livestock.breed})`}
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Species <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Cattle, Goat, Sheep"
                value={form.species}
                onChange={(e) => {
                  setForm({ ...form, species: e.target.value });
                  if (errors.species) setErrors({ ...errors, species: '' });
                }}
              />
              {errors.species && (
                <p className="text-sm text-destructive mt-1">{errors.species}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Breed</label>
              <Input
                placeholder="e.g. Holstein, Angus"
                value={form.breed}
                onChange={(e) => setForm({ ...form, breed: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Gender <span className="text-destructive">*</span>
              </label>
              <Select
                placeholder="Select gender"
                options={[
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                ]}
                value={form.gender}
                onChange={(e) => {
                  setForm({ ...form, gender: e.target.value });
                  if (errors.gender) setErrors({ ...errors, gender: '' });
                }}
              />
              {errors.gender && (
                <p className="text-sm text-destructive mt-1">{errors.gender}</p>
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
              <label className="text-sm font-medium mb-1 block">Birth Date</label>
              <Input
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select
                placeholder="Select status"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'sold', label: 'Sold' },
                  { value: 'deceased', label: 'Deceased' },
                ]}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/livestock/${id}`)}
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
