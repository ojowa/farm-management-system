'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/lib/toasts';

interface LeaveRequest {
  id: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: string;
  rejectionReason?: string;
  leaveType?: { name: string; isPaid: boolean };
  createdAt: string;
}

interface BalanceItem {
  leaveTypeId: string;
  leaveTypeName: string;
  isPaid: boolean;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

interface LeaveType {
  id: string;
  name: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'gray',
};

export default function LeavePage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<BalanceItem[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'requests' | 'balance'>('requests');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    Promise.all([loadRequests(), loadBalance(), loadLeaveTypes()]).finally(() => setLoading(false));
  }, []);

  async function loadRequests() {
    try { const { data } = await apiClient.get('/leave/requests'); setRequests(data); } catch { /* ignore */ }
  }
  async function loadBalance() {
    try { const { data } = await apiClient.get('/leave/balance'); setBalance(data); } catch { /* ignore */ }
  }
  async function loadLeaveTypes() {
    try { const { data } = await apiClient.get('/leave/types'); setLeaveTypes(data.filter((t: any) => t.isActive)); } catch { /* ignore */ }
  }

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leaveTypeId || !form.startDate || !form.endDate) { toast({ title: 'All fields required', type: 'error' }); return; }
    setSaving(true);
    try {
      await apiClient.post('/leave/requests', form);
      toast({ title: 'Leave request submitted', type: 'success' });
      setShowForm(false);
      setForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
      await Promise.all([loadRequests(), loadBalance()]);
    } catch (err: any) { toast({ title: err.response?.data?.error || 'Failed to submit', type: 'error' }); }
    finally { setSaving(false); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this leave request?')) return;
    try { await apiClient.put(`/leave/requests/${id}/cancel`); toast({ title: 'Request cancelled', type: 'success' }); await Promise.all([loadRequests(), loadBalance()]); }
    catch (err: any) { toast({ title: err.response?.data?.error || 'Failed to cancel', type: 'error' }); }
  };

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-sm text-gray-500 mt-1">Request and manage time off</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Request Leave</Button>
      </div>

      <div className="flex gap-4 border-b border-gray-200 mb-6">
        {(['requests', 'balance'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'requests' ? 'My Requests' : 'My Balance'}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : tab === 'requests' ? (
        <>
          <div className="flex gap-2 mb-4">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filter === f ? 'bg-green-100 text-green-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? <Card><div className="text-center py-12 text-gray-500">No leave requests found</div></Card> : (
            <div className="space-y-3">
              {filtered.map((req) => (
                <Card key={req.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{req.leaveType?.name || 'Unknown'}</span>
                        <Badge color={STATUS_COLORS[req.status] || 'gray'}>{req.status}</Badge>
                        <span className="text-sm text-gray-500">{req.days} day{req.days !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-sm text-gray-500">{new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate).toLocaleDateString()}</p>
                      {req.reason && <p className="text-sm text-gray-400 mt-1">{req.reason}</p>}
                    </div>
                    {req.status === 'PENDING' && <button onClick={() => handleCancel(req.id)} className="text-xs text-red-600 hover:text-red-800">Cancel</button>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {balance.length === 0 ? <Card><div className="text-center py-12 text-gray-500">No leave balance configured</div></Card> : (
            balance.map((b) => (
              <Card key={b.leaveTypeId}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{b.leaveTypeName}</span>
                    {b.isPaid ? <Badge color="green">Paid</Badge> : <Badge color="gray">Unpaid</Badge>}
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="text-center"><p className="text-gray-400 text-xs">Total</p><p className="font-semibold">{b.totalDays}</p></div>
                    <div className="text-center"><p className="text-gray-400 text-xs">Used</p><p className="font-semibold text-orange-600">{b.usedDays}</p></div>
                    <div className="text-center"><p className="text-gray-400 text-xs">Remaining</p><p className="font-semibold text-green-600">{b.remainingDays}</p></div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">Request Leave</h2>
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                <select value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required>
                  <option value="">Select type...</option>
                  {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Start Date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
                <Input label="End Date" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" loading={saving}>Submit Request</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
