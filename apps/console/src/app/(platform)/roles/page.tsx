'use client';

import React, { useState, useEffect } from 'react';
import { platformRolesAPI, platformPermissionsAPI } from '@/lib/api';
import { toastError, toastSuccess, getErrorMessage } from '@/lib/toast';

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: { permission: { id: string; name: string; category: string } }[];
}

interface Permission {
  id: string;
  name: string;
  description: string | null;
  category: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'roles' | 'permissions'>('roles');

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        platformRolesAPI.list(),
        platformPermissionsAPI.list(),
      ]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);
    } catch (err) { toastError(getErrorMessage(err)); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await platformRolesAPI.create(form);
      toastSuccess('Role created');
      setShowForm(false);
      setForm({ name: '', description: '' });
      loadData();
    } catch (err) { toastError(getErrorMessage(err)); }
    setSaving(false);
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Delete this role?')) return;
    try {
      await platformRolesAPI.delete(id);
      toastSuccess('Role deleted');
      setSelectedRole(null);
      loadData();
    } catch (err) { toastError(getErrorMessage(err)); }
  };

  const handleTogglePermission = async (roleId: string, permissionId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;
    const currentIds = role.permissions.map((p) => p.permission.id);
    const newIds = currentIds.includes(permissionId)
      ? currentIds.filter((id) => id !== permissionId)
      : [...currentIds, permissionId];
    try {
      await platformRolesAPI.setPermissions(roleId, newIds);
      toastSuccess('Permissions updated');
      loadData();
    } catch (err) { toastError(getErrorMessage(err)); }
  };

  const groupedPermissions = permissions.reduce((acc, p) => {
    const cat = p.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
        <p className="mt-1 text-sm text-gray-500">Manage roles and their permission assignments</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('roles')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'roles' ? 'bg-[#16a34a] text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
        >
          Roles ({roles.length})
        </button>
        <button
          onClick={() => setTab('permissions')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'permissions' ? 'bg-[#16a34a] text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
        >
          Permissions ({permissions.length})
        </button>
      </div>

      {tab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Roles</h2>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="text-xs font-medium text-[#16a34a] hover:underline"
                >
                  {showForm ? 'Cancel' : '+ New Role'}
                </button>
              </div>
              {showForm && (
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                  <form onSubmit={handleCreateRole} className="space-y-3">
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Role name"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]"
                      required
                    />
                    <input
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Description (optional)"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]"
                    />
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full px-3 py-2 bg-[#16a34a] text-white text-sm font-medium rounded-lg hover:bg-[#15803d] disabled:opacity-50"
                    >
                      {saving ? 'Creating...' : 'Create Role'}
                    </button>
                  </form>
                </div>
              )}
              <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-sm text-gray-500">Loading...</div>
                ) : roles.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">No roles found</div>
                ) : roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${selectedRole?.id === role.id ? 'bg-[#16a34a]/5 border-l-2 border-[#16a34a]' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{role.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{role.description || 'No description'}</p>
                      </div>
                      <span className="text-xs text-gray-400">{role.permissions.length}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedRole ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{selectedRole.name}</h2>
                    <p className="text-sm text-gray-500">{selectedRole.description || 'No description'}</p>
                  </div>
                  {!selectedRole.isSystem && (
                    <button
                      onClick={() => handleDeleteRole(selectedRole.id)}
                      className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <div className="space-y-6">
                  {Object.entries(groupedPermissions).map(([category, perms]) => (
                    <div key={category}>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{category}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {perms.map((perm) => {
                          const isActive = selectedRole.permissions.some((p) => p.permission.id === perm.id);
                          return (
                            <button
                              key={perm.id}
                              onClick={() => handleTogglePermission(selectedRole.id, perm.id)}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                                isActive
                                  ? 'border-[#16a34a]/30 bg-[#16a34a]/5'
                                  : 'border-gray-200 bg-white hover:bg-gray-50'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                isActive ? 'bg-[#16a34a] border-[#16a34a]' : 'border-gray-300'
                              }`}>
                                {isActive && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{perm.name}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <p className="text-sm text-gray-500">Select a role to manage its permissions</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'permissions' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">All Permissions</h2>
            <p className="text-sm text-gray-500 mt-1">Permissions are assigned to roles to control access</p>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {Object.entries(groupedPermissions).map(([category, perms]) => (
              <div key={category} className="p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{category}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {perms.map((perm) => (
                    <div key={perm.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      <div className="w-2 h-2 rounded-full bg-[#16a34a] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{perm.name}</p>
                        {perm.description && <p className="text-xs text-gray-500 truncate">{perm.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
