'use client';

import React, { useState, useEffect } from 'react';
import { platformUsersAPI, platformRolesAPI, platformOrgsAPI } from '@/lib/api';
import { toastError, toastSuccess, getErrorMessage } from '@/lib/toast';
import { Dialog } from '@/components/ui/dialog';
import type { PlatformAdminUser, PlatformAdminRole, PlatformOrganization } from '@/lib/types';

const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]';

interface EditForm {
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  organizationId: string;
  isActive: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<PlatformAdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit dialog state
  const [editing, setEditing] = useState<PlatformAdminUser | null>(null);
  const [form, setForm] = useState<EditForm>({ firstName: '', lastName: '', email: '', roleId: '', organizationId: '', isActive: true });
  const [roles, setRoles] = useState<PlatformAdminRole[]>([]);
  const [orgs, setOrgs] = useState<PlatformOrganization[]>([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Invite (create) dialog state
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({ firstName: '', lastName: '', email: '', roleId: '', organizationId: '' });
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ name: string; email: string; tempPassword: string } | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Impersonation (S8): a recorded, short-lived session acting as the target.
  const [impTarget, setImpTarget] = useState<PlatformAdminUser | null>(null);
  const [impResult, setImpResult] = useState<{ accessToken: string; expiresAt: string; sessionId: string } | null>(null);
  const [impBusy, setImpBusy] = useState(false);
  const [impCopied, setImpCopied] = useState(false);

  // Sessions (S8): recorded UserSession rows for one user.
  const [sessionsUser, setSessionsUser] = useState<PlatformAdminUser | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await platformUsersAPI.list({ page, limit: 20, search: search || undefined });
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) { toastError(getErrorMessage(err)); }
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, [page, search]);

  const loadOptions = async () => {
    if (optionsLoaded || optionsLoading) return;
    setOptionsLoading(true);
    try {
      const [rolesRes, orgsRes] = await Promise.all([
        platformRolesAPI.list(),
        platformOrgsAPI.list({ limit: 200 }),
      ]);
      const roleList: PlatformAdminRole[] = Array.isArray(rolesRes.data) ? rolesRes.data : rolesRes.data?.roles ?? [];
      const orgList: PlatformOrganization[] = orgsRes.data?.organizations ?? [];
      setRoles(roleList);
      setOrgs(orgList);
      setOptionsLoaded(true);
    } catch (err) {
      toastError(getErrorMessage(err));
    }
    setOptionsLoading(false);
  };

  const openEdit = (u: PlatformAdminUser) => {
    setEditing(u);
    setForm({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      roleId: '',
      organizationId: u.organizationId || '',
      isActive: u.isActive,
    });
    loadOptions();
  };

  // Preselect the user's current role once the role list arrives. Guarded so
  // a selection the admin already made is never overwritten.
  useEffect(() => {
    if (!editing) return;
    const match = roles.find((r) => r.name === editing.role);
    setForm((f) => (f.roleId ? f : { ...f, roleId: match?.id ?? '' }));
  }, [roles, editing]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();
    if (!firstName || !lastName) {
      toastError('First and last name are required');
      return;
    }

    setSaving(true);
    try {
      const orgChanged = (form.organizationId || '') !== (editing.organizationId || '');
      const chosenRole = roles.find((r) => r.id === form.roleId);
      const roleChanged = !!chosenRole && chosenRole.name !== editing.role;

      const payload: {
        firstName: string;
        lastName: string;
        email: string;
        isActive: boolean;
        organizationId: string | null;
        roleId?: string;
      } = {
        firstName,
        lastName,
        email,
        isActive: form.isActive,
        organizationId: form.organizationId || null,
      };
      if (form.roleId) payload.roleId = form.roleId;

      await platformUsersAPI.update(editing.id, payload);
      toastSuccess(
        orgChanged || roleChanged
          ? 'User updated — sessions ended, they must sign in again'
          : 'User updated',
      );
      setEditing(null);
      loadUsers();
    } catch (err) {
      toastError(getErrorMessage(err));
    }
    setSaving(false);
  };

  const handleToggleActive = async (u: PlatformAdminUser) => {
    const activating = !u.isActive;
    if (!confirm(activating ? 'Reactivate this user?' : 'Deactivate this user?')) return;
    try {
      await platformUsersAPI.toggleActive(u.id);
      toastSuccess(activating ? 'User activated' : 'User deactivated');
      loadUsers();
    } catch (err) { toastError(getErrorMessage(err)); }
  };

  const handleForceLogout = async (id: string) => {
    if (!confirm('Force logout all sessions?')) return;
    try {
      await platformUsersAPI.forceLogout(id);
      toastSuccess('Sessions terminated');
    } catch (err) { toastError(getErrorMessage(err)); }
  };

  const openInvite = () => {
    setInviteForm({ firstName: '', lastName: '', email: '', roleId: '', organizationId: '' });
    setInviteResult(null);
    setInviting(true);
    loadOptions();
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const firstName = inviteForm.firstName.trim();
    const lastName = inviteForm.lastName.trim();
    const email = inviteForm.email.trim();
    if (!firstName || !lastName || !email) {
      toastError('First name, last name and email are required');
      return;
    }
    if (!inviteForm.roleId) {
      toastError('Select a role for the new user');
      return;
    }

    setInviteSaving(true);
    try {
      const { data } = await platformUsersAPI.create({
        email,
        firstName,
        lastName,
        roleId: inviteForm.roleId,
        organizationId: inviteForm.organizationId || null,
      });
      setInviteResult({ name: `${firstName} ${lastName}`, email, tempPassword: data.tempPassword });
      toastSuccess('User created — invitation email queued');
      loadUsers();
    } catch (err) {
      toastError(getErrorMessage(err));
    }
    setInviteSaving(false);
  };

  const copyTempPassword = () => {
    if (!inviteResult) return;
    navigator.clipboard.writeText(inviteResult.tempPassword);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  // ── Impersonation (S8) ──────────────────────────────────
  const openImpersonate = (u: PlatformAdminUser) => {
    setImpTarget(u);
    setImpResult(null);
    setImpBusy(false);
  };

  const startImpersonation = async () => {
    if (!impTarget) return;
    setImpBusy(true);
    try {
      const { data } = await platformUsersAPI.impersonate(impTarget.id);
      setImpResult({ accessToken: data.accessToken, expiresAt: data.expiresAt, sessionId: data.sessionId });
    } catch (err) {
      toastError(getErrorMessage(err));
      setImpTarget(null);
    }
    setImpBusy(false);
  };

  const copyImpToken = () => {
    if (!impResult) return;
    navigator.clipboard.writeText(impResult.accessToken);
    setImpCopied(true);
    setTimeout(() => setImpCopied(false), 2000);
  };

  const endImpersonation = async () => {
    if (!impTarget || !impResult) return;
    setImpBusy(true);
    try {
      await platformUsersAPI.endImpersonation(impTarget.id, impResult.sessionId);
      toastSuccess('Impersonation session ended');
      setImpResult(null);
      setImpTarget(null);
    } catch (err) {
      toastError(getErrorMessage(err));
    }
    setImpBusy(false);
  };

  // ── Sessions (S8) ───────────────────────────────────────
  const openSessions = async (u: PlatformAdminUser) => {
    setSessionsUser(u);
    setSessions([]);
    setSessionsError(null);
    setSessionsLoading(true);
    try {
      const { data } = await platformUsersAPI.sessions(u.id);
      setSessions(Array.isArray(data?.sessions) ? data.sessions : []);
    } catch (err) {
      setSessionsError(getErrorMessage(err));
    }
    setSessionsLoading(false);
  };

  const endSessionFromList = async (sessionId: string) => {
    if (!sessionsUser) return;
    try {
      await platformUsersAPI.endImpersonation(sessionsUser.id, sessionId);
      toastSuccess('Session ended');
      const { data } = await platformUsersAPI.sessions(sessionsUser.id);
      setSessions(Array.isArray(data?.sessions) ? data.sessions : []);
      // The dialog may be showing the same session the impersonate dialog holds.
      setImpResult((prev) => (prev?.sessionId === sessionId ? null : prev));
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-sm text-gray-500 mt-1">{total} total users</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openInvite}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#16a34a] rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              + Invite user
            </button>
            <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="block w-full md:w-72 pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a] sm:text-sm"
            />
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Organization</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16a34a] mb-3"></div>
                      <span className="text-sm text-gray-500">Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <svg className="h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm text-gray-500">No users found</span>
                      {search && (
                        <button onClick={() => setSearch('')} className="mt-2 text-sm text-[#16a34a] hover:underline">Clear search</button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{u.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{u.organizationName || <span className="text-gray-400">No organization</span>}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                    <button
                      onClick={() => openEdit(u)}
                      className="text-[#16a34a] hover:text-green-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openSessions(u)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Sessions
                    </button>
                    {u.isActive && (
                      <button
                        onClick={() => openImpersonate(u)}
                        className="text-purple-600 hover:text-purple-800 font-medium"
                      >
                        Impersonate
                      </button>
                    )}
                    <button
                      onClick={() => handleForceLogout(u.id)}
                      className="text-orange-600 hover:text-orange-800 font-medium"
                    >
                      Force Logout
                    </button>
                    <button
                      onClick={() => handleToggleActive(u)}
                      className={u.isActive
                        ? 'text-red-600 hover:text-red-800 font-medium'
                        : 'text-green-600 hover:text-green-800 font-medium'}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <div className="text-sm text-gray-700">
            Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages || 1}</span>
          </div>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={users.length < 20}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>

        <Dialog
          open={!!editing}
          onOpenChange={(open) => { if (!open) setEditing(null); }}
          title="Edit user"
          description={editing ? `${editing.firstName} ${editing.lastName} · ${editing.role}` : undefined}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">First name</label>
                <input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Last name</label>
                <input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Organization</label>
              <select
                value={form.organizationId}
                onChange={(e) => setForm({ ...form, organizationId: e.target.value })}
                className={inputClass}
                disabled={optionsLoading}
              >
                {optionsLoading ? (
                  <option value="">Loading organizations...</option>
                ) : (
                  <>
                    <option value="">No organization</option>
                    {editing?.organizationId && !orgs.some((o) => o.id === editing.organizationId) && (
                      <option value={editing.organizationId}>{editing.organizationName || 'Current organization'}</option>
                    )}
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </>
                )}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Move the user to another organization, or pick &ldquo;No organization&rdquo; to detach them.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
              <select
                value={form.roleId}
                onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                className={inputClass}
                disabled={optionsLoading}
              >
                {optionsLoading ? (
                  <option value="">Loading roles...</option>
                ) : (
                  <>
                    <option value="">{editing ? `Keep current role (${editing.role})` : 'Select role'}</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={form.isActive ? 'active' : 'inactive'}
                onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}
                className={inputClass}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Changing the organization or role ends the user&rsquo;s sessions &mdash; they must sign in again.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || optionsLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-[#16a34a] rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </Dialog>

        <Dialog
          open={inviting}
          onOpenChange={(open) => { if (!open) setInviting(false); }}
          title={inviteResult ? 'User invited' : 'Invite a console user'}
          description={inviteResult ? inviteResult.email : 'Create the account and hand over the one-time password — an invitation email is also sent.'}
        >
          {inviteResult ? (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="text-sm font-medium text-gray-900 mb-3">{inviteResult.email}</p>
                <p className="text-xs text-gray-500 mb-1">One-time password</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-gray-900 flex-1 break-all">{inviteResult.tempPassword}</code>
                  <button
                    type="button"
                    onClick={copyTempPassword}
                    className="shrink-0 px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                  >
                    {inviteCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg">
                Save this now — the password is not shown again. It is also emailed to the invitee (logged instead when SMTP is not configured).
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setInviting(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#16a34a] rounded-lg hover:bg-green-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">First name</label>
                  <input
                    value={inviteForm.firstName}
                    onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Last name</label>
                  <input
                    value={inviteForm.lastName}
                    onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                <select
                  value={inviteForm.roleId}
                  onChange={(e) => setInviteForm({ ...inviteForm, roleId: e.target.value })}
                  className={inputClass}
                  disabled={optionsLoading}
                  required
                >
                  {optionsLoading ? (
                    <option value="">Loading roles...</option>
                  ) : (
                    <>
                      <option value="">Select role</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Organization</label>
                <select
                  value={inviteForm.organizationId}
                  onChange={(e) => setInviteForm({ ...inviteForm, organizationId: e.target.value })}
                  className={inputClass}
                  disabled={optionsLoading}
                >
                  {optionsLoading ? (
                    <option value="">Loading organizations...</option>
                  ) : (
                    <>
                      <option value="">No organization (platform console user)</option>
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </>
                  )}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  Leave empty for a platform console user (SUPER_ADMIN / SUPPORT_ADMIN).
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setInviting(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteSaving || optionsLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#16a34a] rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {inviteSaving ? 'Creating...' : 'Send invitation'}
                </button>
              </div>
            </form>
          )}
        </Dialog>

        {/* Impersonation (S8): start a recorded, short-lived session as the target */}
        <Dialog
          open={!!impTarget}
          onOpenChange={(open) => {
            if (!open) {
              setImpTarget(null);
              setImpResult(null);
            }
          }}
          title={
            impResult
              ? 'Impersonation active'
              : `Impersonate ${impTarget ? `${impTarget.firstName} ${impTarget.lastName}` : ''}`
          }
          description={
            impResult
              ? undefined
              : 'Mint a short-lived token that acts as this user. The session is recorded and audited, and the token never outlives its expiry.'
          }
        >
          {impResult ? (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <p>
                  <span className="text-gray-500">Target:</span> {impTarget?.email}
                </p>
                <p>
                  <span className="text-gray-500">Session:</span>{' '}
                  <code className="text-xs">{impResult.sessionId}</code>
                </p>
                <p>
                  <span className="text-gray-500">Expires:</span>{' '}
                  {new Date(impResult.expiresAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Bearer token</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono flex-1 break-all max-h-32 overflow-y-auto bg-gray-50 border rounded p-2">
                    {impResult.accessToken}
                  </code>
                  <button
                    type="button"
                    onClick={copyImpToken}
                    className="shrink-0 px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                  >
                    {impCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg">
                Send it as <code>Authorization: Bearer …</code> to act as this user — requests are scoped to
                their role and organization. Ending the session closes the record; the token itself dies at
                its expiry.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setImpTarget(null);
                    setImpResult(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={endImpersonation}
                  disabled={impBusy}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {impBusy ? 'Ending…' : 'End session'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Start an impersonation session as{' '}
                <span className="font-medium">{impTarget?.email}</span>? Every request made with the token is
                recorded under a UserSession row and logged in the audit trail.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setImpTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={startImpersonation}
                  disabled={impBusy}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {impBusy ? 'Starting…' : 'Start impersonation'}
                </button>
              </div>
            </div>
          )}
        </Dialog>

        {/* Recorded sessions (S8): sign-ins + impersonation, with inline end */}
        <Dialog
          open={!!sessionsUser}
          onOpenChange={(open) => {
            if (!open) setSessionsUser(null);
          }}
          title={`Sessions — ${sessionsUser ? `${sessionsUser.firstName} ${sessionsUser.lastName}` : ''}`}
          description="Recorded sign-ins and impersonation sessions (device, IP, activity)."
        >
          <div className="space-y-3">
            {sessionsLoading ? (
              <p className="text-sm text-gray-500 text-center py-6">Loading sessions…</p>
            ) : sessionsError ? (
              <p className="text-sm text-red-600 text-center py-6">{sessionsError}</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No recorded sessions for this user.</p>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto divide-y rounded border">
                {sessions.map((s) => (
                  <div key={s.id} className="px-3 py-2 text-sm flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {s.app}
                        {!s.isActive ? ' · ended' : ' · active'}
                        {s.app === 'impersonation' && s.deviceInfo?.impersonatorId ? ' · by admin' : ''}
                      </p>
                      <p className="text-xs text-gray-500 break-all">
                        {s.ipAddress || 'no IP'} · login {new Date(s.loginAt).toLocaleString()}
                        {s.deviceInfo?.userAgent ? ` · ${String(s.deviceInfo.userAgent).slice(0, 60)}` : ''}
                      </p>
                    </div>
                    {s.app === 'impersonation' && s.isActive && (
                      <button
                        type="button"
                        onClick={() => endSessionFromList(s.id)}
                        className="shrink-0 text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        End
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSessionsUser(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Dialog>
      </div>
    </div>
  );
}
