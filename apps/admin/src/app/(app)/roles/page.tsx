'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { rolesAPI } from '@/lib/api';
import { Card, Badge, Input, Button, Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui';
import { useReadOnly } from '@/lib/useReadOnly';

export default function RolesPage() {
  const router = useRouter();
  const readOnly = useReadOnly();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { loadRoles(); }, []);

  async function loadRoles() {
    try {
      const { data } = await rolesAPI.list();
      setRoles(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete role "${name}"?`)) return;
    setDeleting(id);
    try {
      await rolesAPI.delete(id);
      await loadRoles();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete');
    } finally { setDeleting(null); }
  }

  const filtered = roles.filter((r) =>
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
        {!readOnly && (
          <Link href="/roles/new">
            <Button>Create Role</Button>
          </Link>
        )}
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
                <TableHead></TableHead>
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
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/roles/${role.id}`} className="text-green-600 hover:underline text-sm">
                        Edit
                      </Link>
                      {!readOnly && !role.isSystem && (
                        <button
                          onClick={() => handleDelete(role.id, role.name)}
                          disabled={deleting === role.id}
                          className="text-red-600 hover:underline text-sm"
                        >
                          {deleting === role.id ? '...' : 'Delete'}
                        </button>
                      )}
                    </div>
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
