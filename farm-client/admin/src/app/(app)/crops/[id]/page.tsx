'use client';

import React, { useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Sprout,
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
import { usePermission } from '@/lib/usePermission';

interface CropCycle {
  id: string;
  fieldId: string;
  fieldName?: string;
  cropId: string;
  cropName?: string;
  farmId?: string;
  farmName?: string;
  plantingDate: string;
  harvestDate?: string | null;
  health?: number;
  status?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function CropDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canCreate } = usePermission();
  const readOnly = !canCreate('crop');
  const { toast } = useToast();

  const {
    data: cycleData,
    loading,
    refetch,
  } = useFetch<{ data: CropCycle }>(`crop-cycle-${id}`, () => cropsAPI.getCycle(id), {
    cacheTime: 30_000,
  });

  // The service returns the cycle bare; accept `{ data }` too so a loaded
  // cycle never falls through to "Crop cycle not found".
  const cycle = ((cycleData as any)?.data ?? cycleData ?? null);

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
    if (!cycle || !confirm(`Delete crop cycle "${cycle.cropName || cycle.id}"? This action cannot be undone.`))
      return;
    try {
      await cropsAPI.deleteCycle(id);
      toast({ type: 'success', title: 'Crop cycle deleted' });
      clearFetchCache('crop-cycles');
      router.push('/crops');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete crop cycle',
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

  if (!cycle) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Crop cycle not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/crops')}>
          Back to Crop Cycles
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
          Back to Crop Cycles
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {cycle.cropName || 'Crop Cycle'}
              {cycle.fieldName && (
                <span className="text-xl font-normal text-muted-foreground ml-2">
                  · {cycle.fieldName}
                </span>
              )}
            </h1>
            {cycle.farmName && (
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <Sprout className="h-4 w-4" />
                {cycle.farmName}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={
                cycle.status?.toUpperCase() === 'COMPLETED'
                  ? 'success'
                  : cycle.status?.toUpperCase() === 'FAILED'
                    ? 'destructive'
                    : 'secondary'
              }
            >
              {cycle.status || '—'}
            </Badge>
            {!readOnly && (
              <Button
                variant="outline"
                onClick={() => router.push(`/crops/${id}/edit`)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {!readOnly && (
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
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
                <p className="text-lg font-semibold">{cycle.farmName || '—'}</p>
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
                <p className="text-sm text-muted-foreground">Field</p>
                <p className="text-lg font-semibold">{cycle.fieldName || 'Not set'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Planting Date</p>
                <p className="text-lg font-semibold">
                  {new Date(cycle.plantingDate).toLocaleDateString()}
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
                <p className="text-sm text-muted-foreground">Harvest Date</p>
                <p className="text-lg font-semibold">
                  {cycle.harvestDate
                    ? new Date(cycle.harvestDate).toLocaleDateString()
                    : 'Not set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health */}
      {cycle.health != null && (
        <Card>
          <CardHeader><CardTitle>Crop Health</CardTitle></CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{cycle.health}%</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
