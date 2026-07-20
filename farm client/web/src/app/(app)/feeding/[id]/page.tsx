'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { feedingRecordsAPI } from '@/lib/api';
import { Card, Button, Modal, Input } from '@/components/ui';
import { useToasts } from '@/lib/toasts';

export default function FeedingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ feedType: '', quantityKg: '', date: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await feedingRecordsAPI.get(id);
      const r = data.record || data;
      setRecord(r);
      setForm({ feedType: r.feedType || '', quantityKg: r.quantityKg?.toString() || '', date: r.date ? r.date.split('T')[0] : '' });
    } catch { router.push('/feeding'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await feedingRecordsAPI.update(id, { ...form, quantityKg: Number(form.quantityKg) });
      success('Record updated');
      setShowEdit(false);
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this record?')) return;
    try { await feedingRecordsAPI.delete(id); success('Deleted'); router.push('/feeding'); }
    catch (err: any) { toastError(err.response?.data?.message || 'Failed to delete'); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!record) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.push('/feeding')} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← Back</button>
          <h1 className="text-2xl font-bold text-gray-900">Feeding Record</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowEdit(true)}>Edit</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card><p className="text-sm text-gray-500">Feed Type</p><p className="text-lg font-semibold">{record.feedType}</p></Card>
        <Card><p className="text-sm text-gray-500">Quantity</p><p className="text-lg font-semibold">{record.quantityKg} kg</p></Card>
        <Card><p className="text-sm text-gray-500">Date</p><p className="text-lg font-semibold">{record.date ? new Date(record.date).toLocaleDateString() : '—'}</p></Card>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Record">
        <form onSubmit={handleUpdate}>
          <Input label="Feed Type" required value={form.feedType} onChange={(e) => setForm({ ...form, feedType: e.target.value })} />
          <Input label="Quantity (kg)" type="number" required value={form.quantityKg} onChange={(e) => setForm({ ...form, quantityKg: e.target.value })} />
          <Input label="Date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" type="button" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
