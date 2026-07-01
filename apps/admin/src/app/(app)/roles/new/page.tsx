'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { rolesAPI } from '@/lib/api';
import { Card, Input, Button } from '@/components/ui';
import { useReadOnly } from '@/lib/useReadOnly';

export default function NewRolePage() {
  const router = useRouter();
  const readOnly = useReadOnly();

  useEffect(() => {
    if (readOnly) router.replace('/roles');
  }, [readOnly, router]);

  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await rolesAPI.create({ name: form.name.trim(), description: form.description.trim() || undefined });
      router.push(`/roles/${data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create role');
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/roles" className="text-sm text-gray-500 hover:text-gray-700">Roles</Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Role</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. FIELD_SUPERVISOR"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What does this role do?"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Link href="/roles">
              <Button variant="secondary" type="button">Cancel</Button>
            </Link>
            <Button type="submit" loading={saving}>Create Role</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
