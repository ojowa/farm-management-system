'use client';

import React, { useEffect, useState } from 'react';
import { Card, Badge, LoadingSpinner, PageHeader } from '@/components/ui';

interface BreedingRecord {
  id: string;
  maleName: string;
  femaleName: string;
  breedDate: string;
  expectedDueDate?: string;
  status: string;
  offspringCount?: number;
  notes?: string;
}

const STATUS_COLORS: Record<string, string> = {
  PLANNED: 'blue',
  IN_PROGRESS: 'yellow',
  COMPLETED: 'green',
  FAILED: 'red',
  CANCELLED: 'gray',
};

export default function BreedingPage() {
  const [records, setRecords] = useState<BreedingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/breeding-records').then((r) => r.json()).catch(() => []);
        setRecords(Array.isArray(res) ? res : res?.data || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Breeding Records"
        description="Track livestock breeding activities and outcomes"
      />

      <Card>
        {records.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No breeding records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="pb-2">Male</th>
                  <th className="pb-2">Female</th>
                  <th className="pb-2">Breed Date</th>
                  <th className="pb-2">Expected Due</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Offspring</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 text-sm font-medium text-gray-900 dark:text-white">{r.maleName}</td>
                    <td className="py-2 text-sm font-medium text-gray-900 dark:text-white">{r.femaleName}</td>
                    <td className="py-2 text-sm text-gray-600 dark:text-gray-400">{new Date(r.breedDate).toLocaleDateString()}</td>
                    <td className="py-2 text-sm text-gray-600 dark:text-gray-400">
                      {r.expectedDueDate ? new Date(r.expectedDueDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-2 text-sm">
                      <Badge color={STATUS_COLORS[r.status] || 'gray'}>{r.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className="py-2 text-sm text-gray-600 dark:text-gray-400">{r.offspringCount ?? '—'}</td>
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
