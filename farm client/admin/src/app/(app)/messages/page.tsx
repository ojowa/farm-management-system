'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePermission } from '@/lib/usePermission';
import { messagesAPI, orgAdminAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/lib/toasts';

interface Message {
  id: string;
  subject: string;
  body: string;
  senderId: string;
  senderName: string;
  priority: string;
  createdAt: string;
  isRead?: boolean;
  readAt?: string;
  recipients?: Array<{ id: string; recipientId: string; recipientName: string; isRead: boolean }>;
}

type View = 'inbox' | 'sent' | 'compose' | 'message';

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'gray',
  NORMAL: 'blue',
  HIGH: 'orange',
  URGENT: 'red',
};

export default function MessagesPage() {
  const { canCreate } = usePermission();
  const { toast } = useToast();
  const { user } = useAuth();
  const canSend = canCreate('messaging');

  const [view, setView] = useState<View>('inbox');
  const [inbox, setInbox] = useState<Message[]>([]);
  const [sent, setSent] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [workers, setWorkers] = useState<any[]>([]);

  const [composeForm, setComposeForm] = useState({ subject: '', body: '', recipientIds: [] as string[], priority: 'NORMAL' });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [inboxRes, sentRes, unreadRes] = await Promise.all([
        messagesAPI.inbox(),
        messagesAPI.sent(),
        messagesAPI.unreadCount(),
      ]);
      setInbox(inboxRes.data);
      setSent(sentRes.data);
      setUnreadCount(unreadRes.data.count);
      if (canSend) {
        const wRes = await orgAdminAPI.listUsers();
        setWorkers(wRes.data);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [canSend]);

  useEffect(() => { loadData(); }, [loadData]);

  const openMessage = async (msg: Message) => {
    try {
      const { data } = await messagesAPI.get(msg.id);
      setSelected(data);
      setView('message');
      if (!msg.isRead) setUnreadCount((c) => Math.max(0, c - 1));
    } catch { toast({ title: 'Failed to load message', type: 'error' }); }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeForm.subject.trim() || !composeForm.body.trim()) {
      toast({ title: 'Subject and body are required', type: 'error' }); return;
    }
    if (composeForm.recipientIds.length === 0) {
      toast({ title: 'Select at least one recipient', type: 'error' }); return;
    }
    setSaving(true);
    try {
      await messagesAPI.send(composeForm);
      toast({ title: 'Message sent', type: 'success' });
      setComposeForm({ subject: '', body: '', recipientIds: [], priority: 'NORMAL' });
      setView('sent');
      await loadData();
    } catch (err: any) {
      toast({ title: err.response?.data?.error || 'Failed to send', type: 'error' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    try {
      await messagesAPI.delete(id);
      toast({ title: 'Message deleted', type: 'success' });
      setSelected(null);
      setView(view === 'message' ? 'inbox' : view);
      await loadData();
    } catch { toast({ title: 'Failed to delete', type: 'error' }); }
  };

  const toggleRecipient = (userId: string) => {
    setComposeForm((prev) => ({
      ...prev,
      recipientIds: prev.recipientIds.includes(userId)
        ? prev.recipientIds.filter((id) => id !== userId)
        : [...prev.recipientIds, userId],
    }));
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Messages {unreadCount > 0 && <span className="text-sm font-normal text-gray-500">({unreadCount} unread)</span>}
          </h1>
        </div>
        {canSend && <Button onClick={() => { setView('compose'); setSelected(null); }}>+ Compose</Button>}
      </div>

      <div className="flex gap-2 mb-4">
        {(['inbox', 'sent'] as const).map((v) => (
          <button key={v} onClick={() => { setView(v); setSelected(null); }} className={`px-4 py-2 text-sm rounded-lg transition-colors ${view === v || (view === 'message' && v === 'inbox') ? 'bg-green-100 text-green-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            {v === 'inbox' ? `Inbox ${unreadCount > 0 ? `(${unreadCount})` : ''}` : 'Sent'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading messages...</div>
      ) : view === 'compose' ? (
        <Card>
          <h2 className="text-lg font-semibold mb-4">New Message</h2>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipients</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {workers.length === 0 ? <p className="text-sm text-gray-500">No users available</p> : workers.map((w: any) => (
                  <button key={w.id} type="button" onClick={() => toggleRecipient(w.id)} className={`text-xs px-3 py-1.5 rounded-full transition-colors ${composeForm.recipientIds.includes(w.id) ? 'bg-green-100 text-green-700 font-medium border border-green-300' : 'bg-gray-100 text-gray-700 border border-transparent'}`}>
                    {w.firstName} {w.lastName}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Input label="Subject" value={composeForm.subject} onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })} required placeholder="Message subject" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select value={composeForm.priority} onChange={(e) => setComposeForm({ ...composeForm, priority: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea value={composeForm.body} onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })} rows={6} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required placeholder="Type your message..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setView('inbox')}>Cancel</Button>
              <Button type="submit" loading={saving}>Send</Button>
            </div>
          </form>
        </Card>
      ) : view === 'message' && selected ? (
        <Card>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">{selected.subject}</h2>
              <div className="flex gap-3 text-sm text-gray-500 mt-1">
                <span>From: <strong>{selected.senderName}</strong></span>
                <span>{formatDate(selected.createdAt)}</span>
                <Badge color={PRIORITY_COLORS[selected.priority] || 'gray'}>{selected.priority}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setView('inbox')}>← Back</Button>
              {selected.senderId === user?.id && (
                <button onClick={() => handleDelete(selected.id)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
              )}
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="text-sm whitespace-pre-wrap">{selected.body}</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {(view === 'inbox' ? inbox : sent).length === 0 ? (
            <Card><div className="text-center py-12"><p className="text-gray-500">{view === 'inbox' ? 'No messages yet' : 'No sent messages'}</p></div></Card>
          ) : (
            (view === 'inbox' ? inbox : sent).map((msg) => (
              <Card key={msg.id}>
                <button onClick={() => openMessage(msg)} className="w-full text-left flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {view === 'inbox' && !msg.isRead && <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />}
                      <h3 className={`text-sm ${!msg.isRead ? 'font-semibold' : 'font-medium'} text-gray-900 truncate`}>{msg.subject}</h3>
                      <Badge color={PRIORITY_COLORS[msg.priority] || 'gray'}>{msg.priority}</Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {view === 'inbox' ? `From: ${msg.senderName}` : `To: ${msg.recipients?.map((r) => r.recipientName).join(', ') || '—'}`}
                      {' · '}{formatDate(msg.createdAt)}
                    </p>
                  </div>
                </button>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
