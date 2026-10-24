'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { breedsAPI, flocksAPI, farmsAPI, pensAPI, poultryHousesAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { clearFetchCache, useFetch } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';
import { flockEditFormSchema } from '@/lib/validation';

interface Flock {
  id: string;
  batchCode: string;
  farmId: string;
  penId: string;
  breedId: string;
  birdCount: number;
  currentCount: number;
  currentAgeDays: number;
  status: string;
  arrivalDate: string;
}

interface Farm {
  id: string;
  name: string;
}

interface PoultryHouse {
  id: string;
  farmId: string;
}

interface Pen {
  id: string;
  poultryHouseId: string;
  name: string;
}

interface Breed {
  id: string;
  name: string;
  birdType: string;
}

const EMPTY_FORM = {
  batchCode: '',
  farmId: '',
  penId: '',
  breedId: '',
  birdCount: '',
  currentCount: '',
  currentAgeDays: '',
  arrivalDate: '',
  status: 'ACTIVE',
};

export default function EditFlockPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { canUpdate } = usePermission();
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: flockData, loading, error, refetch } = useFetch<{ data: Flock }>(
    `flock-edit-${id}`,
    () => flocksAPI.get(id),
    { cacheTime: 30_000 }
  );
  const { data: farmsData } = useFetch<{ data: Farm[] }>(
    'farms-list',
    () => farmsAPI.list({ limit: 100 }),
    { cacheTime: 60_000 }
  );
  const { data: housesData } = useFetch<{ data: PoultryHouse[] }>(
    'poultry-flock-houses',
    () => poultryHousesAPI.list({ limit: 1000 }),
    { cacheTime: 60_000 }
  );
  const { data: pensData } = useFetch<{ data: Pen[] }>(
    'poultry-flock-pens',
    () => pensAPI.list({ limit: 1000 }),
    { cacheTime: 60_000 }
  );
  const { data: breedsData } = useFetch<{ data: Breed[] }>(
    'poultry-flock-breeds',
    () => breedsAPI.list({ limit: 1000 }),
    { cacheTime: 60_000 }
  );

  // The service returns the flock bare; accept `{ data }` too so a loaded
  // flock never falls through to the "not found" state.
  const flock = ((flockData as any)?.data ?? flockData ?? null);
  const farms = farmsData?.data || [];
  const houses = housesData?.data || [];
  const pens = pensData?.data || [];
  const breeds = breedsData?.data || [];
  const houseFarms = useMemo(
    () => new Map(houses.map((house) => [house.id, house.farmId])),
    [houses]
  );
  const availablePens = useMemo(
    () => pens.filter((pen) => houseFarms.get(pen.poultryHouseId) === form.farmId),
    [pens, houseFarms, form.farmId]
  );

  useEffect(() => {
    if (!flock) return;
    const arrivalDate = new Date(flock.arrivalDate);
    setForm({
      batchCode: flock.batchCode,
      farmId: flock.farmId,
      penId: flock.penId,
      breedId: flock.breedId,
      birdCount: String(flock.birdCount),
      currentCount: String(flock.currentCount),
      currentAgeDays: String(flock.currentAgeDays),
      arrivalDate: Number.isNaN(arrivalDate.getTime())
        ? ''
        : arrivalDate.toISOString().slice(0, 10),
      status: flock.status.toUpperCase(),
    });
  }, [flock]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = flockEditFormSchema.safeParse(form);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[issue.path[0] as string] = issue.message;
      });
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setSaving(true);
    try {
      await flocksAPI.update(id, {
        batchCode: form.batchCode.trim(),
        farmId: form.farmId,
        penId: form.penId,
        breedId: form.breedId,
        birdCount: Number(form.birdCount),
        currentCount: Number(form.currentCount),
        currentAgeDays: Number(form.currentAgeDays),
        arrivalDate: form.arrivalDate,
        status: form.status,
      });
      clearFetchCache('flocks');
      clearFetchCache(`flock-${id}`);
      clearFetchCache(`flock-edit-${id}`);
      toast({ type: 'success', title: 'Flock updated successfully' });
      router.push(`/poultry/flocks/${id}`);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to update flock',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !flock) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-sm text-destructive">{error || 'Flock not found.'}</p>
        <Button variant="outline" onClick={refetch}>Retry</Button>
        <Button variant="ghost" onClick={() => router.push('/poultry/flocks')}>
          Back to flocks
        </Button>
      </div>
    );
  }

  if (!canUpdate('poultry')) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground">You do not have permission to update flocks.</p>
        <Button variant="outline" onClick={() => router.push(`/poultry/flocks/${id}`)}>
          Back to flock
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" onClick={() => router.push(`/poultry/flocks/${id}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to flock
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Edit Flock</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Batch Code *</label>
              <Input
                value={form.batchCode}
                onChange={(event) => setForm({ ...form, batchCode: event.target.value })}
              />
              {formErrors.batchCode && <p className="mt-1 text-sm text-destructive">{formErrors.batchCode}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Farm *</label>
              <Select
                placeholder="Select a farm"
                options={farms.map((farm) => ({ value: farm.id, label: farm.name }))}
                value={form.farmId}
                onChange={(event) =>
                  setForm({ ...form, farmId: event.target.value, penId: '' })
                }
              />
              {formErrors.farmId && <p className="mt-1 text-sm text-destructive">{formErrors.farmId}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Breed *</label>
              <Select
                placeholder="Select a breed"
                options={breeds.map((breed) => ({
                  value: breed.id,
                  label: `${breed.name}${breed.birdType ? ` · ${breed.birdType}` : ''}`,
                }))}
                value={form.breedId}
                onChange={(event) => setForm({ ...form, breedId: event.target.value })}
              />
              {formErrors.breedId && <p className="mt-1 text-sm text-destructive">{formErrors.breedId}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Pen *</label>
              <Select
                placeholder={form.farmId ? 'Select a pen' : 'Select a farm first'}
                options={availablePens.map((pen) => ({ value: pen.id, label: pen.name }))}
                value={form.penId}
                disabled={!form.farmId || availablePens.length === 0}
                onChange={(event) => setForm({ ...form, penId: event.target.value })}
              />
              {formErrors.penId && <p className="mt-1 text-sm text-destructive">{formErrors.penId}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Placed Birds *</label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={form.birdCount}
                  onChange={(event) => setForm({ ...form, birdCount: event.target.value })}
                />
                {formErrors.birdCount && <p className="mt-1 text-sm text-destructive">{formErrors.birdCount}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Current Birds *</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.currentCount}
                  onChange={(event) => setForm({ ...form, currentCount: event.target.value })}
                />
                {formErrors.currentCount && <p className="mt-1 text-sm text-destructive">{formErrors.currentCount}</p>}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Age (days) *</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.currentAgeDays}
                  onChange={(event) => setForm({ ...form, currentAgeDays: event.target.value })}
                />
                {formErrors.currentAgeDays && <p className="mt-1 text-sm text-destructive">{formErrors.currentAgeDays}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Status *</label>
                <Select
                  options={[
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'SOLD', label: 'Sold' },
                    { value: 'DECEASED', label: 'Deceased' },
                    { value: 'COMPLETED', label: 'Completed' },
                  ]}
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value })}
                />
                {formErrors.status && <p className="mt-1 text-sm text-destructive">{formErrors.status}</p>}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Arrival Date *</label>
              <Input
                type="date"
                value={form.arrivalDate}
                onChange={(event) => setForm({ ...form, arrivalDate: event.target.value })}
              />
              {formErrors.arrivalDate && <p className="mt-1 text-sm text-destructive">{formErrors.arrivalDate}</p>}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.push(`/poultry/flocks/${id}`)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>Save Changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
