'use client';

import React, { useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Home,
  Calendar,
  Users,
  Pencil,
  Trash2,
} from 'lucide-react';
import { poultryHousesAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';

interface PoultryHouse {
  id: string;
  name: string;
  farmId: string;
  farmName?: string;
  capacity?: number;
  status?: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function PoultryHouseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const {
    data: houseData,
    loading,
    refetch,
  } = useFetch<{ data: PoultryHouse }>(`poultry-house-${id}`, () => poultryHousesAPI.get(id), {
    cacheTime: 30_000,
  });

  const house = houseData?.data;

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (event.data?.id === id) {
        refetch();
      }
    },
    [id, refetch]
  );
  useRealtime('poultryHouse', handleRealtimeEvent);

  const handleDelete = async () => {
    if (!house || !confirm(`Delete "${house.name}"? This action cannot be undone.`))
      return;
    try {
      await poultryHousesAPI.delete(id);
      toast({ type: 'success', title: 'Poultry house deleted' });
      clearFetchCache('poultry-houses');
      router.push('/poultry/houses');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete poultry house',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (!house) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Poultry house not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/poultry/houses')}>
          Back to Houses
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/poultry/houses"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Poultry Houses
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{house.name}</h1>
            {house.farmName && (
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <Home className="h-4 w-4" />
                {house.farmName}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={house.status === 'active' ? 'success' : 'secondary'}>
              {house.status || 'active'}
            </Badge>
            <Button
              variant="outline"
              onClick={() => router.push(`/poultry/houses/${id}/edit`)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Capacity</p>
                <p className="text-lg font-semibold">
                  {house.capacity ? `${house.capacity} birds` : 'Not set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-lg font-semibold">
                  {new Date(house.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Home className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-semibold capitalize">{house.status || 'active'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {house.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{house.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Related Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Link href={`/poultry/flocks?houseId=${id}`}>
              <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <Users className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium">Flocks</p>
                  <p className="text-sm text-muted-foreground">View flocks in this house</p>
                </div>
              </div>
            </Link>
            <Link href={`/poultry/feeding?houseId=${id}`}>
              <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <Home className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Feeding Records</p>
                  <p className="text-sm text-muted-foreground">View feeding history</p>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}