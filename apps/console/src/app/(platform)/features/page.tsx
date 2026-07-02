'use client';

import React, { useState, useEffect } from 'react';
import { platformFeaturesAPI } from '@/lib/api';

interface Feature {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  isEnabled: boolean;
  overrideCount: number;
}

export default function FeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadFeatures = async () => {
    setLoading(true);
    try {
      const { data } = await platformFeaturesAPI.list();
      setFeatures(data.features);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadFeatures(); }, []);

  const handleToggle = async (id: string, current: boolean) => {
    await platformFeaturesAPI.toggle(id, { isEnabled: !current });
    loadFeatures();
  };

  const filtered = filter === 'all' ? features : features.filter((f) => f.category === filter);
  const categories = [...new Set(features.map((f) => f.category))];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Feature Flags</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 border rounded-md">
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Feature</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Key</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Org Overrides</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No features found</td></tr>
            ) : filtered.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{f.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600 font-mono text-xs">{f.key}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">{f.category}</span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${f.isEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {f.isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{f.overrideCount}</td>
                <td className="px-4 py-3 text-sm">
                  <button
                    onClick={() => handleToggle(f.id, f.isEnabled)}
                    className={`px-3 py-1 rounded text-xs ${f.isEnabled ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                  >
                    {f.isEnabled ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
