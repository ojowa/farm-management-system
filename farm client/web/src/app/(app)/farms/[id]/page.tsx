'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { farmsAPI } from '@/lib/api';
import { Card, Button, Input, TextArea, Modal } from '@/components/ui';
import { useToasts } from '@/lib/toasts';

const FARM_TYPE_COLORS: Record<string, string> = {
  CROP: 'bg-green-100 text-green-800',
  LIVESTOCK: 'bg-amber-100 text-amber-800',
  POULTRY: 'bg-orange-100 text-orange-800',
  DAIRY: 'bg-blue-100 text-blue-800',
  AQUACULTURE: 'bg-cyan-100 text-cyan-800',
};

const FARM_TYPE_LABELS: Record<string, string> = {
  CROP: 'Crop',
  LIVESTOCK: 'Livestock',
  POULTRY: 'Poultry',
  DAIRY: 'Dairy',
  AQUACULTURE: 'Aquaculture',
};

export default function FarmDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [farm, setFarm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', size: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const { data } = await farmsAPI.get(id);
      setFarm(data.farm || data);
      setForm({
        name: (data.farm || data).name || '',
        location: (data.farm || data).location || '',
        size: (data.farm || data).size?.toString() || '',
        description: (data.farm || data).description || '',
      });
    } catch { router.push('/farms'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await farmsAPI.update(id, { name: form.name, location: form.location, size: form.size ? Number(form.size) : undefined, description: form.description });
      success('Farm updated');
      setShowEdit(false);
      load();
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this farm?')) return;
    setDeleting(true);
    try {
      await farmsAPI.delete(id);
      success('Farm deleted');
      router.push('/farms');
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to delete');
    } finally { setDeleting(false); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!farm) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.push('/farms')} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← Back to Farms</button>
          <h1 className="text-2xl font-bold text-gray-900">{farm.name}</h1>
          {farm.location && <p className="text-gray-500 mt-1">{farm.location}</p>}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowEdit(true)}>Edit</Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>Delete</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <p className="text-sm text-gray-500">Type</p>
          <p className="text-lg font-semibold">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              FARM_TYPE_COLORS[farm.farmType] || 'bg-gray-100 text-gray-800'
            }`}>
              {FARM_TYPE_LABELS[farm.farmType] || farm.farmType || 'Unknown'}
            </span>
          </p>
        </Card>
        <Card><p className="text-sm text-gray-500">Size</p><p className="text-lg font-semibold">{farm.size ? `${farm.size} ${farm.sizeUnit || 'acres'}` : '—'}</p></Card>
        <Card><p className="text-sm text-gray-500">Location</p><p className="text-lg font-semibold">{farm.location || '—'}</p></Card>
        <Card><p className="text-sm text-gray-500">Created</p><p className="text-lg font-semibold">{new Date(farm.createdAt).toLocaleDateString()}</p></Card>
      </div>

      {farm.description && (
        <Card><p className="text-gray-700">{farm.description}</p></Card>
      )}

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Farm">
        <form onSubmit={handleUpdate}>
          <Input label="Farm Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <Input label="Size" type="number" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
          <TextArea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" type="button" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
