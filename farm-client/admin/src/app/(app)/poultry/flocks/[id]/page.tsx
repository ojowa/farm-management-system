'use client';

import React, { useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Egg,
  Calendar,
  Users,
  Pencil,
  Trash2,
  Activity,
} from 'lucide-react';
import { breedsAPI, flocksAPI, farmsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';
import { usePermission } from '@/lib/usePermission';

interface Flock {
  id: string;
  batchCode: string;
  farmId: string;
  penId?: string;
  breedId: string;
  /** Read-only joins the server attaches to flock reads (breed, pen + house, farm). */
  breed?: { id: string; name: string; birdType?: string } | null;
  pen?:
    | {
        id: string;
        name: string;
        poultryHouseId?: string;
        poultryHouse?: { id: string; name: string } | null;
      }
    | null;
  farm?: { id: string; name: string } | null;
  birdCount: number;
  currentCount: number;
  currentAgeDays: number;
  status: string;
  arrivalDate: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function FlockDetailPage() {
  const { canUpdate, canDelete } = usePermission();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const {
    data: flockData,
    loading,
    refetch,
  } = useFetch<{ data: Flock }>(`flock-${id}`, () => flocksAPI.get(id), {
    cacheTime: 30_000,
  });
  const { data: farmsData } = useFetch<{ data: { id: string; name: string }[] }>(
    'farms-list',
    () => farmsAPI.list({ limit: 100 }),
    { cacheTime: 60_000 }
  );
  const { data: breedsData } = useFetch<{ data: { id: string; name: string }[] }>(
    'poultry-flock-breeds',
    () => breedsAPI.list({ limit: 1000 }),
    { cacheTime: 60_000 }
  );

  // The service returns the flock bare; accept `{ data }` too so a loaded
  // flock never falls through to the "not found" state.
  const flock = ((flockData as any)?.data ?? flockData ?? null);
  // Prefer the join the server sends; fall back to the lookup lists for
  // payloads cached before the joins existed.
  const farmName = flock?.farm?.name ?? farmsData?.data?.find((farm) => farm.id === flock?.farmId)?.name;
  const breedName = flock?.breed?.name ?? breedsData?.data?.find((breed) => breed.id === flock?.breedId)?.name;
  const penName = flock?.pen?.name;
  const houseName = flock?.pen?.poultryHouse?.name;

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (event.data?.id === id) {
        refetch();
      }
    },
    [id, refetch]
  );
  useRealtime('flock', handleRealtimeEvent);

  const handleDelete = async () => {
    if (!flock || !confirm(`Delete flock "${flock.batchCode}"? This action cannot be undone.`))
      return;
    try {
      await flocksAPI.delete(id);
      toast({ type: 'success', title: 'Flock deleted' });
      clearFetchCache('flocks');
      router.push('/poultry/flocks');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete flock',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  const getAge = (arrivalDate: string) => {
    const arrival = new Date(arrivalDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - arrival.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusVariant = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'success';
      case 'COMPLETED':
        return 'secondary';
      case 'DECEASED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (!flock) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Flock not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/poultry/flocks')}>
          Back to Flocks
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/poultry/flocks"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Flocks
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{flock.batchCode}</h1>
            <p className="text-muted-foreground mt-1">{breedName || 'Breed not available'}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={getStatusVariant(flock.status)}>
              {flock.status}
            </Badge>
            {canUpdate('poultry') && (
              <Button
                variant="outline"
                onClick={() => router.push(`/poultry/flocks/${id}/edit`)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {canDelete('poultry') && (
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Egg className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Batch Code</p>
                <p className="text-lg font-semibold">{flock.batchCode}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bird Count</p>
                <p className="text-lg font-semibold">
                  {flock.currentCount.toLocaleString()} / {flock.birdCount.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Activity className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Age (Days)</p>
                <p className="text-lg font-semibold">{flock.currentAgeDays ?? getAge(flock.arrivalDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Arrival Date</p>
                <p className="text-lg font-semibold">
                  {new Date(flock.arrivalDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Farm</p>
              <p className="font-medium">{farmName || 'Farm not available'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Poultry House</p>
              <p className="font-medium">{houseName || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pen</p>
              <p className="font-medium">{penName || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {flock.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{flock.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Related Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Link href={`/poultry/feeding?flockId=${id}`}>
              <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <Egg className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium">Feeding Records</p>
                  <p className="text-sm text-muted-foreground">View feeding history</p>
                </div>
              </div>
            </Link>
            <Link href={`/poultry/vaccinations?flockId=${id}`}>
              <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <Activity className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Vaccinations</p>
                  <p className="text-sm text-muted-foreground">View vaccination records</p>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}