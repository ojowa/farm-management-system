'use client';

import React, { useEffect, useState } from 'react';
import { Card, Button, Badge, LoadingSpinner, PageHeader } from '@/components/ui';

interface HealthRecord {
  id: string;
  animalName: string;
  type: string;
  date: string;
  notes?: string;
  veterinarian?: string;
}

interface Vaccination {
  id: string;
  animalName: string;
  vaccine: string;
  dueDate: string;
  status: string;
}

export default function LivestockHealthPage() {
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [vacRes, healthRes] = await Promise.all([
          fetch('/api/vaccinations?status=overdue').then((r) => r.json()).catch(() => []),
          fetch('/api/health-records?limit=10').then((r) => r.json()).catch(() => []),
        ]);
        setVaccinations(Array.isArray(vacRes) ? vacRes : vacRes?.data || []);
        setHealthRecords(Array.isArray(healthRes) ? healthRes : healthRes?.data || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Livestock Health"
        description="Monitor animal health and vaccination schedules"
        actions={
          <Button variant="primary" size="sm">+ Add Health Record</Button>
        }
      />

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Overdue Vaccinations</h2>
        {vaccinations.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No overdue vaccinations.</p>
        ) : (
          <div className="space-y-3">
            {vaccinations.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{v.animalName}</p>
                  <p className="text-sm text-gray-500">{v.vaccine} — Due: {new Date(v.dueDate).toLocaleDateString()}</p>
                </div>
                <Badge color="red">Overdue</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Health Records</h2>
        {healthRecords.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No health records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="pb-2">Animal</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Vet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {healthRecords.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 text-sm font-medium text-gray-900 dark:text-white">{r.animalName}</td>
                    <td className="py-2 text-sm text-gray-600 dark:text-gray-400">
                      <Badge color="blue">{r.type}</Badge>
                    </td>
                    <td className="py-2 text-sm text-gray-600 dark:text-gray-400">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="py-2 text-sm text-gray-600 dark:text-gray-400">{r.veterinarian || '—'}</td>
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
