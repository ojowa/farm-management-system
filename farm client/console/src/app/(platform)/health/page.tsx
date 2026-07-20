'use client';

import React, { useState, useEffect } from 'react';
import { platformHealthAPI } from '@/lib/api';
import { toastError, toastSuccess, getErrorMessage } from '@/lib/toast';
import type { PlatformServiceHealth, PlatformHealthSummary } from '@farm/types';

export default function HealthPage() {
  const [services, setServices] = useState<PlatformServiceHealth[]>([]);
  const [dbStatus, setDbStatus] = useState('unknown');
  const [dbLatency, setDbLatency] = useState(0);
  const [summary, setSummary] = useState<PlatformHealthSummary | null>(null);
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
    } catch (err) { toastError(getErrorMessage(err)); }
    setLoading(false);
  };

  const triggerCheck = async () => {
    setChecking(true);
    try {
      const { data } = await platformHealthAPI.check();
      setSummary(data.summary);
      setLastUpdated(data.checkedAt);
      toastSuccess('Health check completed');
      await loadHealth();
    } catch (err) { toastError(getErrorMessage(err)); }
    setChecking(false);
  };

  useEffect(() => { loadHealth(); }, []);

  const statusColor = (s: string) => {
    switch (s) {
      case 'healthy': return 'bg-[#16a34a]/10 text-[#16a34a]';
      case 'degraded': return 'bg-amber-50 text-amber-700';
      case 'down': return 'bg-red-50 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const statusDot = (s: string) => {
    switch (s) {
      case 'healthy': return 'bg-[#16a34a]';
      case 'degraded': return 'bg-amber-500';
      case 'down': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#16a34a] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Service Health</h1>
              {lastUpdated && (
                <p className="text-sm text-gray-500">
                  Last updated {new Date(lastUpdated).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={triggerCheck}
            disabled={checking}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#16a34a] text-white text-sm font-medium rounded-lg hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {checking ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Run Health Check
              </>
            )}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Services</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{summary?.total ?? '--'}</p>
              </div>
              <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Healthy</p>
                <p className="text-3xl font-bold text-[#16a34a] mt-1">{summary?.healthy ?? '--'}</p>
              </div>
              <div className="w-11 h-11 rounded-lg bg-[#16a34a]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#16a34a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Unhealthy</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{summary?.unhealthy ?? '--'}</p>
              </div>
              <div className="w-11 h-11 rounded-lg bg-red-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Response Time</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{summary?.totalMs ? `${summary.totalMs}ms` : '--'}</p>
              </div>
              <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Database Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">PostgreSQL</h3>
                  <p className="text-xs text-gray-500">Primary Database</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${statusDot(dbStatus)}`} />
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(dbStatus)}`}>
                  {dbStatus}
                </span>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Latency</span>
                <span className="font-medium text-gray-900">{dbLatency > 0 ? `${dbLatency}ms` : '--'}</span>
              </div>
            </div>
          </div>

          {/* Service Cards */}
          {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#16a34a] border-t-transparent rounded-full animate-spin mb-3" />
              <span className="text-sm text-gray-500">Loading services...</span>
            </div>
          ) : services.map((s) => (
            <div key={s.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{s.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${statusDot(s.status)}`} />
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(s.status)}`}>
                    {s.status}
                  </span>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4 space-y-3">
                {s.latencyMs !== undefined && s.latencyMs >= 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Latency</span>
                    <span className="font-medium text-gray-900">{s.latencyMs}ms</span>
                  </div>
                )}
                {s.uptime !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Uptime</span>
                    <span className="font-medium text-gray-900">{formatUptime(s.uptime)}</span>
                  </div>
                )}
                {s.lastCheck && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Last Checked</span>
                    <span className="text-gray-700">{new Date(s.lastCheck).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
