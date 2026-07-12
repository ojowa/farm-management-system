'use client';

import React, { useEffect, useState } from 'react';
import { rolesAPI } from '@/lib/api';
import { Card, Badge, Input, Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui';

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadRoles(); }, []);

  async function loadRoles() {
    try {
      const { data } = await rolesAPI.list();
      setRoles(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  const filtered = roles.filter((r) =>
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
        <p className="text-sm text-gray-500 mt-1">View roles and their assigned permissions</p>
      </div>

      <Card>
        <div className="p-4 border-b">
          <Input placeholder="Search roles..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No roles found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="text-gray-500">{role.description || '—'}</TableCell>
                  <TableCell>{role._count?.permissions || 0}</TableCell>
                  <TableCell>{role._count?.users || 0}</TableCell>
                  <TableCell>
                    {role.isSystem ? <Badge variant="secondary">System</Badge> : <Badge variant="outline">Custom</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
