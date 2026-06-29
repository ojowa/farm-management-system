'use client';

import React, { useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Pencil,
  Trash2,
  Beef,
  Heart,
} from 'lucide-react';
import { livestockAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';

interface Livestock {
  id: string;
  species: string;
  breed?: string;
  gender: string;
  farmId: string;
  farmName?: string;
  birthDate?: string;
  status?: string;
  createdAt: string;
  updatedAt?: string;
}

function calculateAge(birthDate?: string): string {
  if (!birthDate) return 'Unknown';
  const birth = new Date(birthDate);
  const now = new Date();
  const diffMs = now.getTime() - birth.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return remainingMonths > 0
    ? `${years}y ${remainingMonths}m`
    : `${years} years`;
}

export default function LivestockDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const {
    data: livestockData,
    loading,
    refetch,
  } = useFetch<{ data: Livestock }>(`livestock-${id}`, () => livestockAPI.get(id), {
    cacheTime: 30_000,
  });

  const livestock = livestockData?.data;

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (event.data?.id === id) {
        refetch();
      }
    },
    [id, refetch]
  );
  useRealtime('livestock', handleRealtimeEvent);

  const handleDelete = async () => {
    if (!livestock || !confirm(`Delete "${livestock.species}"? This action cannot be undone.`))
      return;
    try {
      await livestockAPI.delete(id);
      toast({ type: 'success', title: 'Livestock deleted' });
      clearFetchCache('livestock');
      router.push('/livestock');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete livestock',
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

  if (!livestock) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Livestock not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/livestock')}>
          Back to Livestock
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/livestock"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Livestock
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {livestock.species}
              {livestock.breed && (
                <span className="text-xl font-normal text-muted-foreground ml-2">
                  ({livestock.breed})
                </span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={livestock.status === 'active' ? 'success' : 'secondary'}>
              {livestock.status || 'active'}
            </Badge>
            <Button
              variant="outline"
              onClick={() => router.push(`/livestock/${id}/edit`)}
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
                <Beef className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="text-lg font-semibold">{livestock.gender}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Heart className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Farm</p>
                <p className="text-lg font-semibold">{livestock.farmName || 'Unknown'}</p>
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
                <p className="text-sm text-muted-foreground">Age</p>
                <p className="text-lg font-semibold">
                  {calculateAge(livestock.birthDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Species</p>
              <p className="font-medium">{livestock.species}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Breed</p>
              <p className="font-medium">{livestock.breed || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gender</p>
              <p className="font-medium">{livestock.gender}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium">{livestock.status || 'active'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Birth Date</p>
              <p className="font-medium">
                {livestock.birthDate
                  ? new Date(livestock.birthDate).toLocaleDateString()
                  : 'Not recorded'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">
                {new Date(livestock.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
