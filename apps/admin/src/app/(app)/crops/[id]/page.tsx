'use client';

import React, { useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Sprout,
  Ruler,
  MapPin,
  Pencil,
  Trash2,
} from 'lucide-react';
import { cropsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';

interface Crop {
  id: string;
  name: string;
  farmId: string;
  farmName?: string;
  cropType?: string;
  area?: number;
  areaUnit?: string;
  description?: string;
  status?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function CropDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const {
    data: cropData,
    loading,
    refetch,
  } = useFetch<{ data: Crop }>(`crop-${id}`, () => cropsAPI.get(id), {
    cacheTime: 30_000,
  });

  const crop = cropData?.data;

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (event.data?.id === id) {
        refetch();
      }
    },
    [id, refetch]
  );
  useRealtime('crop', handleRealtimeEvent);

  const handleDelete = async () => {
    if (!crop || !confirm(`Delete "${crop.name}"? This action cannot be undone.`))
      return;
    try {
      await cropsAPI.delete(id);
      toast({ type: 'success', title: 'Crop deleted' });
      clearFetchCache('crops');
      router.push('/crops');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete crop',
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

  if (!crop) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Crop not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/crops')}>
          Back to Crops
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/crops"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Crops
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{crop.name}</h1>
            {crop.cropType && (
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <Sprout className="h-4 w-4" />
                {crop.cropType}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={
                crop.status === 'active'
                  ? 'success'
                  : crop.status === 'harvested'
                  ? 'default'
                  : 'secondary'
              }
            >
              {crop.status || 'active'}
            </Badge>
            <Button
              variant="outline"
              onClick={() => router.push(`/crops/${id}/edit`)}
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Sprout className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Farm</p>
                <p className="text-lg font-semibold">{crop.farmName || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Sprout className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="text-lg font-semibold">{crop.cropType || 'Not set'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Ruler className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Area</p>
                <p className="text-lg font-semibold">
                  {crop.area
                    ? `${crop.area} ${crop.areaUnit || 'acres'}`
                    : 'Not set'}
                </p>
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
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-lg font-semibold">
                  {new Date(crop.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {crop.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{crop.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
