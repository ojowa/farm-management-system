'use client';

import React, { useState, useEffect } from 'react';
import { platformBroadcastsAPI } from '@/lib/api';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  type: string;
  isActive: boolean;
  startsAt: string;
  expiresAt: string | null;
  createdAt: string;
}

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'INFO' });

  const loadBroadcasts = async () => {
    setLoading(true);
    try {
      const { data } = await platformBroadcastsAPI.list();
      setBroadcasts(data.broadcasts);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadBroadcasts(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await platformBroadcastsAPI.create(form);
    setShowForm(false);
    setForm({ title: '', message: '', type: 'INFO' });
    loadBroadcasts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this broadcast?')) return;
    await platformBroadcastsAPI.delete(id);
    loadBroadcasts();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Broadcasts</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm">
          {showForm ? 'Cancel' : '+ New Broadcast'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg shadow p-6 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border rounded-md" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full px-3 py-2 border rounded-md" rows={3} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="px-3 py-2 border rounded-md">
              <option value="INFO">Info</option>
              <option value="WARNING">Warning</option>
              <option value="CRITICAL">Critical</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md text-sm">Create Broadcast</button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Title</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Created</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : broadcasts.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No broadcasts</td></tr>
            ) : broadcasts.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{b.title}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${
                    b.type === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                    b.type === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                    b.type === 'MAINTENANCE' ? 'bg-purple-100 text-purple-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>{b.type}</span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${b.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {b.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{new Date(b.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm">
                  <button onClick={() => handleDelete(b.id)} className="text-red-600 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
