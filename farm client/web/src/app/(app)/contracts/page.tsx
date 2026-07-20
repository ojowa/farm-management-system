'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui';
import { contractsAPI } from '@/lib/api';

interface Contract {
  id: string;
  title: string;
  counterparty: string;
  type: string;
  status: string;
  startDate?: string;
  endDate?: string;
  value?: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  expired: 'bg-gray-100 text-gray-700',
  terminated: 'bg-red-100 text-red-700',
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await contractsAPI.list();
        setContracts(res.data.contracts || res.data || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return contracts;
    const q = search.toLowerCase();
    return contracts.filter((c) => c.title.toLowerCase().includes(q) || c.counterparty.toLowerCase().includes(q));
  }, [contracts, search]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contracts</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage supplier and buyer contracts</p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search contracts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading contracts...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No contracts found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Title</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Counterparty</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Type</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">End Date</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Value</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((contract) => (
                  <tr key={contract.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{contract.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{contract.counterparty}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{contract.type}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[contract.status] || 'bg-gray-100 text-gray-700'}`}>
                        {contract.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{contract.startDate ? new Date(contract.startDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{contract.endDate ? new Date(contract.endDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{contract.value ? `$${contract.value.toLocaleString()}` : '—'}</td>
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
