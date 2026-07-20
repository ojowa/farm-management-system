'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { mortalityRecordsAPI } from '@/lib/api';
import { Card, Button, Modal, Input, TextArea } from '@/components/ui';
import { useToasts } from '@/lib/toasts';

export default function MortalityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ count: '', cause: '', date: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await mortalityRecordsAPI.get(id);
      const r = data.record || data;
      setRecord(r);
      setForm({ count: r.count?.toString() || '', cause: r.cause || '', date: r.date ? r.date.split('T')[0] : '' });
    } catch { router.push('/mortality'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await mortalityRecordsAPI.update(id, { ...form, count: Number(form.count) });
      success('Record updated');
      setShowEdit(false);
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this record?')) return;
    try { await mortalityRecordsAPI.delete(id); success('Deleted'); router.push('/mortality'); }
    catch (err: any) { toastError(err.response?.data?.message || 'Failed to delete'); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!record) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.push('/mortality')} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← Back</button>
          <h1 className="text-2xl font-bold text-gray-900">Mortality Record</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowEdit(true)}>Edit</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card><p className="text-sm text-gray-500">Count</p><p className="text-2xl font-bold text-red-600">{record.count}</p></Card>
        <Card><p className="text-sm text-gray-500">Cause</p><p className="text-lg font-semibold">{record.cause || '—'}</p></Card>
        <Card><p className="text-sm text-gray-500">Date</p><p className="text-lg font-semibold">{record.date ? new Date(record.date).toLocaleDateString() : '—'}</p></Card>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Record">
        <form onSubmit={handleUpdate}>
          <Input label="Count" type="number" required value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} />
          <TextArea label="Cause" value={form.cause} onChange={(e) => setForm({ ...form, cause: e.target.value })} rows={2} />
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
