'use client';

import React, { useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Ruler,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  Sprout,
  Beef,
  Egg,
  Fish,
  Tractor,
  AlertCircle,
} from 'lucide-react';
import { farmsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';
import { clearFarmCaches } from '@/lib/farmCaches';
import { usePermission } from '@/lib/usePermission';

import { FARM_TYPE_MAP as FARM_TYPE_CONFIG } from '@/lib/farmTypes';

interface Farm {
  id: string;
  name: string;
  farmType: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  size?: number;
  status?: string;
  createdAt: string;
  updatedAt?: string;
}

/** Related-module cards keyed by the plan module that backs each farm type. */
const RELATED_MODULES: Record<string, { label: string; description: string; icon: typeof Sprout; color: string }> = {
  crop: { label: 'Crops', description: 'View crop cycles', icon: Sprout, color: 'text-green-600' },
  livestock: { label: 'Livestock', description: 'View livestock', icon: Beef, color: 'text-amber-600' },
  poultry: { label: 'Poultry', description: 'View flocks', icon: Egg, color: 'text-orange-600' },
  aquaculture: { label: 'Aquaculture', description: 'View ponds & stock', icon: Fish, color: 'text-cyan-600' },
};

export default function FarmDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { canCreate, canDelete } = usePermission();
  const readOnly = !canCreate('farm');
  const [showDelete, setShowDelete] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const {
    data: farmData,
    loading,
    error,
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
    if (!farm) return;
    setActionLoading(true);
    try {
      await farmsAPI.delete(id);
      toast({ type: 'success', title: 'Farm deleted' });
      clearFarmCaches();
      router.push('/farms');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete farm',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setActionLoading(false);
      setShowDelete(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!farm) return;
    const nextStatus = farm.status === 'inactive' ? 'active' : 'inactive';
    setActionLoading(true);
    try {
      await farmsAPI.update(id, { status: nextStatus });
      toast({
        type: 'success',
        title: nextStatus === 'inactive' ? 'Farm archived' : 'Farm restored',
      });
      clearFarmCaches();
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: `Failed to ${nextStatus === 'inactive' ? 'archive' : 'restore'} farm`,
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setActionLoading(false);
      setShowArchive(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (error && !farm) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <p className="text-lg font-medium text-destructive">Failed to load farm</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
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

  const typeConfig = FARM_TYPE_CONFIG[farm.farmType];
  const TypeIcon = typeConfig?.icon || Tractor;
  const hasCoordinates = farm.latitude != null && farm.longitude != null;
  // Related data leads with the farm type's backing module — an aquaculture
  // farm gets the Aquaculture module, a dairy farm livestock, and so on —
  // then the remaining modules so every record stays reachable.
  const relatedModule = typeConfig?.module || null;
  const related = [
    ...(relatedModule && RELATED_MODULES[relatedModule] ? [relatedModule] : []),
    ...Object.keys(RELATED_MODULES).filter((m) => m !== relatedModule),
  ];

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
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{farm.name}</h1>
              {typeConfig && (
                <Badge className={typeConfig.color}>
                  <TypeIcon className="mr-1 h-3 w-3" />
                  {typeConfig.label}
                </Badge>
              )}
            </div>
            {farm.location && (
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <MapPin className="h-4 w-4" />
                {farm.location}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={farm.status === 'inactive' ? 'secondary' : 'success'}>
              {farm.status === 'inactive' ? 'Inactive' : 'Active'}
            </Badge>
            {!readOnly && (
              <>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/farms/${id}/edit`)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" onClick={() => setShowArchive(true)}>
                  {farm.status === 'inactive' ? (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restore
                    </>
                  ) : (
                    <>
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </>
                  )}
                </Button>
              </>
            )}
            {canDelete('farm') && (
              <Button variant="destructive" onClick={() => setShowDelete(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
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
                  {farm.size ? `${farm.size} acres` : 'Not set'}
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

      {/* Coordinates */}
      {hasCoordinates && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                <MapPin className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coordinates</p>
                <p className="text-lg font-semibold font-mono">
                  {farm.latitude!.toFixed(4)}, {farm.longitude!.toFixed(4)}
                </p>
              </div>
              <Button
                variant="link"
                className="ml-auto"
                onClick={() =>
                  window.open(
                    `https://www.openstreetmap.org/?mlat=${farm.latitude}&mlon=${farm.longitude}#map=15/${farm.latitude}/${farm.longitude}`,
                    '_blank'
                  )
                }
              >
                View on map
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links — driven by the farm type's backing module */}
      <Card>
        <CardHeader>
          <CardTitle>Related Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {related.map((module, index) => {
              const config = RELATED_MODULES[module];
              return (
                <Link key={module} href={`/${module}?farmId=${id}`}>
                  <div
                    className={`flex items-center gap-3 p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                      index === 0 ? 'border-primary/50 bg-primary/5' : ''
                    }`}
                  >
                    <config.icon className={`h-5 w-5 ${config.color}`} />
                    <div>
                      <p className="font-medium">{config.label}</p>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDelete}
        title="Delete farm"
        message={`Delete "${farm.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />

      {/* Archive/Restore confirmation */}
      <ConfirmDialog
        open={showArchive}
        title={farm.status === 'inactive' ? 'Restore farm' : 'Archive farm'}
        message={
          farm.status === 'inactive'
            ? `Restore "${farm.name}"? It will appear as active again.`
            : `Archive "${farm.name}"? It will be marked inactive.`
        }
        confirmLabel={farm.status === 'inactive' ? 'Restore' : 'Archive'}
        loading={actionLoading}
        onConfirm={handleArchiveToggle}
        onCancel={() => setShowArchive(false)}
      />
    </div>
  );
}
