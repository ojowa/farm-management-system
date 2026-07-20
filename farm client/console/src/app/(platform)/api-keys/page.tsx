'use client';

import React, { useState, useEffect } from 'react';
import { platformApiKeysAPI } from '@/lib/api';
import { toastError, toastSuccess, getErrorMessage } from '@/lib/toast';
import type { PlatformApiKey } from '@farm/types';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<PlatformApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', service: '' });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const res = await platformApiKeysAPI.list();
      setKeys(res.data);
    } catch (err) {
      toastError(getErrorMessage(err));
    }
    setLoading(false);
  };

  useEffect(() => { loadKeys(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await platformApiKeysAPI.create(form);
      setNewKey(res.data.rawKey);
      toastSuccess('API key created — copy it now, it won\'t be shown again');
      setShowForm(false);
      setForm({ name: '', service: '' });
      loadKeys();
    } catch (err) {
      toastError(getErrorMessage(err));
    }
    setSaving(false);
  };

  const handleToggle = async (id: string) => {
    try {
      await platformApiKeysAPI.toggle(id);
      toastSuccess('Key toggled');
      loadKeys();
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this API key?')) return;
    try {
      await platformApiKeysAPI.delete(id);
      toastSuccess('Key deleted');
      loadKeys();
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const copyKey = () => {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="mt-1 text-sm text-gray-500">Manage API keys for service integrations</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setNewKey(null); }}
          className="px-4 py-2 bg-[#16a34a] text-white text-sm font-medium rounded-lg hover:bg-[#15803d]"
        >
          {showForm ? 'Cancel' : 'Create Key'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">New API Key</h2>
          <form onSubmit={handleCreate} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Production API Key"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Service</label>
              <input
                value={form.service}
                onChange={(e) => setForm({ ...form, service: e.target.value })}
                placeholder="e.g. mobile-app"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#16a34a] text-white text-sm font-medium rounded-lg hover:bg-[#15803d] disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
          </form>
        </div>
      )}

      {newKey && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-yellow-800 mb-2">Copy your API key — it won&apos;t be shown again</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-white rounded-lg border border-yellow-200 text-sm font-mono break-all">
              {newKey}
            </code>
            <button
              onClick={copyKey}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">All Keys</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Key</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Service</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Last Used</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">Loading...</td></tr>
              ) : keys.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">No API keys found</td></tr>
              ) : keys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{key.name}</p>
                    {key.user && (
                      <p className="text-xs text-gray-500">{key.user.firstName} {key.user.lastName}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                      {key.keyPrefix}...
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">{key.service}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      key.isActive ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {key.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggle(key.id)}
                        className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                          key.isActive
                            ? 'border-yellow-200 text-yellow-700 bg-yellow-50 hover:bg-yellow-100'
                            : 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
                        }`}
                      >
                        {key.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(key.id)}
                        className="px-3 py-1 text-xs font-medium rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
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
