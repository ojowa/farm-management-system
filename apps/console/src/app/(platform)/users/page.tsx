'use client';

import React, { useState, useEffect } from 'react';
import { platformUsersAPI } from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  organizationName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await platformUsersAPI.list({ page, limit: 20, search: search || undefined });
      setUsers(data.users);
      setTotal(data.total);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, [page, search]);

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this user?')) return;
    await platformUsersAPI.deactivate(id);
    loadUsers();
  };

  const handleForceLogout = async (id: string) => {
    if (!confirm('Force logout all sessions?')) return;
    await platformUsersAPI.forceLogout(id);
    alert('Sessions terminated');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users ({total})</h1>
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-2 border rounded-md w-64"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Organization</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No users found</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{u.firstName} {u.lastName}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">{u.role}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.organizationName}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm space-x-2">
                  <button onClick={() => handleForceLogout(u.id)} className="text-orange-600 hover:underline text-xs">Force Logout</button>
                  <button onClick={() => handleDeactivate(u.id)} className="text-red-600 hover:underline text-xs">Deactivate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">Previous</button>
        <span className="text-sm text-gray-600">Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={users.length < 20} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
