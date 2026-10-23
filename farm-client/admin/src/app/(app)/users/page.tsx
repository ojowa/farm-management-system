'use client';

import React, { useEffect, useState } from 'react';
import { apiClient, orgAdminAPI, rolesAPI } from '@/lib/api';
import { usePermission } from '@/lib/usePermission';
import { useToast, getErrorMessage } from '@/lib/toasts';
import { Card, CardContent, Badge, Input, Button, Table, TableHeader, TableBody, TableHead, TableRow, TableCell, Dialog, Select } from '@/components/ui';

interface RoleOption {
  id: string;
  name: string;
}

export default function UsersPage() {
  // Admin user management is restricted to users.manage holders.
  const { hasPermission } = usePermission();
  const readOnly = !hasPermission('users.manage');
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Invite flow (POST /org-admin/users — roleId is required server-side).
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ firstName: '', lastName: '', email: '', roleId: '' });
  const [inviteSaving, setInviteSaving] = useState(false);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  // Edit flow (PUT /admin/users/:userId — whitelisted UpdateUserDto).
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', roleId: '' });
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/admin/users');
      setUsers(Array.isArray(data) ? data : data?.data || []);
    } catch (err: any) {
      setUsers([]);
      toast({ type: 'error', title: 'Failed to load users', message: getErrorMessage(err) });
    }
    finally { setLoading(false); }
  }

  /** Org-applicable roles for the dropdown; both endpoints return either a bare array or {data}. */
  async function loadRoles() {
    if (roles.length) return;
    const normalise = (data: any): RoleOption[] =>
      Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    try {
      const { data } = await orgAdminAPI.listRoles();
      const rows = normalise(data);
      if (rows.length) { setRoles(rows); return; }
      const fallback = await rolesAPI.list();
      setRoles(normalise(fallback.data));
    } catch {
      try {
        const fallback = await rolesAPI.list();
        setRoles(normalise(fallback.data));
      } catch {
        toast({ type: 'error', title: 'Failed to load roles', message: 'Cannot pick a login role without the roles list.' });
      }
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const firstName = inviteForm.firstName.trim();
    const lastName = inviteForm.lastName.trim();
    const email = inviteForm.email.trim();
    if (!firstName || !lastName || !email || !inviteForm.roleId) {
      toast({ type: 'error', title: 'Missing fields', message: 'First name, last name, email and role are required.' });
      return;
    }
    setInviteSaving(true);
    try {
      const { data } = await orgAdminAPI.inviteUser({ firstName, lastName, email, roleId: inviteForm.roleId });
      setInviteOpen(false);
      setInviteForm({ firstName: '', lastName: '', email: '', roleId: '' });
      if (data?.tempPassword) {
        setCreated({ email: data.user?.email || email, tempPassword: data.tempPassword });
      } else {
        toast({ type: 'success', title: 'Invitation created', message: `${email} can now set up their account.` });
      }
      loadUsers();
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to invite user', message: getErrorMessage(err) });
    } finally {
      setInviteSaving(false);
    }
  }

  function openEdit(user: any) {
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      roleId: user.role?.id || '',
    });
    setEditUser(user);
    loadRoles();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    const firstName = editForm.firstName.trim();
    const lastName = editForm.lastName.trim();
    if (!firstName || !lastName) {
      toast({ type: 'error', title: 'Missing fields', message: 'First name and last name are required.' });
      return;
    }
    setEditSaving(true);
    try {
      await apiClient.put(`/admin/users/${editUser.id}`, {
        firstName,
        lastName,
        roleId: editForm.roleId || undefined,
      });
      setEditUser(null);
      toast({ type: 'success', title: 'User updated' });
      loadUsers();
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to update user', message: getErrorMessage(err) });
    } finally {
      setEditSaving(false);
    }
  }

  async function handleToggleUser(userId: string) {
    try {
      await apiClient.put(`/admin/users/${userId}/toggle-active`);
      loadUsers();
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to toggle user', message: getErrorMessage(err) });
    }
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

  // Keep the user's current role selectable even if it isn't in the list
  // (e.g. fetched roles excluded it, or a platform role).
  const editRoleOptions = [
    ...roles,
    ...(editUser?.role && !roles.some((r) => r.id === editUser.role.id)
      ? [{ id: editUser.role.id, name: editUser.role.name }]
      : []),
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        {!readOnly && (
          <Button
            onClick={() => {
              setInviteOpen(true);
              loadRoles();
            }}
          >
            Invite User
          </Button>
        )}
      </div>

      <div className="flex gap-4 mb-6">
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
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No users found</div>
          ) : (
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Organization</TableHead>
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
                    <TableCell>
                      <div className="max-w-[220px] truncate">{user.email}</div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {user.organization?.name || <span className="text-gray-400">—</span>}
                    </TableCell>
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
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(user)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant={user.isActive ? 'secondary' : 'default'}
                            size="sm"
                            onClick={() => handleToggleUser(user.id)}
                          >
                            {user.isActive ? 'Disable' : 'Enable'}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite user dialog — roleId is required (server rejects invites without one) */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen} title="Invite User">
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">
                First Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Jane"
                value={inviteForm.firstName}
                onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Last Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Doe"
                value={inviteForm.lastName}
                onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Email <span className="text-destructive">*</span>
            </label>
            <Input
              type="email"
              placeholder="e.g. jane@example.com"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Login email — a temporary password is generated and emailed here.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Role <span className="text-destructive">*</span>
            </label>
            <Select
              placeholder="Select a role"
              options={roles.map((r) => ({ value: r.id, label: r.name }))}
              value={inviteForm.roleId}
              onChange={(e) => setInviteForm({ ...inviteForm, roleId: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Permissions the new user's login gets.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={inviteSaving}>Create Invitation</Button>
          </div>
        </form>
      </Dialog>

      {/* Edit user dialog */}
      {editUser && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setEditUser(null);
          }}
          title={`Edit ${[editUser.firstName, editUser.lastName].filter(Boolean).join(' ')}`}
        >
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  First Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Last Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Role</label>
              <Select
                placeholder="Select a role"
                options={editRoleOptions.map((r) => ({ value: r.id, label: r.name }))}
                value={editForm.roleId}
                onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Change takes effect on the user's next sign-in.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={editSaving}>Save Changes</Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Credentials dialog — shown once an invite has been created */}
      {created && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setCreated(null);
          }}
          title="Invitation created — login credentials"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {created.email} can now log in with this temporary password (it
              was also emailed if delivery is configured). Ask them to change
              it after first login.
            </p>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <code className="block rounded bg-muted px-3 py-2 text-sm font-mono break-all">
                {created.email}
              </code>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Temporary password</label>
              <code className="block rounded bg-muted px-3 py-2 text-sm font-mono break-all">
                {created.tempPassword}
              </code>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setCreated(null)}>
                Done
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
