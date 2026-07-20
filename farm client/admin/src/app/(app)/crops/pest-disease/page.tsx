'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { pestDiseaseAPI } from '@/lib/api';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useReadOnly } from '@/lib/useReadOnly';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Plus, Bug, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PestDiseaseRecord {
  id: string;
  cropName: string;
  type: string;
  name: string;
  severity: string;
  affectedArea: string;
  identifiedDate: string;
  treatment: string;
  status: string;
}

const severityColors: Record<string, 'destructive' | 'warning' | 'default' | 'secondary'> = {
  CRITICAL: 'destructive',
  HIGH: 'destructive',
  MEDIUM: 'warning',
  LOW: 'default',
  MINOR: 'secondary',
};

const typeColors: Record<string, string> = {
  PEST: 'bg-red-100 text-red-800',
  DISEASE: 'bg-orange-100 text-orange-800',
  WEED: 'bg-yellow-100 text-yellow-800',
};

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'PEST', label: 'Pest' },
  { value: 'DISEASE', label: 'Disease' },
  { value: 'WEED', label: 'Weed' },
];

const severityOptions = [
  { value: '', label: 'All Severities' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
  { value: 'MINOR', label: 'Minor' },
];

export default function PestDiseasePage() {
  const router = useRouter();
  const isReadOnly = useReadOnly();
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchKey = `pest-disease-list-${typeFilter}-${severityFilter}-${search}`;

  const { data, loading: isLoading, error } = useFetch<{ data: PestDiseaseRecord[] }>(
    fetchKey,
    useCallback(async () => {
      return await pestDiseaseAPI.list({
        type: typeFilter || undefined,
        severity: severityFilter || undefined,
        search: search || undefined,
      });
    }, [typeFilter, severityFilter, search])
  );

  const records = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Pest & Disease Records</h1>
        </div>
        {!isReadOnly && (
          <Button onClick={() => router.push('/crops/pest-disease/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Record
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={typeOptions} />
            <Select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} options={severityOptions} />
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
            Failed to load records. Please try again.
          </CardContent>
        </Card>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bug className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">No records found</p>
            <p className="text-sm text-muted-foreground">
              {typeFilter || severityFilter || search
                ? 'Try adjusting your filters'
                : 'Create your first pest & disease record to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Crop</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Affected Area</th>
                  <th className="px-4 py-3">Date Identified</th>
                  <th className="px-4 py-3">Treatment</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${typeColors[record.type] || ''}`}>
                        {record.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{record.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{record.cropName}</td>
                    <td className="px-4 py-3">
                      <Badge variant={severityColors[record.severity] || 'default'}>
                        {record.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{record.affectedArea}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(record.identifiedDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                      {record.treatment || '-'}
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
