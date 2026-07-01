'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminAPI, rolesAPI } from '@/lib/api';
import { useReadOnly } from '@/lib/useReadOnly';
import { Card, CardContent, Badge, Input, Button, Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui';

export default function UsersPage() {
  const readOnly = useReadOnly();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { loadOrgs(); }, []);

  async function loadOrgs() {
    try {
      const { data } = await adminAPI.listOrganizations();
      setOrganizations(data);
      if (data.length > 0) {
        setSelectedOrg(data[0].id);
        loadUsers(data[0].id);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function loadUsers(orgId: string) {
    setLoadingUsers(true);
    try {
      const { data } = await adminAPI.getOrganizationUsers(orgId);
      setUsers(data);
    } catch { setUsers([]); }
    finally { setLoadingUsers(false); }
  }

  function handleOrgChange(orgId: string) {
    setSelectedOrg(orgId);
    setSearch('');
    loadUsers(orgId);
  }

  async function handleToggleUser(userId: string) {
    try {
      await adminAPI.toggleUserActive(userId);
      if (selectedOrg) loadUsers(selectedOrg);
    } catch { /* ignore */ }
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="w-64">
          <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={selectedOrg}
            onChange={(e) => handleOrgChange(e.target.value)}
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loadingUsers ? (
            <div className="text-center py-8 text-gray-500">Loading users...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No users found</div>
          ) : (
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
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {[user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ')}
                    </TableCell>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
