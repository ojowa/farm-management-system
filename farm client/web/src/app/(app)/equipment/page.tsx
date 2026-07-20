'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui';
import { equipmentAPI } from '@/lib/api';

interface Equipment {
  id: string;
  name: string;
  type: string;
  status: string;
  purchaseDate?: string;
  lastMaintenance?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
  retired: 'bg-red-100 text-red-700',
  available: 'bg-blue-100 text-blue-700',
};

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await equipmentAPI.list();
        setEquipment(res.data.equipment || res.data || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return equipment;
    const q = search.toLowerCase();
    return equipment.filter((e) => e.name.toLowerCase().includes(q) || e.type.toLowerCase().includes(q));
  }, [equipment, search]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Equipment</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your farm equipment</p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search equipment..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading equipment...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No equipment found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Type</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Purchase Date</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Last Maintenance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.type}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-700'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.lastMaintenance ? new Date(item.lastMaintenance).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
