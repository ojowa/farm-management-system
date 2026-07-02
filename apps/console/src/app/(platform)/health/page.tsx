'use client';

import React, { useState, useEffect } from 'react';
import { platformHealthAPI } from '@/lib/api';

interface ServiceHealth {
  name: string;
  status: string;
  uptime?: number;
  latencyMs?: number;
  lastCheck?: string;
  metadata?: Record<string, any>;
}

interface HealthSummary {
  total: number;
  healthy: number;
  unhealthy: number;
  totalMs: number;
}

export default function HealthPage() {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [dbStatus, setDbStatus] = useState('unknown');
  const [dbLatency, setDbLatency] = useState(0);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const { data } = await platformHealthAPI.status();
      setServices(data.services || []);
      setDbStatus(data.database?.status || 'unknown');
      setDbLatency(data.database?.latencyMs || 0);
      setLastUpdated(data.lastUpdated || '');
    } catch { /* ignore */ }
    setLoading(false);
  };

  const triggerCheck = async () => {
    setChecking(true);
    try {
      const { data } = await platformHealthAPI.check();
      setSummary(data.summary);
      setLastUpdated(data.checkedAt);
      await loadHealth();
    } catch { /* ignore */ }
    setChecking(false);
  };

  useEffect(() => { loadHealth(); }, []);

  const statusColor = (s: string) => {
    switch (s) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      case 'down': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Service Health</h1>
          {lastUpdated && <p className="text-sm text-gray-500">Last updated: {new Date(lastUpdated).toLocaleString()}</p>}
        </div>
        <button onClick={triggerCheck} disabled={checking} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50">
          {checking ? 'Checking...' : 'Run Health Check'}
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold">{summary.total}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{summary.healthy}</div>
            <div className="text-sm text-gray-500">Healthy</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{summary.unhealthy}</div>
            <div className="text-sm text-gray-500">Unhealthy</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold">{summary.totalMs}ms</div>
            <div className="text-sm text-gray-500">Total Time</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">PostgreSQL</h3>
            <span className={`px-2 py-1 rounded text-xs ${statusColor(dbStatus)}`}>{dbStatus}</span>
          </div>
          {dbLatency > 0 && <div className="text-xs text-gray-500">Latency: {dbLatency}ms</div>}
        </div>

        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-500">Loading...</div>
        ) : services.map((s) => (
          <div key={s.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">{s.name}</h3>
              <span className={`px-2 py-1 rounded text-xs ${statusColor(s.status)}`}>{s.status}</span>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              {s.uptime !== undefined && <div>Uptime: {formatUptime(s.uptime)}</div>}
              {s.latencyMs !== undefined && s.latencyMs >= 0 && <div>Latency: {s.latencyMs}ms</div>}
              {s.lastCheck && <div>Checked: {new Date(s.lastCheck).toLocaleString()}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
