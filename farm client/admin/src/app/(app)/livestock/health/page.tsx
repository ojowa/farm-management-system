'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { livestockHealthAPI } from '@/lib/api';
import { useFetch } from '@/hooks/useFetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, AlertTriangle, Plus } from 'lucide-react';

interface OverdueVaccination {
  id: string;
  livestockId: string;
  livestockName: string;
  vaccineName: string;
  scheduledDate: string;
  status: string;
}

interface HealthRecord {
  id: string;
  livestockId: string;
  livestockName: string;
  condition: string;
  treatment: string;
  recordedDate: string;
  recordedBy: string;
}

export default function LivestockHealthPage() {
  const router = useRouter();

  const { data: overdueData, loading: isLoadingOverdue } = useFetch<{ data: OverdueVaccination[] }>(
    'overdue-vaccinations',
    useCallback(async () => await livestockHealthAPI.overdueVaccinations(), [])
  );

  const overdueVaccinations = overdueData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Livestock Health</h1>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Due Vaccinations This Week
          </CardTitle>
          <Badge variant={overdueVaccinations.length > 0 ? 'warning' : 'success'}>
            {overdueVaccinations.length} due
          </Badge>
        </CardHeader>
        <CardContent>
          {isLoadingOverdue ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : overdueVaccinations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No vaccinations due this week. All up to date!
            </p>
          ) : (
            <div className="space-y-3">
              {overdueVaccinations.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{v.livestockName}</p>
                    <p className="text-sm text-muted-foreground">
                      {v.vaccineName} — Due: {new Date(v.scheduledDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="warning">Overdue</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Health Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select an animal from the livestock list to view detailed health records, vaccination history, and to schedule new vaccinations.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/livestock')}
          >
            View Livestock
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
