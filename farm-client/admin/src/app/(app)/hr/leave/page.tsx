'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/lib/toasts';
import { usePermission } from '@/lib/usePermission';

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
  // Attached by the server list endpoint so managers can tell requests apart.
  requesterName?: string | null;
  workerId?: string | null;
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

interface WorkerOnLeave {
  workerId: string;
  name: string;
  position: string;
  leaveType: string | null;
  isPaid: boolean | null;
  startDate: string;
  endDate: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'gray',
};

export default function LeavePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { hasAnyPermission, hasPermission } = usePermission();
  // Submitting and cancelling your own requests is leave.write on the server.
  const canRequest = hasAnyPermission('leave.write', 'hr.write');
  // The on-leave roster lists the whole org, so it's a manager view (hr.read).
  const canSeeRoster = hasPermission('hr.read');
  // Filing leave for a worker, and modifying anyone's request, is hr.write.
  const canFileForWorker = hasPermission('hr.write');
  // Approving/rejecting lives on /hr/leave/approvals and needs hr.write or
  // the dedicated leave.approve grant (same gate the server enforces).
  const canApprove = hasAnyPermission('leave.approve', 'hr.write');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<BalanceItem[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [onLeave, setOnLeave] = useState<WorkerOnLeave[]>([]);
  const [workers, setWorkers] = useState<{ id: string; firstName: string; lastName: string; position?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'requests' | 'balance'>('requests');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '', workerId: '' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    Promise.all([loadRequests(), loadBalance(), loadLeaveTypes(), loadOnLeave(), loadWorkers()]).finally(() => setLoading(false));
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
  async function loadOnLeave() {
    if (!canSeeRoster) return;
    try { const { data } = await apiClient.get('/leave/requests/on-leave'); setOnLeave(data); } catch { /* ignore */ }
  }
  async function loadWorkers() {
    if (!canFileForWorker) return;
    try {
      const { data } = await apiClient.get('/workers', { params: { limit: 200 } });
      setWorkers(Array.isArray(data) ? data : data?.data || []);
    } catch { /* ignore */ }
  }

  const resetForm = () => setForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '', workerId: '' });

  const openCreate = () => { resetForm(); setEditingId(null); setShowForm(true); };

  const openEdit = (req: LeaveRequest) => {
    setEditingId(req.id);
    setForm({
      leaveTypeId: req.leaveTypeId,
      startDate: String(req.startDate).slice(0, 10),
      endDate: String(req.endDate).slice(0, 10),
      reason: req.reason || '',
      workerId: req.workerId || '',
    });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); resetForm(); };

  // Workers edit their own pending requests; owners/managers (hr.write) can
  // also fix rejected ones (resubmitted as pending) and adjust approved ones.
  const canEdit = (req: LeaveRequest) =>
    req.status !== 'CANCELLED' && canRequest && (canFileForWorker || req.status === 'PENDING');

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leaveTypeId || !form.startDate || !form.endDate) { toast({ title: 'All fields required', type: 'error' }); return; }
    setSaving(true);
    try {
      const payload = {
        leaveTypeId: form.leaveTypeId,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason || undefined,
        ...(editingId || !form.workerId ? {} : { workerId: form.workerId }),
      };
      if (editingId) {
        await apiClient.put(`/leave/requests/${editingId}`, payload);
        toast({ title: 'Leave request updated', type: 'success' });
      } else {
        await apiClient.post('/leave/requests', payload);
        toast({ title: 'Leave request submitted', type: 'success' });
      }
      closeForm();
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
  // Requests already load org-wide for approvers (the server scopes non-hr.write
  // callers to their own), so the badge count matches what the approvals page
  // would show them.
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-sm text-gray-500 mt-1">Request and manage time off</p>
        </div>
        <div className="flex items-center gap-2">
          {canApprove && (
            <Button variant="outline" size="sm" onClick={() => router.push('/hr/leave/approvals')}>
              Approvals
              {pendingCount > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-yellow-100 px-1.5 text-xs font-medium text-yellow-800">
                  {pendingCount}
                </span>
              )}
            </Button>
          )}
          {canRequest && <Button onClick={openCreate}>+ Request Leave</Button>}
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 mb-6">
        {(['requests', 'balance'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'requests' ? (canSeeRoster ? 'All Requests' : 'My Requests') : 'My Balance'}
          </button>
        ))}
      </div>

      {canSeeRoster && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-900">Who&apos;s Off Today</h2>
            <span className="text-xs text-gray-500">{onLeave.length} on leave</span>
          </div>
          {onLeave.length === 0 ? (
            <Card className="p-4"><p className="text-sm text-gray-500">No one is on approved leave today.</p></Card>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {onLeave.map((w) => (
                <Card key={w.workerId} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{w.name}</p>
                    <Badge variant="secondary">{w.isPaid ? 'Paid' : 'Unpaid'}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{w.position}{w.leaveType ? ` • ${w.leaveType}` : ''}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(w.startDate).toLocaleDateString()} — {new Date(w.endDate).toLocaleDateString()}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

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
                      {req.requesterName && <p className="text-sm font-medium text-gray-700 mb-1">{req.requesterName}</p>}
                      <p className="text-sm text-gray-500">{new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate).toLocaleDateString()}</p>
                      {req.reason && <p className="text-sm text-gray-400 mt-1">{req.reason}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      {canEdit(req) && <button onClick={() => openEdit(req)} className="text-xs text-green-700 hover:text-green-900">Edit</button>}
                      {req.status === 'PENDING' && <button onClick={() => handleCancel(req.id)} className="text-xs text-red-600 hover:text-red-800">Cancel</button>}
                    </div>
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
                <div className="flex flex-wrap items-center justify-between gap-3">
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

      <Dialog open={showForm} onOpenChange={(open) => (open ? setShowForm(true) : closeForm())} title={editingId ? 'Edit Leave Request' : 'Request Leave'}>
        <form onSubmit={handleRequest} className="space-y-4">
              {canFileForWorker && !editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">For</label>
                  <select value={form.workerId} onChange={(e) => setForm({ ...form, workerId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="">Me</option>
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>{`${w.firstName} ${w.lastName}${w.position ? ` — ${w.position}` : ''}`}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Leave filed for a worker appears on their record and in approvals.</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                <select value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required>
                  <option value="">Select type...</option>
                  {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={closeForm}>Cancel</Button>
                <Button type="submit" loading={saving}>{editingId ? 'Save Changes' : 'Submit Request'}</Button>
              </div>
            </form>
      </Dialog>
    </div>
  );
}
