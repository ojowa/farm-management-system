'use client';

import React, { useState, useEffect } from 'react';
import { platformAuditAPI } from '@/lib/api';

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data } = await platformAuditAPI.list({ page, limit: 50, action: action || undefined, entity: entity || undefined });
      setLogs(data.logs);
      setTotal(data.total);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadLogs(); }, [page, action, entity]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Audit Log ({total})</h1>
        <div className="flex gap-2">
          <input placeholder="Filter action..." value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="px-3 py-2 border rounded-md text-sm" />
          <input placeholder="Filter entity..." value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} className="px-3 py-2 border rounded-md text-sm" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Entity</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Entity ID</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No audit logs found</td></tr>
            ) : logs.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-600">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm">{l.userName}</td>
                <td className="px-4 py-3 text-sm"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{l.action}</span></td>
                <td className="px-4 py-3 text-sm text-gray-600">{l.entity}</td>
                <td className="px-4 py-3 text-sm text-gray-600 font-mono text-xs">{l.entityId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">Previous</button>
        <span className="text-sm text-gray-600">Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={logs.length < 50} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
