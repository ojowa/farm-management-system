'use client';

import React, { useCallback, useState } from 'react';
import { irrigationAPI, farmsAPI } from '@/lib/api';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { NavTabs } from '@/components/NavTabs';
import { CROPS_TABS } from '@/lib/cropsTabs';
import { usePermission } from '@/lib/usePermission';
import { useToast, getErrorMessage } from '@/lib/toasts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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
  const { canCreate } = usePermission();
  const { toast } = useToast();
  const isReadOnly = !canCreate('crop');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    farmId: '',
    frequency: 'DAILY',
    waterAmount: '',
    startDate: '',
    endDate: '',
  });

  const { data: schedulesData, loading: isLoadingSchedules, refetch: refetchSchedules } = useFetch<{ data: IrrigationSchedule[] }>(
    'irrigation-schedules',
    useCallback(async () => await irrigationAPI.listSchedules(), [])
  );

  const { data: logsData, loading: isLoadingLogs } = useFetch<{ data: IrrigationLog[] }>(
    'irrigation-logs',
    useCallback(async () => await irrigationAPI.listLogs({ limit: 20 }), [])
  );

  const { data: farmsData } = useFetch<{ data: any[] }>(
    'farms-for-irrigation',
    useCallback(async () => await farmsAPI.list({ limit: 200 }), [])
  );

  const schedules = schedulesData?.data || [];
  const logs = logsData?.data || [];
  const farms = farmsData?.data || [];
  const activeSchedules = schedules.filter((s) => s.isActive);

  const emptyForm = { name: '', farmId: '', frequency: 'DAILY', waterAmount: '', startDate: '', endDate: '' };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.farmId || !form.name || !form.waterAmount || !form.startDate) {
      toast({ type: 'warning', title: 'Please fill in all required fields' });
      return;
    }
    setSaving(true);
    try {
      await irrigationAPI.createSchedule({
        name: form.name,
        farmId: form.farmId,
        frequency: form.frequency,
        waterAmount: Number(form.waterAmount),
        unit: 'liters',
        startDate: new Date(form.startDate).toISOString(),
        ...(form.endDate ? { endDate: new Date(form.endDate).toISOString() } : {}),
      });
      toast({ type: 'success', title: 'Schedule created' });
      setShowCreate(false);
      setForm(emptyForm);
      clearFetchCache('irrigation');
      refetchSchedules();
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to create schedule', message: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Droplets className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Irrigation</h1>
        </div>
        {!isReadOnly && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Schedule
          </Button>
        )}
      </div>

      <NavTabs ariaLabel="Crops section" tabs={CROPS_TABS} />

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

      <Dialog open={showCreate} onOpenChange={setShowCreate} title="New Irrigation Schedule">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Schedule Name *</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Morning irrigation" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Farm *</label>
            <Select
              value={form.farmId}
              onChange={(e) => setForm({ ...form, farmId: e.target.value })}
              options={[{ value: '', label: 'Select farm...' }, ...farms.map((f: any) => ({ value: f.id, label: f.name }))]}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Frequency</label>
              <Select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                options={[
                  { value: 'DAILY', label: 'Daily' },
                  { value: 'WEEKLY', label: 'Weekly' },
                  { value: 'CUSTOM', label: 'Custom' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Water Amount (liters) *</label>
              <Input type="number" min="0" step="any" value={form.waterAmount} onChange={(e) => setForm({ ...form, waterAmount: e.target.value })} required placeholder="e.g. 500" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date *</label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date (optional)</label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Schedule</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
