'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { platformOrgsAPI, platformOptionsAPI } from '@/lib/api';
import { toastError, toastSuccess, getErrorMessage } from '@/lib/toast';
import type { PlatformOrganization, SelectOption } from '@farm/types';

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<PlatformOrganization[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [planOptions, setPlanOptions] = useState<SelectOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<SelectOption[]>([]);

  const loadOrgs = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20, search: search || undefined };
      if (planFilter) params.subscriptionPlan = planFilter;
      if (statusFilter) params.subscriptionStatus = statusFilter;
      const { data } = await platformOrgsAPI.list(params);
      setOrgs(data.organizations);
      setTotal(data.total);
    } catch (err) { toastError(getErrorMessage(err)); }
    setLoading(false);
  };

  const loadOptions = async () => {
    try {
      const [plansRes, statusesRes] = await Promise.all([
        platformOptionsAPI.plans(),
        platformOptionsAPI.statuses(),
      ]);
      setPlanOptions(plansRes.data.plans);
      setStatusOptions(statusesRes.data.statuses);
    } catch (err) { toastError(getErrorMessage(err)); }
  };

  useEffect(() => { loadOptions(); }, []);
  useEffect(() => { loadOrgs(); }, [page, search, planFilter, statusFilter]);

  const handleSuspend = async (id: string) => {
    if (!confirm('Suspend this organization? All users will be logged out.')) return;
    try {
      await platformOrgsAPI.suspend(id);
      toastSuccess('Organization suspended');
      loadOrgs();
    } catch (err) { toastError(getErrorMessage(err)); }
  };

  const handleActivate = async (id: string) => {
    try {
      await platformOrgsAPI.activate(id);
      toastSuccess('Organization activated');
      loadOrgs();
    } catch (err) { toastError(getErrorMessage(err)); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
        <p className="mt-1 text-sm text-gray-500">Manage and monitor all organizations on your platform</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search organizations..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a] transition-colors"
              />
            </div>
            <div className="flex items-center gap-3">
              <select
                value={planFilter}
                onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a] transition-colors"
              >
                <option value="">All Plans</option>
                {planOptions.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a] transition-colors"
              >
                <option value="">All Statuses</option>
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Organization</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Users</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Farms</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 border-4 border-[#16a34a] border-t-transparent rounded-full animate-spin mb-3"></div>
                      <p className="text-sm text-gray-500">Loading organizations...</p>
                    </div>
                  </td>
                </tr>
              ) : orgs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">No organizations found</p>
                      <p className="text-sm text-gray-500">Try adjusting your search or filter criteria</p>
                    </div>
                  </td>
                </tr>
              ) : orgs.map((o) => (
                <tr 
                  key={o.id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/organizations/${o.id}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#16a34a]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#16a34a] font-semibold text-sm">{o.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{o.name}</p>
                        <p className="text-xs text-gray-500">/{o.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{o.email || '—'}</td>
                  <td className="px-6 py-4">
                    <PlanBadge plan={o.subscriptionPlan} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={o.subscriptionStatus} />
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{o.userCount}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{o.farmCount}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/organizations/${o.id}`}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-[#16a34a] bg-[#16a34a]/10 rounded-full hover:bg-[#16a34a]/20 transition-colors"
                      >
                        View
                      </Link>
                      {o.subscriptionStatus === 'SUSPENDED' ? (
                        <button
                          onClick={() => handleActivate(o.id)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-[#16a34a] bg-[#16a34a]/10 rounded-full hover:bg-[#16a34a]/20 transition-colors"
                        >
                          Activate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspend(o.id)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-full hover:bg-red-100 transition-colors"
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="px-6 py-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing <span className="font-medium text-gray-900">{(page - 1) * 20 + 1}</span> to{' '}
                <span className="font-medium text-gray-900">{Math.min(page * 20, total)}</span> of{' '}
                <span className="font-medium text-gray-900">{total}</span> organizations
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                <span className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg">
                  Page {page} of {totalPages || 1}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={orgs.length < 20}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const styleMap: Record<string, string> = {
    FREE: 'bg-gray-100 text-gray-700',
    STARTER: 'bg-blue-100 text-blue-700',
    PRO: 'bg-[#16a34a]/10 text-[#16a34a]',
    ENTERPRISE: 'bg-purple-100 text-purple-700',
  };
  const fallbackColors = ['bg-gray-100 text-gray-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700'];
  const hash = plan.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const style = styleMap[plan] || fallbackColors[hash % fallbackColors.length];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${style}`}>
      {plan}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styleMap: Record<string, string> = {
    TRIAL: 'bg-amber-100 text-amber-700',
    ACTIVE: 'bg-[#16a34a]/10 text-[#16a34a]',
    SUSPENDED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-700',
  };
  const fallbackColors = ['bg-gray-100 text-gray-700', 'bg-green-100 text-green-700', 'bg-amber-100 text-amber-700', 'bg-red-100 text-red-700', 'bg-blue-100 text-blue-700'];
  const hash = status.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const style = styleMap[status] || fallbackColors[hash % fallbackColors.length];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${style}`}>
      {status}
    </span>
  );
}