'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { irrigationAPI } from '@/lib/api';
import { useFetch } from '@/hooks/useFetch';
import { useReadOnly } from '@/lib/useReadOnly';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Droplets, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';

interface IrrigationSchedule {
  id: string;
  name: string;
  cropName: string;
  frequency: string;
  duration: number;
  startTime: string;
  isActive: boolean;
  lastRun?: string;
}

interface IrrigationLog {
  id: string;
  scheduleName: string;
  startTime: string;
  endTime?: string;
  status: string;
  volumeUsed?: number;
  notes?: string;
}

const statusIcons: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircle className="h-4 w-4 text-green-500" />,
  RUNNING: <Clock className="h-4 w-4 text-blue-500 animate-pulse" />,
  FAILED: <XCircle className="h-4 w-4 text-red-500" />,
  PENDING: <Clock className="h-4 w-4 text-yellow-500" />,
};

export default function IrrigationPage() {
  const router = useRouter();
  const isReadOnly = useReadOnly();

  const { data: schedulesData, loading: isLoadingSchedules } = useFetch<{ data: IrrigationSchedule[] }>(
    'irrigation-schedules',
    useCallback(async () => await irrigationAPI.listSchedules(), [])
  );

  const { data: logsData, loading: isLoadingLogs } = useFetch<{ data: IrrigationLog[] }>(
    'irrigation-logs',
    useCallback(async () => await irrigationAPI.listLogs({ limit: 20 }), [])
  );

  const schedules = schedulesData?.data || [];
  const logs = logsData?.data || [];
  const activeSchedules = schedules.filter((s) => s.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Irrigation</h1>
        </div>
        {!isReadOnly && (
          <Button onClick={() => router.push('/irrigation/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Schedule
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <Droplets className="mx-auto h-8 w-8 text-blue-500 mb-2" />
            <p className="text-3xl font-bold">{schedules.length}</p>
            <p className="text-sm text-muted-foreground">Total Schedules</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
            <p className="text-3xl font-bold">{activeSchedules.length}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="mx-auto h-8 w-8 text-yellow-500 mb-2" />
            <p className="text-3xl font-bold">{logs.length}</p>
            <p className="text-sm text-muted-foreground">Recent Logs</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Active Schedules</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSchedules ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : activeSchedules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No active irrigation schedules
              </p>
            ) : (
              <div className="space-y-3">
                {activeSchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{schedule.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {schedule.cropName} — {schedule.frequency} — {schedule.duration}min
                      </p>
                      {schedule.lastRun && (
                        <p className="text-xs text-muted-foreground">
                          Last run: {new Date(schedule.lastRun).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Irrigation Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingLogs ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No irrigation logs yet
              </p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      {statusIcons[log.status] || <Clock className="h-4 w-4 text-muted-foreground" />}
                      <div>
                        <p className="text-sm font-medium">{log.scheduleName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.startTime).toLocaleString()}
                          {log.volumeUsed ? ` — ${log.volumeUsed}L` : ''}
                        </p>
                      </div>
                    </div>
                    <Badge variant={log.status === 'COMPLETED' ? 'success' : log.status === 'FAILED' ? 'destructive' : 'secondary'}>
                      {log.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
