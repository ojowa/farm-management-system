'use client';

import React, { useEffect, useState } from 'react';
import { Card, Button, Badge, LoadingSpinner, PageHeader } from '@/components/ui';

interface Schedule {
  id: string;
  name: string;
  field: string;
  startTime: string;
  endTime: string;
  frequency: string;
  active: boolean;
}

interface Log {
  id: string;
  scheduleName: string;
  startTime: string;
  endTime: string;
  waterUsed?: number;
  status: string;
}

export default function IrrigationPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, lRes] = await Promise.all([
          fetch('/api/irrigation-schedules').then((r) => r.json()).catch(() => []),
          fetch('/api/irrigation-logs?limit=10').then((r) => r.json()).catch(() => []),
        ]);
        setSchedules(Array.isArray(sRes) ? sRes : sRes?.data || []);
        setLogs(Array.isArray(lRes) ? lRes : lRes?.data || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Irrigation"
        description="Manage irrigation schedules and view logs"
        actions={
          <Button variant="primary" size="sm">+ New Schedule</Button>
        }
      />

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active Schedules</h2>
        {schedules.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No irrigation schedules configured.</p>
        ) : (
          <div className="space-y-3">
            {schedules.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{s.name}</p>
                  <p className="text-sm text-gray-500">{s.field} — {s.frequency} at {s.startTime}</p>
                </div>
                <Badge color={s.active ? 'green' : 'gray'}>{s.active ? 'Active' : 'Inactive'}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Logs</h2>
        {logs.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No irrigation logs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="pb-2">Schedule</th>
                  <th className="pb-2">Start</th>
                  <th className="pb-2">End</th>
                  <th className="pb-2">Water Used</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2 text-sm font-medium text-gray-900 dark:text-white">{l.scheduleName}</td>
                    <td className="py-2 text-sm text-gray-600 dark:text-gray-400">{new Date(l.startTime).toLocaleString()}</td>
                    <td className="py-2 text-sm text-gray-600 dark:text-gray-400">
                      {l.endTime ? new Date(l.endTime).toLocaleString() : '—'}
                    </td>
                    <td className="py-2 text-sm text-gray-600 dark:text-gray-400">
                      {l.waterUsed ? `${l.waterUsed} L` : '—'}
                    </td>
                    <td className="py-2 text-sm">
                      <Badge color={l.status === 'COMPLETED' ? 'green' : l.status === 'FAILED' ? 'red' : 'blue'}>
                        {l.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
