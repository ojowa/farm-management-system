'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, Users } from 'lucide-react';
import { usePermission } from '@/lib/usePermission';
import { apiClient } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';

interface LeaveRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: string;
  leaveType?: { name: string };
  // Attached by the server list endpoint so approvers can tell requests apart.
  requesterName?: string | null;
  createdAt: string;
}

interface BulkResult {
  succeeded: number;
  failed: number;
  failures?: Array<{ id: string; error: string }>;
}

export default function LeaveApprovalsPage() {
  const { hasAnyPermission } = usePermission();
  const router = useRouter();
  const { toast } = useToast();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [bulkWorking, setBulkWorking] = useState(false);

  const canApprove = hasAnyPermission('leave.approve', 'hr.write');

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years: Array<{ value: string; label: string }> = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      years.push({ value: String(y), label: String(y) });
    }
    return years;
  }, [currentYear]);

  useEffect(() => { loadRequests(); }, [filter, year]);

  async function loadRequests() {
    setLoading(true);
    setLoadError(null);
    try {
      const params: Record<string, string> = { year };
      if (filter !== 'all') params.status = filter.toUpperCase();
      const { data } = await apiClient.get('/leave/requests', { params });
      const rows = Array.isArray(data) ? data : data?.data || [];
      setRequests(rows);
      // Drop selections that no longer appear in the filtered list.
      setSelected((prev) => {
        const visible = new Set(rows.map((r: LeaveRequest) => r.id));
        const next = new Set([...prev].filter((id) => visible.has(id)));
        return next.size === prev.size ? prev : next;
      });
    } catch (err: any) {
      setLoadError(err.response?.data?.message || 'Failed to load leave requests.');
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async (id: string) => {
    try { await apiClient.put(`/leave/requests/${id}/approve`); toast({ title: 'Leave approved', type: 'success' }); setSelected((s) => { const n = new Set(s); n.delete(id); return n; }); await loadRequests(); }
    catch (err: any) { toast({ title: err.response?.data?.message || err.response?.data?.error || 'Failed to approve', type: 'error' }); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try { await apiClient.put(`/leave/requests/${rejectModal}/reject`, { rejectionReason: rejectReason || undefined }); toast({ title: 'Leave rejected', type: 'success' }); setRejectModal(null); setRejectReason(''); setSelected((s) => { const n = new Set(s); n.delete(rejectModal); return n; }); await loadRequests(); }
    catch (err: any) { toast({ title: err.response?.data?.message || err.response?.data?.error || 'Failed to reject', type: 'error' }); }
  };

  const pendingVisible = requests.filter((r) => r.status === 'PENDING');
  const allSelected = pendingVisible.length > 0 && pendingVisible.every((r) => selected.has(r.id));

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(pendingVisible.map((r) => r.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  /** One call clears the whole selection — server returns {succeeded, failed}. */
  const runBulk = async (action: 'approve' | 'reject', rejectionReason?: string) => {
    if (selected.size === 0) return;
    setBulkWorking(true);
    try {
      const { data } = await apiClient.put('/leave/requests/bulk', {
        ids: [...selected],
        action,
        rejectionReason,
      });
      const result: BulkResult = data || { succeeded: 0, failed: 0 };
      if (result.failed > 0) {
        toast({
          title: `${result.succeeded} ${action}d, ${result.failed} failed`,
          type: 'warning',
          message: result.failures?.map((f) => f.error).join('; '),
        });
      } else {
        toast({
          title: `${result.succeeded} request${result.succeeded === 1 ? '' : 's'} ${action}d`,
          type: 'success',
        });
      }
      setSelected(new Set());
      setBulkRejectOpen(false);
      setBulkRejectReason('');
      await loadRequests();
    } catch (err: any) {
      toast({ title: err.response?.data?.message || `Failed to ${action} requests`, type: 'error' });
    } finally {
      setBulkWorking(false);
    }
  };

  // The server accepts hr.write or the dedicated leave.approve permission.
  if (!canApprove) {
    return (
      <div className="text-center py-12 text-gray-500">
        You don&apos;t have permission to approve leave requests
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <Link
            href="/hr/leave"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Leave
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Leave Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">Review and approve team leave requests</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/hr/leave/balances')}>
          <Users className="mr-2 h-4 w-4" />
          Team Balances
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">
          {(['pending', 'all', 'approved', 'rejected'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filter === f ? 'bg-green-100 text-green-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <Select
          options={yearOptions}
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
      </div>

      {selected.size > 0 && (
        <Card className="mb-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-gray-700">
              {selected.size} request{selected.size === 1 ? '' : 's'} selected
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={bulkWorking} onClick={() => runBulk('approve')}>
                <CheckCircle className="mr-1 h-4 w-4" />
                Approve Selected
              </Button>
              <Button size="sm" variant="destructive" disabled={bulkWorking} onClick={() => setBulkRejectOpen(true)}>
                <XCircle className="mr-1 h-4 w-4" />
                Reject Selected
              </Button>
              <Button size="sm" variant="ghost" disabled={bulkWorking} onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      ) : loadError ? (
        <Card>
          <div className="text-center py-12">
            <p className="font-medium text-destructive">Failed to load leave requests</p>
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button variant="outline" className="mt-4" onClick={() => loadRequests()}>Retry</Button>
          </div>
        </Card>
      ) : requests.length === 0 ? (
        <Card><div className="text-center py-12 text-gray-500">No {filter === 'pending' ? 'pending' : ''} requests found for {year}</div></Card>
      ) : (
        <div className="space-y-3">
          {pendingVisible.length > 0 && filter !== 'all' && (
            <label className="flex items-center gap-2 text-sm text-gray-600 px-1">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4" />
              Select all pending
            </label>
          )}
          {requests.map((req) => (
            <Card key={req.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {req.status === 'PENDING' && (
                      <input
                        type="checkbox"
                        checked={selected.has(req.id)}
                        onChange={() => toggleOne(req.id)}
                        className="h-4 w-4 mt-0.5"
                        aria-label={`Select request from ${req.requesterName || 'worker'}`}
                      />
                    )}
                    <span className="font-medium text-gray-900">{req.leaveType?.name || 'Unknown'}</span>
                    <Badge color={req.status === 'PENDING' ? 'yellow' : req.status === 'APPROVED' ? 'green' : 'red'}>{req.status}</Badge>
                    <span className="text-sm text-gray-500">{req.days} day{req.days !== 1 ? 's' : ''}</span>
                  </div>
                  {req.requesterName && (
                    <p className="text-sm font-medium text-gray-700 mb-1">{req.requesterName}</p>
                  )}
                  <p className="text-sm text-gray-500">{new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate).toLocaleDateString()}</p>
                  {req.reason && <p className="text-sm text-gray-400 mt-1">{req.reason}</p>}
                </div>
                {req.status === 'PENDING' && (
                  <div className="flex gap-2 ml-4">
                    <button onClick={() => handleApprove(req.id)} className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">Approve</button>
                    <button onClick={() => setRejectModal(req.id)} className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Reject</button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!rejectModal}
        onOpenChange={(open) => { if (!open) { setRejectModal(null); setRejectReason(''); } }}
        title="Reject Leave Request"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Why is this being rejected?" />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={handleReject} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">Reject</button>
        </div>
      </Dialog>

      {/* Bulk reject — one reason applied to the whole selection. */}
      <Dialog
        open={bulkRejectOpen}
        onOpenChange={(open) => { if (!open) { setBulkRejectOpen(false); setBulkRejectReason(''); } }}
        title={`Reject ${selected.size} request${selected.size === 1 ? '' : 's'}`}
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
          <textarea
            value={bulkRejectReason}
            onChange={(e) => setBulkRejectReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Applied to every selected request"
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => { setBulkRejectOpen(false); setBulkRejectReason(''); }} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button
            onClick={() => runBulk('reject', bulkRejectReason || undefined)}
            disabled={bulkWorking}
            className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {bulkWorking ? 'Rejecting…' : 'Reject All'}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
