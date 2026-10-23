'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { rolesAPI, permissionsAPI } from '@/lib/api';
import { usePermission } from '@/lib/usePermission';
import { useToast } from '@/lib/toasts';
import { NavTabs } from '@/components/NavTabs';
import { Card, Badge, Input, Button, Dialog, Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui';

export default function RolesPage() {
  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const canManage = hasPermission('organization.manage');
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Permission editor (POST /roles/:id/permissions).
  const [permRole, setPermRole] = useState<any | null>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [savingPerms, setSavingPerms] = useState(false);

  useEffect(() => { loadRoles(); }, []);

  async function loadRoles() {
    try {
      const { data } = await rolesAPI.list();
      setRoles(Array.isArray(data) ? data : data?.data || []);
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to load roles', message: err.response?.data?.message || 'An error occurred' });
    }
    finally { setLoading(false); }
  }

  /** The org's permission catalog (GET /permissions already excludes platform permissions). */
  async function loadPermissions() {
    if (catalog.length) return;
    try {
      const { data } = await permissionsAPI.list();
      setCatalog(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to load permissions', message: err.response?.data?.message || 'An error occurred' });
    }
  }

  function openPermEditor(role: any) {
    const current = (role.permissions || [])
      .map((rp: any) => rp.permission?.id || rp.permissionId)
      .filter(Boolean);
    setSelected(new Set(current));
    setPermRole(role);
    loadPermissions();
  }

  function togglePermission(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function savePermissions() {
    if (!permRole) return;
    setSavingPerms(true);
    try {
      await rolesAPI.setPermissions(permRole.id, [...selected]);
      toast({ type: 'success', title: `Permissions updated for ${permRole.name}` });
      setPermRole(null);
      loadRoles();
    } catch (err: any) {
      // Server explains the rule (system roles, platform permissions, ...).
      toast({ type: 'error', title: 'Failed to update permissions', message: err.response?.data?.message || 'An error occurred' });
    } finally {
      setSavingPerms(false);
    }
  }

  // Organizations may edit permissions on their own custom roles only —
  // system roles (organizationId null) are platform-managed (server rejects).
  const canEditPerms = canManage && !!permRole?.organizationId;

  const groupedCatalog = useMemo(() => {
    const byCategory: Record<string, any[]> = {};
    for (const perm of catalog) {
      const category = perm.category || 'General';
      if (!byCategory[category]) byCategory[category] = [];
      byCategory[category].push(perm);
    }
    return Object.entries(byCategory);
  }, [catalog]);

  const filtered = roles.filter((r) =>
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
        <p className="text-sm text-gray-500 mt-1">View roles and manage their assigned permissions</p>
      </div>

      <NavTabs
        ariaLabel="Access section"
        tabs={[
          { label: 'Roles', href: '/roles' },
          { label: 'Permissions', href: '/permissions' },
        ]}
      />

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
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="text-gray-500">{role.description || '—'}</TableCell>
                  <TableCell>
                    {role._count?.permissions ?? role.permissions?.length ?? 0}
                  </TableCell>
                  <TableCell>{role._count?.users || 0}</TableCell>
                  <TableCell>
                    {role.isSystem ? <Badge variant="secondary">System</Badge> : <Badge variant="outline">Custom</Badge>}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => openPermEditor(role)}>
                      Permissions
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Permission editor */}
      <Dialog
        open={!!permRole}
        onOpenChange={(open) => {
          if (!open) setPermRole(null);
        }}
        title={`Permissions — ${permRole?.name || ''}`}
        description={
          canEditPerms
            ? 'Tick the permissions users with this role get. Changes apply on next sign-in.'
            : 'System roles are managed by the platform — permissions are read-only here.'
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {selected.size} of {catalog.length} selected
          </p>
          <div className="max-h-[50vh] overflow-y-auto rounded border divide-y">
            {catalog.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">Loading permissions…</div>
            ) : (
              groupedCatalog.map(([category, perms]) => (
                <div key={category}>
                  <div className="px-3 py-2 bg-muted/50 text-sm font-semibold">{category}</div>
                  {perms.map((perm: any) => {
                    const checked = selected.has(perm.id);
                    return (
                      <button
                        key={perm.id}
                        type="button"
                        disabled={!canEditPerms}
                        onClick={() => togglePermission(perm.id)}
                        className={`w-full flex items-start gap-3 px-3 py-2 text-left text-sm hover:bg-muted/40 transition-colors ${
                          !canEditPerms ? 'opacity-70 cursor-default' : ''
                        }`}
                      >
                        <span className="mt-0.5 w-4 shrink-0 text-center">{checked ? '☑' : '☐'}</span>
                        <span className="min-w-0">
                          <span className="font-mono text-xs break-all">{perm.name}</span>
                          {perm.description && (
                            <span className="block text-xs text-muted-foreground">{perm.description}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setPermRole(null)}>
              {canEditPerms ? 'Cancel' : 'Close'}
            </Button>
            {canEditPerms && (
              <Button type="button" onClick={savePermissions} loading={savingPerms}>
                Save Permissions
              </Button>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
