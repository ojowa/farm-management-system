'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { cropsAPI } from '@/lib/api';
import { Card, Button, Modal, Input, Select, TextArea, Badge } from '@/components/ui';
import { useToasts } from '@/lib/toasts';

const STATUS_COLORS: Record<string, string> = { active: 'green', harvested: 'blue', failed: 'red', pending: 'yellow' };

export default function CropDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [crop, setCrop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ name: '', cropType: '', area: '', status: 'active', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await cropsAPI.get(id);
      const c = data.crop || data;
      setCrop(c);
      setForm({ name: c.name || '', cropType: c.cropType || '', area: c.area?.toString() || '', status: c.status || 'active', notes: c.notes || '' });
    } catch { router.push('/crops'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await cropsAPI.update(id, { name: form.name, cropType: form.cropType, area: form.area ? Number(form.area) : undefined, status: form.status, notes: form.notes });
      success('Crop updated');
      setShowEdit(false);
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this crop?')) return;
    try { await cropsAPI.delete(id); success('Crop deleted'); router.push('/crops'); }
    catch (err: any) { toastError(err.response?.data?.message || 'Failed to delete'); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!crop) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.push('/crops')} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← Back to Crops</button>
          <h1 className="text-2xl font-bold text-gray-900">{crop.name}</h1>
          <Badge color={STATUS_COLORS[crop.status] || 'gray'}>{crop.status}</Badge>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowEdit(true)}>Edit</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card><p className="text-sm text-gray-500">Type</p><p className="text-lg font-semibold">{crop.cropType || '—'}</p></Card>
        <Card><p className="text-sm text-gray-500">Area</p><p className="text-lg font-semibold">{crop.area ? `${crop.area} acres` : '—'}</p></Card>
        <Card><p className="text-sm text-gray-500">Planted</p><p className="text-lg font-semibold">{crop.plantedDate ? new Date(crop.plantedDate).toLocaleDateString() : '—'}</p></Card>
      </div>

      {crop.notes && <Card><p className="text-gray-700">{crop.notes}</p></Card>}

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Crop">
        <form onSubmit={handleUpdate}>
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Type" value={form.cropType} onChange={(e) => setForm({ ...form, cropType: e.target.value })} />
          <Input label="Area" type="number" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">Active</option><option value="pending">Pending</option><option value="harvested">Harvested</option><option value="failed">Failed</option>
          </Select>
          <TextArea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" type="button" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
