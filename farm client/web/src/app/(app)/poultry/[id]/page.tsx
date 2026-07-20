'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { poultryAPI } from '@/lib/api';
import { Card, Button, Modal, Input, Select, TextArea, Badge } from '@/components/ui';
import { useToasts } from '@/lib/toasts';

export default function PoultryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [bird, setBird] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'chicken', breed: '', status: 'healthy', quantity: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await poultryAPI.get(id);
      const b = data.poultry || data.animal || data;
      setBird(b);
      setForm({ name: b.name || '', type: b.type || 'chicken', breed: b.breed || '', status: b.status || 'healthy', quantity: b.quantity?.toString() || '', notes: b.notes || '' });
    } catch { router.push('/poultry'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await poultryAPI.update(id, { ...form, quantity: form.quantity ? Number(form.quantity) : undefined });
      success('Poultry updated');
      setShowEdit(false);
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this entry?')) return;
    try { await poultryAPI.delete(id); success('Deleted'); router.push('/poultry'); }
    catch (err: any) { toastError(err.response?.data?.message || 'Failed to delete'); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!bird) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.push('/poultry')} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← Back</button>
          <h1 className="text-2xl font-bold text-gray-900">{bird.name}</h1>
          <Badge color={({ healthy: 'green', sick: 'red', quarantined: 'yellow', sold: 'blue' } as Record<string, string>)[bird.status] || 'gray'}>{bird.status}</Badge>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowEdit(true)}>Edit</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card><p className="text-sm text-gray-500">Type</p><p className="text-lg font-semibold capitalize">{bird.type}</p></Card>
        <Card><p className="text-sm text-gray-500">Breed</p><p className="text-lg font-semibold">{bird.breed || '—'}</p></Card>
        <Card><p className="text-sm text-gray-500">Quantity</p><p className="text-lg font-semibold">{bird.quantity || '—'}</p></Card>
        <Card><p className="text-sm text-gray-500">Weight</p><p className="text-lg font-semibold">{bird.weight ? `${bird.weight} kg` : '—'}</p></Card>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Poultry">
        <form onSubmit={handleUpdate}>
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="chicken">Chicken</option><option value="turkey">Turkey</option><option value="duck">Duck</option><option value="goose">Goose</option><option value="quail">Quail</option><option value="other">Other</option>
          </Select>
          <Input label="Breed" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="healthy">Healthy</option><option value="sick">Sick</option><option value="quarantined">Quarantined</option><option value="sold">Sold</option>
          </Select>
          <Input label="Quantity" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
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
