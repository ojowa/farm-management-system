'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { inventoryAPI } from '@/lib/api';
import { Card, Button, Modal, Input, Select, TextArea } from '@/components/ui';
import { useToasts } from '@/lib/toasts';

export default function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', quantity: '', unit: '', costPerUnit: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await inventoryAPI.get(id);
      const i = data.item || data;
      setItem(i);
      setForm({ name: i.name || '', category: i.category || '', quantity: i.quantity?.toString() || '', unit: i.unit || '', costPerUnit: i.costPerUnit?.toString() || '', notes: i.notes || '' });
    } catch { router.push('/inventory'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await inventoryAPI.update(id, { ...form, quantity: Number(form.quantity), costPerUnit: form.costPerUnit ? Number(form.costPerUnit) : undefined });
      success('Item updated');
      setShowEdit(false);
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this item?')) return;
    try { await inventoryAPI.delete(id); success('Deleted'); router.push('/inventory'); }
    catch (err: any) { toastError(err.response?.data?.message || 'Failed to delete'); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!item) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.push('/inventory')} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← Back</button>
          <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowEdit(true)}>Edit</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card><p className="text-sm text-gray-500">Category</p><p className="text-lg font-semibold capitalize">{item.category}</p></Card>
        <Card><p className="text-sm text-gray-500">Quantity</p><p className="text-lg font-semibold">{item.quantity} {item.unit}</p></Card>
        <Card><p className="text-sm text-gray-500">Cost/Unit</p><p className="text-lg font-semibold">{item.costPerUnit ? `$${item.costPerUnit}` : '—'}</p></Card>
        <Card><p className="text-sm text-gray-500">Total Value</p><p className="text-lg font-semibold">{item.costPerUnit ? `$${(item.quantity * item.costPerUnit).toFixed(2)}` : '—'}</p></Card>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Item">
        <form onSubmit={handleUpdate}>
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="seeds">Seeds</option><option value="fertilizer">Fertilizer</option><option value="feed">Feed</option><option value="medicine">Medicine</option><option value="tools">Tools</option><option value="fuel">Fuel</option><option value="other">Other</option>
          </Select>
          <Input label="Quantity" type="number" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <Input label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          <Input label="Cost per Unit ($)" type="number" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} />
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
