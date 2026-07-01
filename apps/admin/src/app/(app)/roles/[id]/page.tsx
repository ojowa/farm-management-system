'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { rolesAPI, permissionsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input } from '@/components/ui';
import { useReadOnly } from '@/lib/useReadOnly';

export default function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const readOnly = useReadOnly();
  const [role, setRole] = useState<any>(null);
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameForm, setNameForm] = useState({ name: '', description: '' });

  useEffect(() => { loadRole(); loadPermissions(); }, [id]);

  async function loadRole() {
    try {
      const { data } = await rolesAPI.get(id);
      setRole(data);
      setNameForm({ name: data.name, description: data.description || '' });
    } catch { router.push('/roles'); }
    finally { setLoading(false); }
  }

  async function loadPermissions() {
    try {
      const { data } = await permissionsAPI.list();
      setAllPermissions(data.permissions);
      setGroupedPermissions(data.grouped);
    } catch { /* ignore */ }
  }

  async function handleSaveName() {
    setSaving(true);
    try {
      await rolesAPI.update(id, { name: nameForm.name, description: nameForm.description });
      setEditingName(false);
      await loadRole();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  async function handleTogglePermission(permissionId: string) {
    if (role.isSystem) return;
    const currentIds = role.permissions?.map((p: any) => p.permission?.id || p.permissionId) || [];
    const newIds = currentIds.includes(permissionId)
      ? currentIds.filter((pid: string) => pid !== permissionId)
      : [...currentIds, permissionId];
    setSaving(true);
    try {
      await rolesAPI.setPermissions(id, newIds);
      await loadRole();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!role) return null;

  const assignedIds = new Set(role.permissions?.map((p: any) => p.permission?.id || p.permissionId));

  return (
    <div>
      <div className="mb-6">
        <Link href="/roles" className="text-sm text-gray-500 hover:text-gray-700">Roles</Link>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{role.name}</h1>
            {role.isSystem && <Badge variant="secondary">System</Badge>}
          </div>
          <div className="flex gap-2 text-sm text-gray-500">
            <span>{role._count?.permissions || 0} permissions</span>
            <span>·</span>
            <span>{role._count?.users || 0} users</span>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          {editingName ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                <Input
                  value={nameForm.name}
                  onChange={(e) => setNameForm({ ...nameForm, name: e.target.value })}
                  disabled={role.isSystem}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={nameForm.description}
                  onChange={(e) => setNameForm({ ...nameForm, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                {!readOnly && (
                  <>
                    <Button size="sm" onClick={handleSaveName} loading={saving}>Save</Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingName(false)}>Cancel</Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{role.description || 'No description'}</p>
              </div>
              {!role.isSystem && !readOnly && (
                <Button size="sm" variant="secondary" onClick={() => setEditingName(true)}>Edit</Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          {role.isSystem ? (
            <p className="text-sm text-gray-500">System roles have predefined permissions that cannot be modified.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPermissions).map(([category, perms]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">{category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {perms.map((perm: any) => (
                      <label
                        key={perm.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          assignedIds.has(perm.id)
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={assignedIds.has(perm.id)}
                          onChange={() => handleTogglePermission(perm.id)}
                          disabled={readOnly}
                          className="rounded border-gray-300 text-green-600"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{perm.name}</p>
                          {perm.description && (
                            <p className="text-xs text-gray-500">{perm.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
