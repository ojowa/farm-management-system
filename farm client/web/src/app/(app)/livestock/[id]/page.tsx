'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { livestockAPI } from '@/lib/api';
import { Card, Button, Modal, Input, Select, TextArea, Badge } from '@/components/ui';
import { useToasts } from '@/lib/toasts';

export default function LivestockDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [animal, setAnimal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'cattle', breed: '', status: 'healthy', tagNumber: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await livestockAPI.get(id);
      const a = data.animal || data;
      setAnimal(a);
      setForm({ name: a.name || '', type: a.type || 'cattle', breed: a.breed || '', status: a.status || 'healthy', tagNumber: a.tagNumber || '', notes: a.notes || '' });
    } catch { router.push('/livestock'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await livestockAPI.update(id, form);
      success('Animal updated');
      setShowEdit(false);
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this animal?')) return;
    try { await livestockAPI.delete(id); success('Animal deleted'); router.push('/livestock'); }
    catch (err: any) { toastError(err.response?.data?.message || 'Failed to delete'); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!animal) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.push('/livestock')} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← Back</button>
          <h1 className="text-2xl font-bold text-gray-900">{animal.name}</h1>
          <Badge color={({ healthy: 'green', sick: 'red', quarantined: 'yellow', sold: 'blue' } as Record<string, string>)[animal.status] || 'gray'}>{animal.status}</Badge>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowEdit(true)}>Edit</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card><p className="text-sm text-gray-500">Type</p><p className="text-lg font-semibold capitalize">{animal.type}</p></Card>
        <Card><p className="text-sm text-gray-500">Breed</p><p className="text-lg font-semibold">{animal.breed || '—'}</p></Card>
        <Card><p className="text-sm text-gray-500">Tag</p><p className="text-lg font-semibold">{animal.tagNumber || '—'}</p></Card>
        <Card><p className="text-sm text-gray-500">Weight</p><p className="text-lg font-semibold">{animal.weight ? `${animal.weight} kg` : '—'}</p></Card>
      </div>

      {animal.notes && <Card><p className="text-gray-700">{animal.notes}</p></Card>}

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Animal">
        <form onSubmit={handleUpdate}>
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="cattle">Cattle</option><option value="sheep">Sheep</option><option value="goat">Goat</option><option value="pig">Pig</option><option value="other">Other</option>
          </Select>
          <Input label="Breed" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="healthy">Healthy</option><option value="sick">Sick</option><option value="quarantined">Quarantined</option><option value="sold">Sold</option>
          </Select>
          <Input label="Tag Number" value={form.tagNumber} onChange={(e) => setForm({ ...form, tagNumber: e.target.value })} />
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
