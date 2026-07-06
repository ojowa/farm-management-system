'use client';

import React, { useEffect, useState } from 'react';
import { Card, Badge, LoadingSpinner, PageHeader } from '@/components/ui';

interface PestDiseaseRecord {
  id: string;
  cropName: string;
  type: string;
  name: string;
  severity: string;
  dateDetected: string;
  treatment?: string;
  status: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'green',
  MEDIUM: 'yellow',
  HIGH: 'orange',
  CRITICAL: 'red',
};

export default function PestDiseasePage() {
  const [records, setRecords] = useState<PestDiseaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/pest-disease-records').then((r) => r.json()).catch(() => []);
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
        title="Pest & Disease Records"
        description="Track and manage crop pest and disease incidents"
      />

      <Card>
        {records.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No pest or disease records yet.</p>
        ) : (
          <div className="space-y-3">
            {records.map((r) => (
              <div key={r.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{r.name}</p>
                    <p className="text-sm text-gray-500">{r.cropName} — {r.type}</p>
                    {r.treatment && (
                      <p className="text-sm text-gray-500 mt-1">Treatment: {r.treatment}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color={SEVERITY_COLORS[r.severity] || 'gray'}>{r.severity}</Badge>
                    <Badge color={r.status === 'RESOLVED' ? 'green' : 'blue'}>{r.status}</Badge>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Detected: {new Date(r.dateDetected).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
