'use client';

import React, { useEffect, useState } from 'react';
import { reportsAPI } from '@/lib/api';
import { Card, Badge, LoadingSpinner, Button } from '@/components/ui';

interface ScheduledReport {
  id: string;
  name: string;
  type: string;
  status: string;
  frequency?: string;
  nextRun?: string;
  lastRun?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  paused: 'yellow',
  completed: 'blue',
  failed: 'red',
  pending: 'gray',
};

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

export default function ScheduledReportsPage() {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await reportsAPI.list();
        const list = res.data.reports || res.data || [];
        const scheduled = list.filter((r: any) =>
          r.frequency || r.status === 'active' || r.status === 'paused' || r.scheduled
        );
        setReports(scheduled.length > 0 ? scheduled : list);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scheduled Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Automated reports scheduled for generation</p>
        </div>
        <Button onClick={() => {}}>+ Schedule Report</Button>
      </div>

      <Card>
        {reports.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No scheduled reports</h3>
            <p className="text-gray-500 dark:text-gray-400">Schedule a report to receive automatic updates.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Report</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Frequency</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Next Run</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Last Run</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{report.name}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{report.type || '—'}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {report.frequency ? FREQUENCY_LABELS[report.frequency] || report.frequency : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge color={STATUS_COLORS[report.status] || 'gray'}>{report.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {report.nextRun ? new Date(report.nextRun).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {report.lastRun ? new Date(report.lastRun).toLocaleDateString() : '—'}
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
