'use client';

import React, { useState, useEffect } from 'react';
import { platformBroadcastsAPI, platformOptionsAPI } from '@/lib/api';
import { toastError, toastSuccess, getErrorMessage } from '@/lib/toast';
import type { PlatformBroadcast, SelectOption } from '@farm/types';

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<PlatformBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'INFO' });
  const [typeOptions, setTypeOptions] = useState<SelectOption[]>([]);

  const loadBroadcasts = async () => {
    setLoading(true);
    try {
      const { data } = await platformBroadcastsAPI.list();
      setBroadcasts(data.broadcasts);
    } catch (err) { toastError(getErrorMessage(err)); }
    setLoading(false);
  };

  useEffect(() => { loadBroadcasts(); loadOptions(); }, []);

  const loadOptions = async () => {
    try {
      const { data } = await platformOptionsAPI.broadcastTypes();
      setTypeOptions(data.types);
      if (data.types.length > 0 && !form.type) {
        setForm((prev) => ({ ...prev, type: data.types[0].value }));
      }
    } catch (err) { toastError(getErrorMessage(err)); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await platformBroadcastsAPI.create(form);
      setShowForm(false);
      setForm({ title: '', message: '', type: 'INFO' });
      toastSuccess('Broadcast created');
      loadBroadcasts();
    } catch (err) { toastError(getErrorMessage(err)); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this broadcast?')) return;
    try {
      await platformBroadcastsAPI.delete(id);
      toastSuccess('Broadcast deleted');
      loadBroadcasts();
    } catch (err) { toastError(getErrorMessage(err)); }
  };

  const typeStyles: Record<string, string> = {
    INFO: 'bg-blue-50 text-blue-700',
    WARNING: 'bg-amber-50 text-amber-700',
    CRITICAL: 'bg-red-50 text-red-700',
    MAINTENANCE: 'bg-purple-50 text-purple-700',
  };

  const getTypeStyle = (type: string) => typeStyles[type] || 'bg-gray-50 text-gray-700';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#16a34a] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Broadcasts</h1>
              <p className="text-sm text-gray-500">{broadcasts.length} total broadcasts</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#16a34a] text-white text-sm font-medium rounded-lg hover:bg-[#15803d] transition-colors shadow-sm"
          >
            {showForm ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Broadcast
              </>
            )}
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-[#16a34a]/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#16a34a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Create New Broadcast</h2>
            </div>
            <form onSubmit={handleCreate} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a] transition-colors"
                    placeholder="Enter broadcast title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a] transition-colors bg-white"
                  >
                    {typeOptions.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a] transition-colors resize-none"
                  rows={3}
                  placeholder="Enter broadcast message"
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#16a34a] text-white text-sm font-medium rounded-lg hover:bg-[#15803d] transition-colors shadow-sm"
                >
                  Create Broadcast
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-[#16a34a] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-gray-500">Loading broadcasts...</span>
                    </div>
                  </td>
                </tr>
              ) : broadcasts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">No broadcasts</p>
                        <p className="text-xs text-gray-500 mt-1">Create your first broadcast to get started</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : broadcasts.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{b.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{b.message}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getTypeStyle(b.type)}`}>
                      {b.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${b.isActive ? 'bg-[#16a34a]' : 'bg-gray-400'}`} />
                      <span className={`text-sm font-medium ${b.isActive ? 'text-[#16a34a]' : 'text-gray-500'}`}>
                        {b.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{new Date(b.createdAt).toLocaleDateString()}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
