'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Ruler, Sprout } from 'lucide-react';
import { fieldsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { useFetch } from '@/hooks/useFetch';
import { RecordTasksCard } from '@/components/RecordTasksCard';

interface Field {
  id: string;
  farmId: string;
  name: string;
  size: number;
  farm?: { id: string; name: string };
}

export default function FieldDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data, loading } = useFetch<Field>(`field-${id}`, () => fieldsAPI.get(id), {
    cacheTime: 30_000,
  });

  // The gateway envelope is unwrapped by the client, so the row arrives as
  // `response.data`; accept a bare object too rather than showing "not found".
  const field = ((data as any)?.data ?? data ?? null) as Field | null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (!field) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Field not found.</p>
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
          href={field.farm ? `/farms/${field.farm.id}` : '/farms'}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {field.farm ? `Back to ${field.farm.name}` : 'Back to Farms'}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{field.name}</h1>
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          {field.farm && <span>{field.farm.name}</span>}
          {field.size != null && <span>• {field.size} acres</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Ruler className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Size</p>
                <p className="text-lg font-semibold">
                  {field.size != null ? `${field.size} acres` : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Farm</p>
                <p className="text-lg font-semibold">{field.farm?.name || 'Not assigned'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Sprout className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Parcel</p>
                <p className="text-lg font-semibold">{field.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{field.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Farm</p>
              <p className="font-medium">
                {field.farm ? (
                  <Link href={`/farms/${field.farm.id}`} className="hover:underline">
                    {field.farm.name}
                  </Link>
                ) : (
                  'Not assigned'
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Size</p>
              <p className="font-medium">
                {field.size != null ? `${field.size} acres` : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Field ID</p>
              <p className="font-medium text-muted-foreground">{field.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks raised against this parcel. */}
      <RecordTasksCard
        moduleKey="field"
        recordId={field.id}
        recordName={field.name}
        farmId={field.farmId}
      />
    </div>
  );
}
