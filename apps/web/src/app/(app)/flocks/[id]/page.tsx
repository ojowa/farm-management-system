'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { flocksAPI } from '@/lib/api';
import { Card, Button, Modal, Input, Select, Badge } from '@/components/ui';
import { useToasts } from '@/lib/toasts';

export default function FlockDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [flock, setFlock] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ birdCount: '', currentCount: '', status: 'ACTIVE', currentAgeDays: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await flocksAPI.get(id);
      const f = data.flock || data;
      setFlock(f);
      setForm({ birdCount: f.birdCount?.toString() || '', currentCount: f.currentCount?.toString() || '', status: f.status || 'ACTIVE', currentAgeDays: f.currentAgeDays?.toString() || '' });
    } catch { router.push('/flocks'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await flocksAPI.update(id, { ...form, birdCount: Number(form.birdCount), currentCount: Number(form.currentCount), currentAgeDays: Number(form.currentAgeDays) });
      success('Flock updated');
      setShowEdit(false);
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this flock?')) return;
    try { await flocksAPI.delete(id); success('Flock deleted'); router.push('/flocks'); }
    catch (err: any) { toastError(err.response?.data?.message || 'Failed to delete'); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!flock) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.push('/flocks')} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← Back</button>
          <h1 className="text-2xl font-bold text-gray-900">Flock: {flock.batchCode}</h1>
          <Badge color={(STATUS_COLORS as Record<string, string>)[flock.status] || 'gray'}>{flock.status}</Badge>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowEdit(true)}>Edit</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card><p className="text-sm text-gray-500">Current / Total Birds</p><p className="text-lg font-semibold">{flock.currentCount} / {flock.birdCount}</p></Card>
        <Card><p className="text-sm text-gray-500">Age (days)</p><p className="text-lg font-semibold">{flock.currentAgeDays || '—'}</p></Card>
        <Card><p className="text-sm text-gray-500">Breed</p><p className="text-lg font-semibold">{flock.breedName || '—'}</p></Card>
        <Card><p className="text-sm text-gray-500">Arrival Date</p><p className="text-lg font-semibold">{flock.arrivalDate ? new Date(flock.arrivalDate).toLocaleDateString() : '—'}</p></Card>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Flock">
        <form onSubmit={handleUpdate}>
          <Input label="Bird Count" type="number" required value={form.birdCount} onChange={(e) => setForm({ ...form, birdCount: e.target.value })} />
          <Input label="Current Count" type="number" required value={form.currentCount} onChange={(e) => setForm({ ...form, currentCount: e.target.value })} />
          <Input label="Age (days)" type="number" value={form.currentAgeDays} onChange={(e) => setForm({ ...form, currentAgeDays: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="ACTIVE">Active</option><option value="SOLD">Sold</option><option value="DECEASED">Deceased</option><option value="COMPLETED">Completed</option>
          </Select>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" type="button" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = { ACTIVE: 'green', SOLD: 'blue', DECEASED: 'red', COMPLETED: 'gray' };
