'use client';

import React, { useState, useEffect } from 'react';
import { platformSubscriptionsAPI } from '@/lib/api';

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  price: number;
  currency: string;
  billingCycle: string;
  maxUsers: number;
  maxFarms: number;
  maxStorage: number;
  isActive: boolean;
  organizationCount: number;
}

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', displayName: '', description: '', price: 0, maxUsers: 5, maxFarms: 1, maxStorage: 100 });

  const loadPlans = async () => {
    setLoading(true);
    try {
      const { data } = await platformSubscriptionsAPI.listPlans();
      setPlans(data.plans);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadPlans(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await platformSubscriptionsAPI.createPlan(form);
    setShowForm(false);
    setForm({ name: '', displayName: '', description: '', price: 0, maxUsers: 5, maxFarms: 1, maxStorage: 100 });
    loadPlans();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this plan?')) return;
    await platformSubscriptionsAPI.deletePlan(id);
    loadPlans();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Subscription Plans</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm">
          {showForm ? 'Cancel' : '+ New Plan'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg shadow p-6 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name (key)</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-md" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="w-full px-3 py-2 border rounded-md" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
              <input type="number" value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Farms</label>
              <input type="number" value={form.maxFarms} onChange={(e) => setForm({ ...form, maxFarms: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Storage (MB)</label>
              <input type="number" value={form.maxStorage} onChange={(e) => setForm({ ...form, maxStorage: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-md" />
            </div>
          </div>
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md text-sm">Create Plan</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-500">Loading...</div>
        ) : plans.map((p) => (
          <div key={p.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">{p.displayName}</h3>
              <span className={`text-xs px-2 py-1 rounded ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {p.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {p.description && <p className="text-sm text-gray-600 mb-4">{p.description}</p>}
            <div className="text-3xl font-bold text-green-600 mb-4">
              ${Number(p.price)}<span className="text-sm text-gray-500">/{p.billingCycle === 'NONE' ? 'forever' : p.billingCycle.toLowerCase()}</span>
            </div>
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div>Up to {p.maxUsers} users</div>
              <div>Up to {p.maxFarms} farms</div>
              <div>{p.maxStorage}MB storage</div>
              <div>{p.organizationCount} organization(s) using</div>
            </div>
            <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline text-xs">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
