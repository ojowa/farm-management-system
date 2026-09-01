'use client';

import React, { useState, useEffect } from 'react';
import { usePermission } from '@/lib/usePermission';
import { apiClient } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/lib/toasts';

interface LeaveType {
  id: string;
  name: string;
  daysPerYear: number;
  isPaid: boolean;
  isActive: boolean;
  _count?: { leaveRequests: number };
  createdAt: string;
}

export default function LeaveTypesPage() {
  const { canDelete } = usePermission();
  const { toast } = useToast();
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [form, setForm] = useState({ name: '', daysPerYear: '0', isPaid: true });
  const [saving, setSaving] = useState(false);

  const isOrgOwner = true;

  useEffect(() => { loadTypes(); }, []);

  async function loadTypes() {
    try { const { data } = await apiClient.get('/leave/types'); setTypes(data); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }

  const openForm = (type?: LeaveType) => {
    if (type) { setEditingType(type); setForm({ name: type.name, daysPerYear: String(type.daysPerYear), isPaid: type.isPaid }); }
    else { setEditingType(null); setForm({ name: '', daysPerYear: '0', isPaid: true }); }
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast({ title: 'Name is required', type: 'error' }); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), daysPerYear: parseInt(form.daysPerYear) || 0, isPaid: form.isPaid };
      if (editingType) { await apiClient.put(`/leave/types/${editingType.id}`, payload); toast({ title: 'Leave type updated', type: 'success' }); }
      else { await apiClient.post('/leave/types', payload); toast({ title: 'Leave type created', type: 'success' }); }
      setShowForm(false); await loadTypes();
    } catch (err: any) { toast({ title: err.response?.data?.error || 'Failed to save', type: 'error' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this leave type?')) return;
    try { await apiClient.delete(`/leave/types/${id}`); toast({ title: 'Leave type deleted', type: 'success' }); await loadTypes(); }
    catch { toast({ title: 'Failed to delete', type: 'error' }); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Types</h1>
          <p className="text-sm text-gray-500 mt-1">Configure leave categories for your organization</p>
        </div>
        {isOrgOwner && <Button onClick={() => openForm()}>+ New Type</Button>}
      </div>

      {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : types.length === 0 ? (
        <Card><div className="text-center py-12 text-gray-500">No leave types configured</div></Card>
      ) : (
        <div className="space-y-3">
          {types.map((type) => (
            <Card key={type.id}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{type.name}</span>
                    {type.isPaid ? <Badge color="green">Paid</Badge> : <Badge color="gray">Unpaid</Badge>}
                    {type.isActive ? <Badge color="blue">Active</Badge> : <Badge color="gray">Inactive</Badge>}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{type.daysPerYear} days/year · {type._count?.leaveRequests || 0} requests</p>
                </div>
                {isOrgOwner && (
                  <div className="flex gap-2">
                    <button onClick={() => openForm(type)} className="text-xs text-green-600 hover:text-green-800">Edit</button>
                    {canDelete('leave') && <button onClick={() => handleDelete(type.id)} className="text-xs text-red-600 hover:text-red-800">Delete</button>}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">{editingType ? 'Edit Leave Type' : 'New Leave Type'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Annual Leave" />
              <Input label="Days Per Year" type="number" value={form.daysPerYear} onChange={(e) => setForm({ ...form, daysPerYear: e.target.value })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isPaid} onChange={(e) => setForm({ ...form, isPaid: e.target.checked })} className="rounded border-gray-300 text-green-600" />
                Paid leave
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" loading={saving}>{editingType ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
