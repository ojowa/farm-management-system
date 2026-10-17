'use client';

import React, { useState, useEffect } from 'react';
import { platformSubscriptionsAPI } from '@/lib/api';
import { toastError, toastSuccess, getErrorMessage } from '@/lib/toast';
import { formatMoney } from '@/lib/utils';
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

// Paystack supports these settlement currencies; the console picks one per
// plan (price displays, charges and Paystack plans all honour it).
const CURRENCY_OPTIONS = ['USD', 'NGN', 'ZAR', 'GHS', 'KES'];

const BILLING_CYCLE_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly (auto-renews)' },
  { value: 'YEARLY', label: 'Yearly (auto-renews)' },
  { value: 'NONE', label: 'One-time (no renewal)' },
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

/** `/month`, `/year`, `one-time` or `free` — what the price buys. */
function priceSuffix(price: number, billingCycle: string): string {
  if (!(price > 0)) return ' free';
  const cycle = String(billingCycle || 'MONTHLY').toUpperCase();
  if (cycle === 'NONE') return ' one-time';
  return cycle === 'YEARLY' ? '/year' : '/month';
}

type PlanForm = {
  name: string;
  displayName: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: string;
  maxUsers: number;
  maxFarms: number;
  maxStorage: number;
  modules: string[];
  perks: string[];
};

const EMPTY_FORM: PlanForm = {
  name: '',
  displayName: '',
  description: '',
  price: 0,
  currency: 'USD',
  billingCycle: 'MONTHLY',
  maxUsers: 5,
  maxFarms: 1,
  maxStorage: 100,
  modules: [...DEFAULT_MODULES],
  perks: [],
};

function PlanFormFields({
  form,
  setForm,
  nameReadOnly,
}: {
  form: PlanForm;
  setForm: React.Dispatch<React.SetStateAction<PlanForm>>;
  nameReadOnly?: boolean;
}) {
  const inputCls =
    'block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] sm:text-sm';
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name (key)</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-500`}
            required
            disabled={nameReadOnly}
          />
          {nameReadOnly && (
            <p className="text-xs text-gray-400 mt-1">
              The key is immutable — organizations reference it by name.
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
          <input
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            className={inputCls}
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className={inputCls}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <select
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className={inputCls}
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle</label>
          <select
            value={form.billingCycle}
            onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
            className={inputCls}
          >
            {BILLING_CYCLE_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
          <input
            type="number"
            value={form.maxUsers}
            onChange={(e) => setForm({ ...form, maxUsers: Number(e.target.value) })}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Farms</label>
          <input
            type="number"
            value={form.maxFarms}
            onChange={(e) => setForm({ ...form, maxFarms: Number(e.target.value) })}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Storage (MB)</label>
          <input
            type="number"
            value={form.maxStorage}
            onChange={(e) => setForm({ ...form, maxStorage: Number(e.target.value) })}
            className={inputCls}
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
    </>
  );
}

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<PlatformSubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PlatformSubscriptionPlan | null>(null);
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM);

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
      setForm({ ...EMPTY_FORM, modules: [...DEFAULT_MODULES], perks: [] });
      toastSuccess('Plan created');
      loadPlans();
    } catch (err) { toastError(getErrorMessage(err)); }
  };

  const openEdit = (p: PlatformSubscriptionPlan) => {
    setEditing(p);
    setForm({
      name: p.name,
      displayName: p.displayName ?? p.name,
      description: p.description ?? '',
      price: Number(p.price),
      currency: p.currency || 'USD',
      billingCycle: p.billingCycle || 'MONTHLY',
      maxUsers: p.maxUsers ?? 5,
      maxFarms: p.maxFarms ?? 1,
      maxStorage: p.maxStorage ?? 100,
      modules: p.features?.modules?.length ? [...p.features.modules] : [...DEFAULT_MODULES],
      perks: p.features?.perks ? [...p.features.perks] : [],
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      const modules = form.modules.length > 0 ? form.modules : ['farm'];
      // `name` (the key) is intentionally not sent — orgs reference the plan
      // by it, and price/currency/cycle changes clear the cached Paystack
      // plan code server-side so the next checkout re-creates it.
      await platformSubscriptionsAPI.updatePlan(editing.id, {
        displayName: form.displayName,
        description: form.description,
        price: form.price,
        currency: form.currency,
        billingCycle: form.billingCycle,
        maxUsers: form.maxUsers,
        maxFarms: form.maxFarms,
        maxStorage: form.maxStorage,
        features: {
          modules,
          farmTypes: farmTypesForModules(modules),
          ...(form.perks.length > 0 ? { perks: form.perks } : {}),
        },
      });
      setEditing(null);
      toastSuccess('Plan updated');
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
              <PlanFormFields form={form} setForm={setForm} />
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

        <Dialog
          open={!!editing}
          onOpenChange={(open) => { if (!open) setEditing(null); }}
          title={editing ? `Edit ${editing.displayName || editing.name}` : 'Edit Plan'}
        >
            <form onSubmit={handleUpdate} className="space-y-4">
              <PlanFormFields form={form} setForm={setForm} nameReadOnly />
              {Number(form.price) > 0 && form.billingCycle !== 'NONE' && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Editing price, currency or billing cycle unlinks the cached Paystack plan — it is
                  re-created automatically at the next checkout.
                </p>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white bg-[#16a34a] hover:bg-[#15803d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#16a34a] transition-colors"
                >
                  Save Changes
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
                <div className="mb-1">
                  <span className="text-3xl font-bold text-[#16a34a]">{formatMoney(Number(p.price), p.currency)}</span>
                  <span className="text-sm text-gray-500">{priceSuffix(Number(p.price), p.billingCycle)}</span>
                </div>
                {p.paystackPlanCode ? (
                  <div className="mb-4" title={p.paystackPlanCode}>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-100">
                      Paystack billing linked
                    </span>
                  </div>
                ) : (
                  <div className="mb-4" />
                )}
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
                    {p.organizationCount ?? 0} organization(s)
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#16a34a] transition-colors"
                  >
                    <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-red-300 text-sm font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  >
                    <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
