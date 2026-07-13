'use client';

import React, { useState, useRef, useEffect } from 'react';
import { orgAdminAPI, settingsAPI } from '@/lib/api';
import { useToasts } from '@/lib/toasts';
import { Card, Button, Input, Badge } from '@/components/ui';

import { useAuth } from '@/lib/auth';
import { usePermission } from '@/lib/usePermission';

export default function SettingsPage() {
  const { success, error: toastError } = useToasts();
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const canManageOrg = hasPermission('organization.manage');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [orgData, setOrgData] = useState<any>({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    organizationId: '',
    organizationName: '',
    avatar: null,
    permissions: [],
    planFeatures: { modules: [], farmTypes: [] },
  });
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      await settingsAPI.getProfile();
    } catch (err) {
      console.error('Failed to load user profile:', err);
    }
  };

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
  });
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Organization settings
  const [org, setOrg] = useState<any>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgForm, setOrgForm] = useState({ name: '', email: '', phone: '', website: '', industry: '' });
  const [orgSaving, setOrgSaving] = useState(false);

  // Role management
  const [roles, setRoles] = useState<any[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [roleSaving, setRoleSaving] = useState(false);

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushNotifications: true,
    weeklyDigest: false,
    taskAssignments: true,
    attendanceAlerts: true,
  });

  // Security settings
  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [securityErrors, setSecurityErrors] = useState<Record<string, string>>({});

  const [tab, setTab] = useState<'profile' | 'organization' | 'roles' | 'notifications' | 'security'>('profile');

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [profileRes, prefsRes] = await Promise.all([
          settingsAPI.getProfile(),
          settingsAPI.getPreferences(),
        ]);
        const profile = profileRes.data;
        setForm({
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
        });
        setAvatarPreview(profile.avatar || null);

        if (prefsRes.data?.notificationPreferences) {
          setNotifications((prev) => ({
            ...prev,
            ...prefsRes.data.notificationPreferences,
          }));
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (canManageOrg) {
      loadOrg();
      loadRoles();
    }
  }, [user?.role?.name]);

  async function loadRoles() {
    try {
      const { data } = await orgAdminAPI.listRoles();
      setRoles(data);
    } catch { /* ignore */ }
    finally { setRolesLoading(false); }
  }

  async function loadPermissions() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/permissions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAllPermissions(data);
      }
    } catch { /* ignore */ }
  }

  const openRoleForm = async (role?: any) => {
    await loadPermissions();
    if (role) {
      setEditingRole(role);
      setRoleForm({ name: role.name, description: role.description || '' });
      setSelectedPerms(role.permissions?.map((p: any) => p.permission?.id || p.permissionId) || []);
    } else {
      setEditingRole(null);
      setRoleForm({ name: '', description: '' });
      setSelectedPerms([]);
    }
    setShowRoleForm(true);
  };

  const handleRoleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleSaving(true);
    try {
      if (editingRole) {
        await orgAdminAPI.updateRole(editingRole.id, { ...roleForm, permissionIds: selectedPerms });
        success('Role updated');
      } else {
        await orgAdminAPI.createRole({ ...roleForm, permissionIds: selectedPerms });
        success('Role created');
      }
      setShowRoleForm(false);
      await loadRoles();
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to save role');
    } finally { setRoleSaving(false); }
  };

  const handleRoleDelete = async (id: string) => {
    if (!confirm('Delete this role? Users with this role will need to be reassigned.')) return;
    try {
      await orgAdminAPI.deleteRole(id);
      success('Role deleted');
      await loadRoles();
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to delete role');
    }
  };

  const handleNotificationsSave = async () => {
    try {
      await settingsAPI.updatePreferences({ notificationPreferences: notifications });
      success('Notification preferences updated');
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to update notifications');
    }
  };

  const handleSecuritySave = async () => {
    const errors: Record<string, string> = {};
    if (!security.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    if (security.newPassword && security.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }
    if (security.newPassword && security.newPassword !== security.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (Object.keys(errors).length > 0) {
      setSecurityErrors(errors);
      return;
    }
    setSecurityErrors({});
    try {
      await settingsAPI.changePassword({
        currentPassword: security.currentPassword,
        newPassword: security.newPassword,
      });
      success('Password updated successfully');
      setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to update password');
    }
  };

  async function loadOrg() {
    try {
      const { data } = await orgAdminAPI.getOrganization();
      setOrg(data);
      setOrgForm({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        website: data.website || '',
        industry: data.industry || '',
      });
    } catch { /* ignore */ }
    finally { setOrgLoading(false); }
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsAPI.updateProfile({ firstName: form.firstName, lastName: form.lastName });
      success('Profile updated');
      await refreshUser();
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to update profile');
    } finally { setSaving(false); }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toastError('Image must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setAvatarPreview(base64);
      setUploadingAvatar(true);
      try {
        await settingsAPI.updateProfile({ avatar: base64 });
        success('Avatar updated');
        await refreshUser();
      } catch (err: any) {
        toastError(err.response?.data?.message || 'Failed to upload avatar');
        setAvatarPreview(user?.avatar || null);
      } finally { setUploadingAvatar(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleOrgSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgSaving(true);
    try {
      await orgAdminAPI.updateOrganization(orgForm);
      success('Organization updated');
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to update organization');
    } finally { setOrgSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setTab('profile')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'profile' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Profile
        </button>
        {canManageOrg && (
          <button
            onClick={() => setTab('organization')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'organization' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Organization
          </button>
        )}
        {canManageOrg && (
          <button
            onClick={() => setTab('roles')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'roles' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Roles
          </button>
        )}
        <button
          onClick={() => setTab('notifications')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'notifications' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Notifications
        </button>
        <button
          onClick={() => setTab('security')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'security' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Security
        </button>
      </div>

      {tab === 'profile' && (
        <div className="max-w-2xl space-y-6">
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Profile</h3>
            <form onSubmit={handleProfileSave}>
              <div className="flex items-center gap-6 mb-6">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group"
                  aria-label="Change avatar"
                >
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-2xl font-bold overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      (user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || '?')
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </button>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {user?.firstName || user?.lastName
                      ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                      : 'No name set'}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  {uploadingAvatar && <p className="text-xs text-green-600 mt-1">Uploading...</p>}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
                <Input
                  label="Last Name"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
              <Input label="Email" value={user?.email || ''} disabled />
              <div className="flex justify-end mt-4">
                <Button type="submit" loading={saving}>Save Changes</Button>
              </div>
            </form>
          </Card>

          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Account</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Role</p>
                  <p className="text-xs text-gray-500">{typeof user?.role === 'object' ? (user.role as any)?.name : user?.role || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Organization</p>
                  <p className="text-xs text-gray-500">{user?.organizationName || user?.organizationId || 'N/A'}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === 'organization' && canManageOrg && (
        <div className="max-w-2xl space-y-6">
          {orgLoading ? (
            <Card><div className="p-8 text-center text-gray-500">Loading organization...</div></Card>
          ) : !org ? (
            <Card><div className="p-8 text-center text-gray-500">Organization not found</div></Card>
          ) : (
            <>
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Organization Details</h3>
                  <div className="flex gap-2">
                    <Badge color="blue">{org.subscriptionPlan}</Badge>
                    <Badge color={org.subscriptionStatus === 'ACTIVE' ? 'green' : 'yellow'}>{org.subscriptionStatus}</Badge>
                  </div>
                </div>
                <form onSubmit={handleOrgSave} className="space-y-4">
                  <Input
                    label="Organization Name"
                    value={orgForm.name}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={orgForm.email}
                    onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Phone"
                      value={orgForm.phone}
                      onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                    />
                    <Input
                      label="Website"
                      value={orgForm.website}
                      onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                    />
                  </div>
                  <Input
                    label="Industry"
                    value={orgForm.industry}
                    onChange={(e) => setOrgForm({ ...orgForm, industry: e.target.value })}
                    placeholder="e.g. Agriculture, Poultry, Livestock"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" loading={orgSaving}>Save Organization</Button>
                  </div>
                </form>
              </Card>

              <Card>
                <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Users</p>
                    <p className="font-medium">{org._count?.users || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Farms</p>
                    <p className="font-medium">{org._count?.farms || 0}</p>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {tab === 'roles' && canManageOrg && (
        <div className="max-w-3xl space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Role Management</h3>
              <Button onClick={() => openRoleForm()} size="sm">+ New Role</Button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              System roles are platform-wide and cannot be modified. Create custom roles for your organization below.
            </p>
            {rolesLoading ? (
              <div className="p-4 text-center text-gray-500">Loading roles...</div>
            ) : roles.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No roles found</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {roles.map((role) => (
                  <div key={role.id} className="py-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">{role.name}</span>
                        {role.isSystem && <Badge color="blue">System</Badge>}
                        {!role.isSystem && <Badge color="green">Custom</Badge>}
                      </div>
                      {role.description && <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {role.permissions?.length || 0} permissions · {role._count?.users || 0} users
                      </p>
                    </div>
                    {!role.isSystem && (
                      <div className="flex gap-2 ml-4">
                        <button onClick={() => openRoleForm(role)} className="text-xs text-green-600 hover:text-green-800">Edit</button>
                        <button onClick={() => handleRoleDelete(role.id)} className="text-xs text-red-600 hover:text-red-800">Delete</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {showRoleForm && (
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">{editingRole ? 'Edit Role' : 'New Role'}</h3>
              <form onSubmit={handleRoleSave} className="space-y-4">
                <Input
                  label="Role Name"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  required
                  placeholder="e.g. Farm Supervisor"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Optional description"
                  />
                </div>
                {allPermissions.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-3">
                      {Object.entries(
                        allPermissions.reduce((acc: any, p: any) => {
                          const cat = p.category || 'Other';
                          if (!acc[cat]) acc[cat] = [];
                          acc[cat].push(p);
                          return acc;
                        }, {})
                      ).map(([cat, perms]: [string, any]) => (
                        <div key={cat}>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{cat}</p>
                          <div className="space-y-1">
                            {perms.map((p: any) => (
                              <label key={p.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedPerms.includes(p.id)}
                                  onChange={(e) => {
                                    setSelectedPerms(e.target.checked
                                      ? [...selectedPerms, p.id]
                                      : selectedPerms.filter((id) => id !== p.id)
                                    );
                                  }}
                                  className="rounded border-gray-300 text-green-600"
                                />
                                <span>{p.name}</span>
                                {p.description && <span className="text-xs text-gray-400">- {p.description}</span>}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setShowRoleForm(false)}>Cancel</Button>
                  <Button type="submit" loading={roleSaving}>{editingRole ? 'Update' : 'Create'} Role</Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      )}

      {tab === 'notifications' && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
          <div className="space-y-4">
            {[
              { key: 'emailAlerts', label: 'Email Alerts', desc: 'Receive important updates via email' },
              { key: 'pushNotifications', label: 'Push Notifications', desc: 'Get notified on your device' },
              { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Summary of farm activity each week' },
              { key: 'taskAssignments', label: 'Task Assignments', desc: 'Notify when tasks are assigned to you' },
              { key: 'attendanceAlerts', label: 'Attendance Alerts', desc: 'Notify on clock-in/out events' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(notifications as any)[item.key]}
                    onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Button onClick={handleNotificationsSave}>Save Preferences</Button>
          </div>
        </Card>
      )}

      {tab === 'security' && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <Input
                type="password"
                value={security.currentPassword}
                onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                placeholder="Enter current password"
              />
              {securityErrors.currentPassword && <p className="text-sm text-red-600 mt-1">{securityErrors.currentPassword}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <Input
                type="password"
                value={security.newPassword}
                onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                placeholder="Enter new password"
              />
              {securityErrors.newPassword && <p className="text-sm text-red-600 mt-1">{securityErrors.newPassword}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <Input
                type="password"
                value={security.confirmPassword}
                onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
              />
              {securityErrors.confirmPassword && <p className="text-sm text-red-600 mt-1">{securityErrors.confirmPassword}</p>}
            </div>
            <Button onClick={handleSecuritySave}>Update Password</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
