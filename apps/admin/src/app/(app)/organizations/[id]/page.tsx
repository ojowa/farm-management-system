'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminAPI } from '@/lib/api';
import { useReadOnly } from '@/lib/useReadOnly';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui';

const PLAN_OPTIONS = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'];
const STATUS_OPTIONS = ['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED'];

const PLAN_COLORS: Record<string, string> = { FREE: 'gray', STARTER: 'blue', PRO: 'green', ENTERPRISE: 'purple' };
const STATUS_COLORS: Record<string, string> = { TRIAL: 'yellow', ACTIVE: 'green', SUSPENDED: 'red', CANCELLED: 'gray' };

export default function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const readOnly = useReadOnly();
  const router = useRouter();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'details' | 'users' | 'subscription'>('details');

  useEffect(() => { loadOrg(); }, [id]);

  async function loadOrg() {
    try {
      const { data } = await adminAPI.getOrganization(id);
      setOrg(data);
    } catch { router.push('/organizations'); }
    finally { setLoading(false); }
  }

  async function handleSubscriptionUpdate(plan: string, status: string) {
    setSaving(true);
    try {
      await adminAPI.updateSubscription(id, { subscriptionPlan: plan, subscriptionStatus: status });
      await loadOrg();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  async function handleToggleUser(userId: string) {
    try {
      await adminAPI.toggleUserActive(userId);
      await loadOrg();
    } catch { /* ignore */ }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!org) return null;

  return (
    <div>
      <div className="mb-6">
        <Link href="/organizations" className="text-sm text-gray-500 hover:text-gray-700">Organizations</Link>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
          <div className="flex gap-2">
            <Badge variant={PLAN_COLORS[org.subscriptionPlan] as any || 'gray'}>{org.subscriptionPlan}</Badge>
            <Badge variant={STATUS_COLORS[org.subscriptionStatus] as any || 'gray'}>{org.subscriptionStatus}</Badge>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-200">
        {(['details', 'users', 'subscription'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="text-gray-900">{org.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Slug</p>
                <p className="text-gray-900">{org.slug}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-gray-900">{org.email || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Phone</p>
                <p className="text-gray-900">{org.phone || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Website</p>
                <p className="text-gray-900">{org.website || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Industry</p>
                <p className="text-gray-900">{org.industry || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Users</p>
                <p className="text-gray-900">{org._count?.users || 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Farms</p>
                <p className="text-gray-900">{org._count?.farms || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'users' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {org.users?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">No users</TableCell>
                  </TableRow>
                ) : org.users?.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{[user.firstName, user.lastName].filter(Boolean).join(' ')}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><Badge variant="secondary">{user.role?.name}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'success' : 'destructive'}>
                        {user.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      {!readOnly && (
                        <Button
                          variant={user.isActive ? 'secondary' : 'default'}
                          size="sm"
                          onClick={() => handleToggleUser(user.id)}
                        >
                          {user.isActive ? 'Disable' : 'Enable'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 'subscription' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <Badge variant={PLAN_COLORS[org.subscriptionPlan] as any || 'gray'} className="text-lg px-4 py-1">
                  {org.subscriptionPlan}
                </Badge>
                <Badge variant={STATUS_COLORS[org.subscriptionStatus] as any || 'gray'}>
                  {org.subscriptionStatus}
                </Badge>
              </div>

              <div className="space-y-4">
                {!readOnly && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Change Plan</p>
                      <div className="flex gap-2">
                        {PLAN_OPTIONS.map((plan) => (
                          <Button
                            key={plan}
                            variant={org.subscriptionPlan === plan ? 'default' : 'secondary'}
                            size="sm"
                            onClick={() => handleSubscriptionUpdate(plan, org.subscriptionStatus)}
                            loading={saving}
                            disabled={org.subscriptionPlan === plan}
                          >
                            {plan}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Change Status</p>
                      <div className="flex gap-2">
                        {STATUS_OPTIONS.map((status) => (
                          <Button
                            key={status}
                            variant={org.subscriptionStatus === status ? 'default' : 'secondary'}
                            size="sm"
                            onClick={() => handleSubscriptionUpdate(org.subscriptionPlan, status)}
                            loading={saving}
                            disabled={org.subscriptionStatus === status}
                          >
                            {status}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
