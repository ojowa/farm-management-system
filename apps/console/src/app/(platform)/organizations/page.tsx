'use client';

import React, { useState, useEffect } from 'react';
import { platformOrgsAPI } from '@/lib/api';

interface Org {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
  userCount: number;
  farmCount: number;
  createdAt: string;
}

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadOrgs = async () => {
    setLoading(true);
    try {
      const { data } = await platformOrgsAPI.list({ page, limit: 20, search: search || undefined });
      setOrgs(data.organizations);
      setTotal(data.total);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadOrgs(); }, [page, search]);

  const handleSuspend = async (id: string) => {
    if (!confirm('Suspend this organization? All users will be logged out.')) return;
    await platformOrgsAPI.suspend(id);
    loadOrgs();
  };

  const handleActivate = async (id: string) => {
    await platformOrgsAPI.activate(id);
    loadOrgs();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Organizations ({total})</h1>
        <input
          type="text"
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-2 border rounded-md w-64"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Users</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Farms</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : orgs.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No organizations found</td></tr>
            ) : orgs.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{o.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{o.email || '-'}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{o.subscriptionPlan}</span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${
                    o.subscriptionStatus === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    o.subscriptionStatus === 'SUSPENDED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {o.subscriptionStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">{o.userCount}</td>
                <td className="px-4 py-3 text-sm">{o.farmCount}</td>
                <td className="px-4 py-3 text-sm space-x-2">
                  {o.subscriptionStatus === 'SUSPENDED' ? (
                    <button onClick={() => handleActivate(o.id)} className="text-green-600 hover:underline text-xs">Activate</button>
                  ) : (
                    <button onClick={() => handleSuspend(o.id)} className="text-red-600 hover:underline text-xs">Suspend</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">Previous</button>
        <span className="text-sm text-gray-600">Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={orgs.length < 20} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
