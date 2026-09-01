'use client';

import React, { useState, useEffect } from 'react';
import { platformClient } from '@/lib/api';
import { toastError, toastSuccess, getErrorMessage } from '@/lib/toast';
import type { PlatformConfigItem } from '@farm/types';

export default function ConfigPage() {
  const [configs, setConfigs] = useState<PlatformConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [newConfig, setNewConfig] = useState({ key: '', value: '', description: '', category: '' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await platformClient.get('/platform-config');
      setConfigs(res.data.configs || []);
    } catch (err) {
      toastError(getErrorMessage(err));
    }
    setLoading(false);
  };

  useEffect(() => { loadConfigs(); }, []);

  const handleSave = async (key: string) => {
    const value = editing[key];
    if (value === undefined) return;
    setSaving(true);
    try {
      await platformClient.patch('/platform-config', { configs: [{ key, value }] });
      toastSuccess(`Updated ${key}`);
      setEditing((prev) => { const n = { ...prev }; delete n[key]; return n; });
      loadConfigs();
    } catch (err) {
      toastError(getErrorMessage(err));
    }
    setSaving(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await platformClient.patch('/platform-config', { configs: [newConfig] });
      toastSuccess('Config created');
      setShowForm(false);
      setNewConfig({ key: '', value: '', description: '', category: '' });
      loadConfigs();
    } catch (err) {
      toastError(getErrorMessage(err));
    }
    setSaving(false);
  };

  const categories = [...new Set(configs.map((c) => c.category || 'general'))].sort();
  const filtered = configs.filter((c) =>
    !filter || c.key.toLowerCase().includes(filter.toLowerCase()) || (c.category || 'general').toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Config</h1>
          <p className="mt-1 text-sm text-gray-500">Manage platform-wide configuration key-value pairs</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#16a34a] text-white text-sm font-medium rounded-lg hover:bg-[#15803d]"
        >
          {showForm ? 'Cancel' : 'Add Config'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">New Config Entry</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Key</label>
              <input
                value={newConfig.key}
                onChange={(e) => setNewConfig({ ...newConfig, key: e.target.value })}
                placeholder="e.g. smtp_host"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
              <input
                value={newConfig.value}
                onChange={(e) => setNewConfig({ ...newConfig, value: e.target.value })}
                placeholder="smtp.example.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <input
                value={newConfig.category}
                onChange={(e) => setNewConfig({ ...newConfig, category: e.target.value })}
                placeholder="e.g. email"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <input
                value={newConfig.description}
                onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                placeholder="What this config does"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-[#16a34a] text-white text-sm font-medium rounded-lg hover:bg-[#15803d] disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-4 flex items-center gap-4">
        <div className="flex-1 relative">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by key or category..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]"
          />
        </div>
        <span className="text-xs text-gray-500">{filtered.length} config{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {categories.map((cat) => {
        const catConfigs = filtered.filter((c) => (c.category || 'general') === cat);
        if (catConfigs.length === 0) return null;
        return (
          <div key={cat} className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{cat}</h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {catConfigs.map((config) => (
                  <div key={config.key} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm font-mono font-medium text-gray-900">{config.key}</code>
                        </div>
                        {config.description && (
                          <p className="text-xs text-gray-500 mb-2">{config.description}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Last updated:</span>
                          <span className="text-xs text-gray-500">{new Date(config.updatedAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <input
                          value={editing[config.key] !== undefined ? editing[config.key] : config.value}
                          onChange={(e) => setEditing({ ...editing, [config.key]: e.target.value })}
                          className="w-48 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]"
                        />
                        {editing[config.key] !== undefined && editing[config.key] !== config.value && (
                          <button
                            onClick={() => handleSave(config.key)}
                            disabled={saving}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-[#16a34a] rounded-lg hover:bg-[#15803d] disabled:opacity-50"
                          >
                            Save
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
