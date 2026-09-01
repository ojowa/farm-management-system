'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePermission } from '@/lib/usePermission';
import { correspondenceAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/lib/toasts';

interface Correspondence {
  id: string;
  referenceNumber: string;
  title: string;
  type: string;
  category: string;
  from?: string;
  to?: string;
  content?: string;
  status: string;
  priority: string;
  receivedDate?: string;
  createdById: string;
  createdByName: string;
  archivedAt?: string;
  attachments: Array<{ id: string; fileName: string; fileSize: number; fileUrl: string; fileType?: string }>;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  draft: number;
  sent: number;
  received: number;
  archived: number;
}

const TYPE_LABELS: Record<string, string> = {
  INCOMING: 'Incoming',
  OUTGOING: 'Outgoing',
  INTERNAL: 'Internal',
};

const CATEGORY_LABELS: Record<string, string> = {
  MEMO: 'Memo',
  LETTER: 'Letter',
  REPORT: 'Report',
  NOTICE: 'Notice',
  OTHER: 'Other',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'gray',
  SENT: 'blue',
  RECEIVED: 'green',
  ARCHIVED: 'purple',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'gray',
  NORMAL: 'blue',
  HIGH: 'orange',
  URGENT: 'red',
};

export default function CorrespondencePage() {
  const { canCreate, canDelete } = usePermission();
  const { toast } = useToast();
  const canWrite = canCreate('correspondence');
  const canDeleteItem = canDelete('correspondence');

  const [items, setItems] = useState<Correspondence[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Correspondence | null>(null);
  const [selectedItem, setSelectedItem] = useState<Correspondence | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    type: 'INCOMING',
    category: 'OTHER',
    from: '',
    to: '',
    content: '',
    status: 'DRAFT',
    priority: 'NORMAL',
    receivedDate: '',
  });

  const loadData = useCallback(async () => {
    try {
      const params: any = {};
      if (filter === 'archived') params.archived = 'true';
      else if (filter === 'active') params.archived = 'false';
      if (typeFilter) params.type = typeFilter;

      const [itemsRes, statsRes] = await Promise.all([
        correspondenceAPI.list(params),
        correspondenceAPI.stats(),
      ]);
      setItems(itemsRes.data);
      setStats(statsRes.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [filter, typeFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const openForm = (item?: Correspondence) => {
    if (item) {
      setEditingItem(item);
      setForm({
        title: item.title,
        type: item.type,
        category: item.category,
        from: item.from || '',
        to: item.to || '',
        content: item.content || '',
        status: item.status,
        priority: item.priority,
        receivedDate: item.receivedDate ? item.receivedDate.split('T')[0] : '',
      });
    } else {
      setEditingItem(null);
      setForm({ title: '', type: 'INCOMING', category: 'OTHER', from: '', to: '', content: '', status: 'DRAFT', priority: 'NORMAL', receivedDate: '' });
    }
    setSelectedItem(null);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast({ title: 'Title is required', type: 'error' }); return; }
    setSaving(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        type: form.type,
        category: form.category,
        from: form.from.trim() || null,
        to: form.to.trim() || null,
        content: form.content.trim() || null,
        status: form.status,
        priority: form.priority,
        receivedDate: form.receivedDate || null,
      };
      if (editingItem) {
        await correspondenceAPI.update(editingItem.id, payload);
        toast({ title: 'Correspondence updated', type: 'success' });
      } else {
        await correspondenceAPI.create(payload);
        toast({ title: 'Correspondence created', type: 'success' });
      }
      setShowForm(false);
      await loadData();
    } catch (err: any) {
      toast({ title: err.response?.data?.error || 'Failed to save', type: 'error' });
    } finally { setSaving(false); }
  };

  const handleArchive = async (id: string) => {
    try {
      await correspondenceAPI.archive(id);
      toast({ title: 'Archived', type: 'success' });
      setSelectedItem(null);
      await loadData();
    } catch { toast({ title: 'Failed to archive', type: 'error' }); }
  };

  const handleUnarchive = async (id: string) => {
    try {
      await correspondenceAPI.unarchive(id);
      toast({ title: 'Unarchived', type: 'success' });
      setSelectedItem(null);
      await loadData();
    } catch { toast({ title: 'Failed to unarchive', type: 'error' }); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this correspondence?')) return;
    try {
      await correspondenceAPI.delete(id);
      toast({ title: 'Deleted', type: 'success' });
      setSelectedItem(null);
      await loadData();
    } catch { toast({ title: 'Failed to delete', type: 'error' }); }
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  if (selectedItem) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{selectedItem.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{selectedItem.referenceNumber}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setSelectedItem(null)}>← Back</Button>
            {canWrite && <Button onClick={() => openForm(selectedItem)}>Edit</Button>}
          </div>
        </div>
        <Card>
          <div className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <Badge color={STATUS_COLORS[selectedItem.status] || 'gray'}>{selectedItem.status}</Badge>
              <Badge color={PRIORITY_COLORS[selectedItem.priority] || 'gray'}>{selectedItem.priority}</Badge>
              <Badge color="blue">{TYPE_LABELS[selectedItem.type] || selectedItem.type}</Badge>
              <Badge color="gray">{CATEGORY_LABELS[selectedItem.category] || selectedItem.category}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">From:</span> <span className="font-medium">{selectedItem.from || '—'}</span></div>
              <div><span className="text-gray-500">To:</span> <span className="font-medium">{selectedItem.to || '—'}</span></div>
              <div><span className="text-gray-500">Created by:</span> <span>{selectedItem.createdByName}</span></div>
              <div><span className="text-gray-500">Date:</span> <span>{formatDate(selectedItem.createdAt)}</span></div>
            </div>
            {selectedItem.content && (
              <div className="border-t pt-4"><p className="text-sm whitespace-pre-wrap">{selectedItem.content}</p></div>
            )}
            <div className="border-t pt-4 flex gap-2">
              {selectedItem.archivedAt ? (
                canWrite && <Button variant="ghost" onClick={() => handleUnarchive(selectedItem.id)}>Unarchive</Button>
              ) : (
                canWrite && <Button variant="ghost" onClick={() => handleArchive(selectedItem.id)}>Archive</Button>
              )}
              {canDeleteItem && (
                <button onClick={() => handleDelete(selectedItem.id)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Correspondence</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage internal/external documents</p>
        </div>
        {canWrite && <Button onClick={() => openForm()}>+ New</Button>}
      </div>

      {stats && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900' },
            { label: 'Draft', value: stats.draft, color: 'text-gray-500' },
            { label: 'Sent', value: stats.sent, color: 'text-blue-600' },
            { label: 'Received', value: stats.received, color: 'text-green-600' },
            { label: 'Archived', value: stats.archived, color: 'text-purple-600' },
          ].map((s) => (
            <Card key={s.label}>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'archived'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filter === f ? 'bg-green-100 text-green-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="ml-4 px-3 py-1.5 text-sm rounded-lg border border-gray-300">
          <option value="">All Types</option>
          <option value="INCOMING">Incoming</option>
          <option value="OUTGOING">Outgoing</option>
          <option value="INTERNAL">Internal</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : items.length === 0 ? (
        <Card><div className="text-center py-12"><p className="text-gray-500 mb-4">No correspondence found</p>{canWrite && <Button onClick={() => openForm()}>Create your first entry</Button>}</div></Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <button key={item.id} onClick={() => setSelectedItem(item)} className="w-full text-left">
              <Card>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-400">{item.referenceNumber}</span>
                      <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500">
                      <Badge color={STATUS_COLORS[item.status] || 'gray'}>{item.status}</Badge>
                      <Badge color={PRIORITY_COLORS[item.priority] || 'gray'}>{item.priority}</Badge>
                      <span>{TYPE_LABELS[item.type] || item.type}</span>
                    </div>
                  </div>
                  {item.archivedAt && <span className="text-xs text-purple-500">Archived</span>}
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">{editingItem ? 'Edit Correspondence' : 'New Correspondence'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Document title" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="INCOMING">Incoming</option>
                    <option value="OUTGOING">Outgoing</option>
                    <option value="INTERNAL">Internal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="MEMO">Memo</option>
                    <option value="LETTER">Letter</option>
                    <option value="REPORT">Report</option>
                    <option value="NOTICE">Notice</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" loading={saving}>{editingItem ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
