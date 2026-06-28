'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { medicationAPI } from '@/lib/api';
import { Card, Button, Modal, Input, Select, TextArea } from '@/components/ui';
import { useToasts } from '@/lib/toasts';

export default function MedicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [med, setMed] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'antibiotic', dosage: '', startDate: '', endDate: '', status: 'active', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await medicationAPI.get(id);
      const m = data.medication || data;
      setMed(m);
      setForm({
        name: m.name || '', type: m.type || 'antibiotic', dosage: m.dosage || '',
        startDate: m.startDate ? m.startDate.split('T')[0] : '',
        endDate: m.endDate ? m.endDate.split('T')[0] : '',
        status: m.status || 'active', notes: m.notes || '',
      });
    } catch { router.push('/medications'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await medicationAPI.update(id, form);
      success('Medication updated');
      setShowEdit(false);
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this medication?')) return;
    try { await medicationAPI.delete(id); success('Deleted'); router.push('/medications'); }
    catch (err: any) { toastError(err.response?.data?.message || 'Failed to delete'); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!med) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.push('/medications')} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← Back</button>
          <h1 className="text-2xl font-bold text-gray-900">{med.name}</h1>
          <span className="text-sm text-gray-500 capitalize">{med.type}</span>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowEdit(true)}>Edit</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card><p className="text-sm text-gray-500">Dosage</p><p className="text-lg font-semibold">{med.dosage}</p></Card>
        <Card><p className="text-sm text-gray-500">Start Date</p><p className="text-lg font-semibold">{med.startDate ? new Date(med.startDate).toLocaleDateString() : '—'}</p></Card>
        <Card><p className="text-sm text-gray-500">End Date</p><p className="text-lg font-semibold">{med.endDate ? new Date(med.endDate).toLocaleDateString() : '—'}</p></Card>
        <Card><p className="text-sm text-gray-500">Status</p><p className="text-lg font-semibold capitalize">{med.status}</p></Card>
      </div>

      {med.notes && <Card><p className="text-gray-700">{med.notes}</p></Card>}

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Medication">
        <form onSubmit={handleUpdate}>
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="antibiotic">Antibiotic</option><option value="vitamin">Vitamin</option><option value="vaccine">Vaccine</option><option value="supplement">Supplement</option><option value="other">Other</option>
          </Select>
          <Input label="Dosage" required value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} />
          <Input label="Start Date" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <Input label="End Date" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">Active</option><option value="completed">Completed</option><option value="discontinued">Discontinued</option>
          </Select>
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
