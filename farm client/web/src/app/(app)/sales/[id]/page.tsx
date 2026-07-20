'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { poultrySalesAPI } from '@/lib/api';
import { Card, Button, Modal, Input, Select, TextArea } from '@/components/ui';
import { useToasts } from '@/lib/toasts';

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ productName: '', quantity: '', unit: 'kg', totalPrice: '', buyerName: '', date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await poultrySalesAPI.get(id);
      const s = data.sale || data;
      setSale(s);
      setForm({
        productName: s.productName || '', quantity: s.quantity?.toString() || '', unit: s.unit || 'kg',
        totalPrice: s.totalPrice?.toString() || '', buyerName: s.buyerName || '',
        date: s.date ? s.date.split('T')[0] : '', notes: s.notes || '',
      });
    } catch { router.push('/sales'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await poultrySalesAPI.update(id, { ...form, quantity: Number(form.quantity), totalPrice: Number(form.totalPrice) });
      success('Sale updated');
      setShowEdit(false);
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this sale?')) return;
    try { await poultrySalesAPI.delete(id); success('Deleted'); router.push('/sales'); }
    catch (err: any) { toastError(err.response?.data?.message || 'Failed to delete'); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!sale) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.push('/sales')} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← Back</button>
          <h1 className="text-2xl font-bold text-gray-900">{sale.productName}</h1>
          <span className="text-sm text-gray-500 capitalize">{sale.productType}</span>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowEdit(true)}>Edit</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card><p className="text-sm text-gray-500">Quantity</p><p className="text-lg font-semibold">{sale.quantity} {sale.unit}</p></Card>
        <Card><p className="text-sm text-gray-500">Total Price</p><p className="text-2xl font-bold text-green-600">${sale.totalPrice?.toLocaleString()}</p></Card>
        <Card><p className="text-sm text-gray-500">Buyer</p><p className="text-lg font-semibold">{sale.buyerName || '—'}</p></Card>
        <Card><p className="text-sm text-gray-500">Date</p><p className="text-lg font-semibold">{sale.date ? new Date(sale.date).toLocaleDateString() : '—'}</p></Card>
      </div>

      {sale.notes && <Card><p className="text-gray-700">{sale.notes}</p></Card>}

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Sale">
        <form onSubmit={handleUpdate}>
          <Input label="Product Name" required value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
          <Input label="Quantity" type="number" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <Select label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            <option value="kg">kg</option><option value="pieces">pieces</option><option value="liters">liters</option><option value="tons">tons</option><option value="crates">crates</option>
          </Select>
          <Input label="Total Price ($)" type="number" required value={form.totalPrice} onChange={(e) => setForm({ ...form, totalPrice: e.target.value })} />
          <Input label="Buyer Name" value={form.buyerName} onChange={(e) => setForm({ ...form, buyerName: e.target.value })} />
          <Input label="Date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <TextArea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" type="button" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
