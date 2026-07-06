'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { breedingAPI } from '@/lib/api';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useReadOnly } from '@/lib/useReadOnly';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Plus, Heart } from 'lucide-react';

interface BreedingRecord {
  id: string;
  sireId: string;
  sireName: string;
  damId: string;
  damName: string;
  breedingDate: string;
  expectedDueDate: string;
  actualDueDate?: string;
  status: string;
  notes?: string;
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  PLANNED: 'secondary',
  BRED: 'default',
  CONFIRMED: 'success',
  BORN: 'success',
  FAILED: 'destructive',
};

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PLANNED', label: 'Planned' },
  { value: 'BRED', label: 'Bred' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'BORN', label: 'Born' },
  { value: 'FAILED', label: 'Failed' },
];

export default function BreedingListPage() {
  const router = useRouter();
  const isReadOnly = useReadOnly();
  const [statusFilter, setStatusFilter] = useState('');

  const fetchKey = `breeding-list-${statusFilter}`;

  const { data, loading: isLoading, error } = useFetch<{ data: BreedingRecord[] }>(
    fetchKey,
    useCallback(async () => {
      return await breedingAPI.list({ status: statusFilter || undefined });
    }, [statusFilter])
  );

  const records = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Breeding Records</h1>
        </div>
        {!isReadOnly && (
          <Button onClick={() => router.push('/livestock/breeding/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Breeding Record
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="pt-6 text-center text-destructive">
            Failed to load breeding records. Please try again.
          </CardContent>
        </Card>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Heart className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">No breeding records found</p>
            <p className="text-sm text-muted-foreground">
              {statusFilter ? 'Try adjusting your filters' : 'Create your first breeding record to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                  <th className="px-4 py-3">Sire</th>
                  <th className="px-4 py-3">Dam</th>
                  <th className="px-4 py-3">Breeding Date</th>
                  <th className="px-4 py-3">Expected Due</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{record.sireName}</td>
                    <td className="px-4 py-3 font-medium">{record.damName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(record.breedingDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(record.expectedDueDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColors[record.status] || 'default'}>
                        {record.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                      {record.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
