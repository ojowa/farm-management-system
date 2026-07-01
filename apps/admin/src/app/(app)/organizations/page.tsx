'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input } from '@/components/ui';

const PLAN_COLORS: Record<string, string> = {
  FREE: 'gray',
  STARTER: 'blue',
  PRO: 'green',
  ENTERPRISE: 'purple',
};

const STATUS_COLORS: Record<string, string> = {
  TRIAL: 'yellow',
  ACTIVE: 'green',
  SUSPENDED: 'red',
  CANCELLED: 'gray',
};

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadOrganizations();
  }, []);

  async function loadOrganizations() {
    try {
      const { data } = await adminAPI.listOrganizations();
      setOrganizations(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  const filtered = organizations.filter((org) =>
    org.name?.toLowerCase().includes(search.toLowerCase()) ||
    org.email?.toLowerCase().includes(search.toLowerCase()) ||
    org.slug?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No organizations found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((org) => (
            <Link key={org.id} href={`/organizations/${org.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
                        {org.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{org.name}</h3>
                        <p className="text-sm text-gray-500">{org.email || org.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm text-gray-500">
                        <div>{org._count?.users || 0} users</div>
                        <div>{org._count?.farms || 0} farms</div>
                      </div>
                      <Badge variant={PLAN_COLORS[org.subscriptionPlan] as any || 'gray'}>
                        {org.subscriptionPlan}
                      </Badge>
                      <Badge variant={STATUS_COLORS[org.subscriptionStatus] as any || 'gray'}>
                        {org.subscriptionStatus}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
