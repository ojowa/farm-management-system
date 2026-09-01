'use client';

import React, { useEffect, useState, use, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { platformOrgsAPI, platformFeaturesAPI, platformOptionsAPI } from '@/lib/api';
import { toastError, toastSuccess, getErrorMessage } from '@/lib/toast';
import type { SelectOption } from '@farm/types';

const PLAN_BADGE: Record<string, string> = {
  default: 'bg-gray-100 text-gray-700',
};
const STATUS_BADGE: Record<string, string> = {
  default: 'bg-gray-100 text-gray-700',
};

export default function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'details' | 'users' | 'subscription' | 'modules'>('details');
  const [features, setFeatures] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [toggling, setToggling] = useState<string | null>(null);
  const [planOptions, setPlanOptions] = useState<SelectOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<SelectOption[]>([]);

  useEffect(() => { loadOrg(); loadOptions(); }, [id]);
  useEffect(() => { if (tab === 'modules') loadModules(); }, [tab, id]);

  async function loadOptions() {
    try {
      const [plansRes, statusesRes] = await Promise.all([
        platformOptionsAPI.plans(),
        platformOptionsAPI.statuses(),
      ]);
      setPlanOptions(plansRes.data.plans);
      setStatusOptions(statusesRes.data.statuses);
    } catch (err) { toastError(getErrorMessage(err)); }
  }

  async function loadOrg() {
    try {
      const { data } = await platformOrgsAPI.get(id);
      setOrg(data);
    } catch {
      router.push('/organizations');
    } finally {
      setLoading(false);
    }
  }

  async function loadModules() {
    try {
      const { data } = await platformFeaturesAPI.list();
      const modules = (data.features || []).filter((f: any) => f.category === 'module');
      setFeatures(modules);
      const ovMap: Record<string, boolean> = {};
      for (const mod of modules) {
        const { data: ovs } = await platformFeaturesAPI.overrides(mod.id);
        const orgOv = (ovs || []).find((o: any) => o.organizationId === id);
        if (orgOv) ovMap[mod.id] = orgOv.isEnabled;
      }
      setOverrides(ovMap);
    } catch (err) { toastError(getErrorMessage(err)); }
  }

  async function handleToggleModule(featureId: string) {
    setToggling(featureId);
    try {
      if (overrides[featureId] !== undefined) {
        await platformFeaturesAPI.deleteOverride(featureId, id);
        setOverrides((prev) => { const n = { ...prev }; delete n[featureId]; return n; });
        toastSuccess('Module override removed');
      } else {
        const feature = features.find((f) => f.id === featureId);
        await platformFeaturesAPI.setOverride(featureId, { organizationId: id, isEnabled: !feature?.isEnabled });
        setOverrides((prev) => ({ ...prev, [featureId]: !feature?.isEnabled }));
        toastSuccess('Module override set');
      }
    } catch (err) { toastError(getErrorMessage(err)); }
    setToggling(null);
  }

  async function handleSubscriptionUpdate(plan: string, status: string) {
    setSaving(true);
    try {
      await platformOrgsAPI.updateSubscription(id, { subscriptionPlan: plan, subscriptionStatus: status });
      await loadOrg();
      toastSuccess('Subscription updated');
    } catch (err) { toastError(getErrorMessage(err)); }
    finally { setSaving(false); }
  }

  async function handleToggleUser(userId: string) {
    try {
      await platformOrgsAPI.toggleUserActive(userId);
      await loadOrg();
      toastSuccess('User status toggled');
    } catch (err) { toastError(getErrorMessage(err)); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#16a34a] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm font-medium">Loading organization details...</p>
        </div>
      </div>
    );
  }

  if (!org) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/organizations" className="hover:text-[#16a34a] transition-colors">Organizations</Link>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium">{org.name}</span>
      </nav>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#16a34a]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[#16a34a] font-bold text-xl">{org.name.charAt(0)}</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
                <p className="text-sm text-gray-500">/{org.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${PLAN_BADGE[org.subscriptionPlan] || 'bg-gray-100 text-gray-700'}`}>
                {org.subscriptionPlan}
              </span>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${STATUS_BADGE[org.subscriptionStatus] || 'bg-gray-100 text-gray-700'}`}>
                {org.subscriptionStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100">
          <div className="flex">
            {(['details', 'users', 'subscription', 'modules'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors relative ${
                  tab === t
                    ? 'text-[#16a34a] bg-[#16a34a]/5'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  {t === 'details' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  {t === 'users' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                  {t === 'subscription' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  )}
                  {t === 'modules' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  )}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </span>
                {tab === t && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#16a34a]"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === 'details' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Organization Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { label: 'Name', value: org.name, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
              { label: 'Slug', value: `/${org.slug}`, icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
              { label: 'Email', value: org.email || '—', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
              { label: 'Phone', value: org.phone || '—', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
              { label: 'Website', value: org.website || '—', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
              { label: 'Industry', value: org.industry || '—', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
              { label: 'Total Users', value: org._count?.users ?? org.userCount ?? 0, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
              { label: 'Total Farms', value: org._count?.farms ?? org.farmCount ?? 0, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
              { label: 'Created', value: new Date(org.createdAt).toLocaleDateString(), icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
            ].map((item) => (
              <div key={item.label} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#16a34a]/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#16a34a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{String(item.value)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Organization Users</h2>
            <p className="text-sm text-gray-500 mt-1">Manage user access and permissions</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Login</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(!org.users || org.users.length === 0) ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-1">No users found</p>
                        <p className="text-sm text-gray-500">This organization has no users yet</p>
                      </div>
                    </td>
                  </tr>
                ) : org.users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#16a34a]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[#16a34a] font-semibold text-sm">
                            {[user.firstName, user.lastName].filter(Boolean).map((n: string) => n.charAt(0)).join('').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {[user.firstName, user.lastName].filter(Boolean).join(' ')}
                          </p>
                          <p className="text-xs text-gray-500">ID: {user.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                        {user.role?.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        user.isActive ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-red-100 text-red-700'
                      }`}>
                        {user.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleUser(user.id)}
                        className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                          user.isActive
                            ? 'text-red-600 bg-red-50 hover:bg-red-100'
                            : 'text-[#16a34a] bg-[#16a34a]/10 hover:bg-[#16a34a]/20'
                        }`}
                      >
                        {user.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'subscription' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-[#16a34a]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#16a34a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Current Subscription</h2>
                <p className="text-sm text-gray-500">Manage the organization's plan and status</p>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-8 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-4 py-2 rounded-lg text-lg font-bold ${PLAN_BADGE[org.subscriptionPlan] || 'bg-gray-100 text-gray-700'}`}>
                  {org.subscriptionPlan}
                </span>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span className={`inline-flex items-center px-4 py-2 rounded-lg text-lg font-bold ${STATUS_BADGE[org.subscriptionStatus] || 'bg-gray-100 text-gray-700'}`}>
                  {org.subscriptionStatus}
                </span>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#16a34a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Change Plan
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {planOptions.map((plan) => (
                    <button
                      key={plan.value}
                      onClick={() => handleSubscriptionUpdate(plan.value, org.subscriptionStatus)}
                      disabled={saving || org.subscriptionPlan === plan.value}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        org.subscriptionPlan === plan.value
                          ? 'border-[#16a34a] bg-[#16a34a]/5 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-[#16a34a]/50 hover:bg-gray-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="text-center">
                        <span className={`text-sm font-bold ${
                          org.subscriptionPlan === plan.value ? 'text-[#16a34a]' : 'text-gray-900'
                        }`}>
                          {plan.label}
                        </span>
                        {org.subscriptionPlan === plan.value && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#16a34a]/10 text-[#16a34a]">
                              Current
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#16a34a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Change Status
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {statusOptions.map((status) => (
                    <button
                      key={status.value}
                      onClick={() => handleSubscriptionUpdate(org.subscriptionPlan, status.value)}
                      disabled={saving || org.subscriptionStatus === status.value}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        org.subscriptionStatus === status.value
                          ? 'border-[#16a34a] bg-[#16a34a]/5 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-[#16a34a]/50 hover:bg-gray-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="text-center">
                        <span className={`text-sm font-bold ${
                          org.subscriptionStatus === status.value ? 'text-[#16a34a]' : 'text-gray-900'
                        }`}>
                          {status.label}
                        </span>
                        {org.subscriptionStatus === status.value && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#16a34a]/10 text-[#16a34a]">
                              Current
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {saving && (
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-[#16a34a] border-t-transparent rounded-full animate-spin"></div>
                Updating subscription...
              </div>
            )}
          </div>
        </div>
      )}
      {tab === 'modules' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Module Access</h2>
                <p className="text-sm text-gray-500 mt-1">Toggle which modules this organization can access. Overrides plan defaults.</p>
              </div>
              {Object.keys(overrides).length > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  {Object.keys(overrides).length} override{Object.keys(overrides).length !== 1 ? 's' : ''} active
                </span>
              )}
            </div>
          </div>
          <div className="p-6">
            {features.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No modules found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map((mod) => {
                  const hasOverride = overrides[mod.id] !== undefined;
                  const effectiveEnabled = hasOverride ? overrides[mod.id] : mod.isEnabled;
                  return (
                    <div
                      key={mod.id}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        effectiveEnabled
                          ? 'border-[#16a34a]/30 bg-[#16a34a]/5'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">{mod.name}</p>
                            {hasOverride && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                                OVERRIDE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{mod.key}</p>
                          {mod.description && (
                            <p className="text-xs text-gray-400 mt-1">{mod.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleToggleModule(mod.id)}
                          disabled={toggling === mod.id}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            effectiveEnabled ? 'bg-[#16a34a]' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              effectiveEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          effectiveEnabled ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {effectiveEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          Plan default: {mod.isEnabled ? 'On' : 'Off'}
                        </span>
                        {hasOverride && (
                          <span className="text-[10px] text-amber-600 font-medium">
                            · Override: {overrides[mod.id] ? 'On' : 'Off'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}