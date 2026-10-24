'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { useFetch } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';
import { poultryRecordConfigs, unwrapPoultryRecord } from '../../record-config';
import { flocksAPI } from '@/lib/api';

export default function PoultryRecordPage() {
  const { module, id } = useParams<{ module: string; id: string }>();
  const router = useRouter();
  const { canUpdate } = usePermission();
  const { data: flocksData } = useFetch<{ data: { id: string; batchCode: string }[] }>('flocks-for-link', () => flocksAPI.list({ limit: 100 }), { cacheTime: 60000 });
  const flockMap = useMemo(() => {
    const map = new Map<string, string>();
    (flocksData?.data || []).forEach((f: any) => map.set(f.id, f.batchCode || f.id));
    return map;
  }, [flocksData]);
  const config = poultryRecordConfigs[module];
  const { data, loading, error } = useFetch<{ data: Record<string, any> }>(
    `poultry-record-${module}-${id}`,
    () => config.api.get(id),
    { enabled: !!config },
  );
  const record = data ? unwrapPoultryRecord(data) : null;

  if (!config) {
    return <p className="p-6 text-destructive">Poultry record type not found.</p>;
  }
  if (loading) return <LoadingSpinner />;
  if (error || !record) {
    return <p className="p-6 text-destructive">{error || 'Record not found.'}</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {canUpdate('poultry') && (
          <Button onClick={() => router.push(`/poultry/${module}/${id}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {config.fields.map(({ key, label }) => {
            const value = record[key];
            return (
              <div key={key} className="space-y-1">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="break-words font-medium">
                  {value == null || value === '' ? '—' : key.toLowerCase().includes('date')
                    ? new Date(value).toLocaleDateString()
                    : key === 'flockId' && flockMap.has(value)
                      ? flockMap.get(value)
                      : String(value)}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
