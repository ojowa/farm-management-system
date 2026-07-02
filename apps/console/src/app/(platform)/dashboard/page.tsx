'use client';

import React, { useState, useEffect } from 'react';
import { platformOrgsAPI, platformUsersAPI, platformHealthAPI } from '@/lib/api';

interface Stats {
  totalOrgs: number;
  totalUsers: number;
  activeOrgs: number;
  suspendedOrgs: number;
}

interface HealthStatus {
  name: string;
  status: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalOrgs: 0, totalUsers: 0, activeOrgs: 0, suspendedOrgs: 0 });
  const [health, setHealth] = useState<HealthStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      platformOrgsAPI.list({ limit: 1 }).catch(() => ({ data: { total: 0 } })),
      platformUsersAPI.list({ limit: 1 }).catch(() => ({ data: { total: 0 } })),
      platformHealthAPI.status().catch(() => ({ data: { services: [] } })),
    ]).then(([orgRes, userRes, healthRes]) => {
      setStats({
        totalOrgs: orgRes.data.total || 0,
        totalUsers: userRes.data.total || 0,
        activeOrgs: 0,
        suspendedOrgs: 0,
      });
      setHealth(healthRes.data.services || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading dashboard...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Organizations" value={stats.totalOrgs} color="blue" />
        <StatCard title="Total Users" value={stats.totalUsers} color="green" />
        <StatCard title="Active Orgs" value={stats.activeOrgs} color="emerald" />
        <StatCard title="Suspended Orgs" value={stats.suspendedOrgs} color="red" />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Service Health</h2>
        <div className="space-y-2">
          {health.length === 0 && <p className="text-gray-500">No services monitored yet.</p>}
          {health.map((s) => (
            <div key={s.name} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm font-medium">{s.name}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                s.status === 'healthy' ? 'bg-green-100 text-green-800' :
                s.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className={`rounded-lg p-4 ${colors[color] || 'bg-gray-50 text-gray-600'}`}>
      <div className="text-sm opacity-75">{title}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}
