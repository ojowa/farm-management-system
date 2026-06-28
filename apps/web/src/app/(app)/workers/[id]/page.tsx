'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { workersAPI } from '@/lib/api';
import { Card, Button, Modal, Input, TextArea } from '@/components/ui';
import { useToasts } from '@/lib/toasts';

export default function WorkerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [worker, setWorker] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ fullName: '', role: '', phone: '', email: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await workersAPI.get(id);
      const w = data.worker || data;
      setWorker(w);
      setForm({ fullName: w.fullName || '', role: w.role || '', phone: w.phone || '', email: w.email || '', notes: w.notes || '' });
    } catch { router.push('/workers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await workersAPI.update(id, form);
      success('Worker updated');
      setShowEdit(false);
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Remove this worker?')) return;
    try { await workersAPI.delete(id); success('Worker removed'); router.push('/workers'); }
    catch (err: any) { toastError(err.response?.data?.message || 'Failed to remove'); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!worker) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.push('/workers')} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← Back</button>
          <h1 className="text-2xl font-bold text-gray-900">{worker.fullName}</h1>
          <p className="text-gray-500">{worker.role || 'No role assigned'}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowEdit(true)}>Edit</Button>
          <Button variant="danger" onClick={handleDelete}>Remove</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card><p className="text-sm text-gray-500">Phone</p><p className="text-lg font-semibold">{worker.phone || '—'}</p></Card>
        <Card><p className="text-sm text-gray-500">Email</p><p className="text-lg font-semibold">{worker.email || '—'}</p></Card>
        <Card><p className="text-sm text-gray-500">Status</p><p className="text-lg font-semibold capitalize">{worker.status || '—'}</p></Card>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Worker">
        <form onSubmit={handleUpdate}>
          <Input label="Full Name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Input label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <TextArea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" type="button" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
