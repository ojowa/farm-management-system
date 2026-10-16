'use client';

import React, { useState, useEffect } from 'react';
import { platformSubscriptionsAPI } from '@/lib/api';
import { toastError, toastSuccess, getErrorMessage } from '@/lib/toast';
import { Dialog } from '@/components/ui/dialog';
import type { PlatformSubscriptionPlan } from '@/lib/types';

// Plan modules the platform can sell. Keep in lockstep with the planData in
// the server's prisma/seed.ts — farmTypes are DERIVED from this selection
// server-side (crop→CROP, livestock→LIVESTOCK + DAIRY, poultry→POULTRY,
// aquaculture→AQUACULTURE), so the two lists can never contradict.
const MODULE_OPTIONS = [
  { key: 'farm', label: 'Farm' },
  { key: 'crop', label: 'Crop' },
  { key: 'livestock', label: 'Livestock' },
  { key: 'poultry', label: 'Poultry' },
  { key: 'aquaculture', label: 'Aquaculture' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'finance', label: 'Finance' },
  { key: 'worker', label: 'Workers' },
  { key: 'communication', label: 'Communication' },
  { key: 'reporting', label: 'Reporting' },
  { key: 'notification', label: 'Notifications' },
  { key: 'hr', label: 'HR / Leave' },
];

const PERK_OPTIONS = [
  { key: 'api_access', label: 'API access' },
  { key: 'priority_support', label: 'Priority support' },
];

// Mirror of farmTypesForModules in the server's database features module.
const FARM_TYPES = ['CROP', 'LIVESTOCK', 'POULTRY', 'DAIRY', 'AQUACULTURE'];
const FARM_TYPE_MODULE: Record<string, string | null> = {
  CROP: 'crop',
  LIVESTOCK: 'livestock',
  POULTRY: 'poultry',
  DAIRY: 'livestock',
  AQUACULTURE: null,
};

function farmTypesForModules(modules: string[]): string[] {
  return FARM_TYPES.filter((type) => {
    const backing = FARM_TYPE_MODULE[type];
    return backing === null ? modules.includes('farm') : modules.includes(backing);
  });
}

const DEFAULT_MODULES = ['farm', 'crop', 'worker', 'communication', 'reporting', 'notification', 'hr'];

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<PlatformSubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', displayName: '', description: '', price: 0, maxUsers: 5, maxFarms: 1, maxStorage: 100, modules: [...DEFAULT_MODULES] as string[], perks: [] as string[] });

  const loadPlans = async () => {
    setLoading(true);
    try {
      const { data } = await platformSubscriptionsAPI.listPlans();
      setPlans(data.plans);
    } catch (err) { toastError(getErrorMessage(err)); }
    setLoading(false);
  };

  useEffect(() => { loadPlans(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // farmTypes are derived from modules — mirrors the server's
      // normalizePlanFeatures, which re-derives server-side regardless.
      const modules = form.modules.length > 0 ? form.modules : ['farm'];
      await platformSubscriptionsAPI.createPlan({
        ...form,
        features: {
          modules,
          farmTypes: farmTypesForModules(modules),
          ...(form.perks.length > 0 ? { perks: form.perks } : {}),
        },
      });
      setShowForm(false);
      setForm({ name: '', displayName: '', description: '', price: 0, maxUsers: 5, maxFarms: 1, maxStorage: 100, modules: [...DEFAULT_MODULES], perks: [] });
      toastSuccess('Plan created');
      loadPlans();
    } catch (err) { toastError(getErrorMessage(err)); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this plan?')) return;
    try {
      await platformSubscriptionsAPI.deletePlan(id);
      toastSuccess('Plan deleted');
      loadPlans();
    } catch (err) { toastError(getErrorMessage(err)); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
            <p className="text-sm text-gray-500 mt-1">{plans.length} plans available</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white bg-[#16a34a] hover:bg-[#15803d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#16a34a] transition-colors"
          >
            {showForm ? (
              <>
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </>
            ) : (
              <>
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Plan
              </>
            )}
          </button>
        </div>

        <Dialog open={showForm} onOpenChange={setShowForm} title="Create New Plan">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name (key)</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                  <input
                    value={form.displayName}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] sm:text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] sm:text-sm"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
                  <input
                    type="number"
                    value={form.maxUsers}
                    onChange={(e) => setForm({ ...form, maxUsers: Number(e.target.value) })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Farms</label>
                  <input
                    type="number"
                    value={form.maxFarms}
                    onChange={(e) => setForm({ ...form, maxFarms: Number(e.target.value) })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Storage (MB)</label>
                  <input
                    type="number"
                    value={form.maxStorage}
                    onChange={(e) => setForm({ ...form, maxStorage: Number(e.target.value) })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modules</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MODULE_OPTIONS.map((m) => (
                    <label key={m.key} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.modules.includes(m.key)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            modules: e.target.checked ? [...f.modules, m.key] : f.modules.filter((k) => k !== m.key),
                          }))
                        }
                        className="rounded border-gray-300 text-[#16a34a] focus:ring-[#16a34a]"
                      />
                      {m.label}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Allowed farm types (derived from modules):{' '}
                  {(() => {
                    const types = farmTypesForModules(form.modules);
                    return types.length > 0 ? types.join(', ') : 'none yet — select modules that back farm types';
                  })()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perks</label>
                <div className="flex gap-4">
                  {PERK_OPTIONS.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.perks.includes(p.key)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            perks: e.target.checked ? [...f.perks, p.key] : f.perks.filter((k) => k !== p.key),
                          }))
                        }
                        className="rounded border-gray-300 text-[#16a34a] focus:ring-[#16a34a]"
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white bg-[#16a34a] hover:bg-[#15803d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#16a34a] transition-colors"
                >
                  Create Plan
                </button>
              </div>
            </form>
        </Dialog>

        {loading ? (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-12">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16a34a] mb-3"></div>
              <span className="text-sm text-gray-500">Loading plans...</span>
            </div>
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-12">
            <div className="flex flex-col items-center">
              <svg className="h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-sm text-gray-500">No plans created yet</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((p) => (
              <div key={p.id} className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{p.displayName}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {p.description && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{p.description}</p>
                )}
                <div className="mb-4">
                  <span className="text-3xl font-bold text-[#16a34a]">${Number(p.price)}</span>
                  <span className="text-sm text-gray-500">/{p.billingCycle === 'NONE' ? 'forever' : p.billingCycle.toLowerCase()}</span>
                </div>
                <div className="space-y-2 text-sm text-gray-600 mb-4 flex-1">
                  <div className="flex items-center">
                    <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Up to {p.maxUsers} users
                  </div>
                  <div className="flex items-center">
                    <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Up to {p.maxFarms} farms
                  </div>
                  <div className="flex items-center">
                    <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                    {p.maxStorage}MB storage
                  </div>
                  <div className="flex items-center">
                    <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {p.organizationCount} organization(s)
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="w-full inline-flex items-center justify-center px-3 py-2 border border-red-300 text-sm font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}