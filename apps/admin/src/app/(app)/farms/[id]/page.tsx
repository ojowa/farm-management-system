'use client';

import React, { useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Ruler,
  Pencil,
  Trash2,
  Sprout,
  Beef,
  Egg,
} from 'lucide-react';
import { farmsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';

interface Farm {
  id: string;
  name: string;
  location?: string;
  size?: number;
  sizeUnit?: string;
  description?: string;
  status?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function FarmDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const {
    data: farmData,
    loading,
    refetch,
  } = useFetch<{ data: Farm }>(`farm-${id}`, () => farmsAPI.get(id), {
    cacheTime: 30_000,
  });

  const farm = farmData?.data;

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (event.data?.id === id) {
        refetch();
      }
    },
    [id, refetch]
  );
  useRealtime('farm', handleRealtimeEvent);

  const handleDelete = async () => {
    if (!farm || !confirm(`Delete "${farm.name}"? This action cannot be undone.`))
      return;
    try {
      await farmsAPI.delete(id);
      toast({ type: 'success', title: 'Farm deleted' });
      clearFetchCache('farms');
      router.push('/farms');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete farm',
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

  if (!farm) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Farm not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/farms')}>
          Back to Farms
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/farms"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Farms
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{farm.name}</h1>
            {farm.location && (
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <MapPin className="h-4 w-4" />
                {farm.location}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={farm.status === 'active' ? 'success' : 'secondary'}>
              {farm.status || 'active'}
            </Badge>
            <Button
              variant="outline"
              onClick={() => router.push(`/farms/${id}/edit`)}
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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Ruler className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Size</p>
                <p className="text-lg font-semibold">
                  {farm.size
                    ? `${farm.size} ${farm.sizeUnit || 'acres'}`
                    : 'Not set'}
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
                  {new Date(farm.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="text-lg font-semibold">{farm.location || 'Not set'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {farm.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{farm.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Related Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Link href={`/crops?farmId=${id}`}>
              <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <Sprout className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Crops</p>
                  <p className="text-sm text-muted-foreground">View crop cycles</p>
                </div>
              </div>
            </Link>
            <Link href={`/livestock?farmId=${id}`}>
              <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <Beef className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium">Livestock</p>
                  <p className="text-sm text-muted-foreground">View livestock</p>
                </div>
              </div>
            </Link>
            <Link href={`/poultry?farmId=${id}`}>
              <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <Egg className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium">Poultry</p>
                  <p className="text-sm text-muted-foreground">View flocks</p>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


