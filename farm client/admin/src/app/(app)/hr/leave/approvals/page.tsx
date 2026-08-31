'use client';

import React, { useState, useEffect } from 'react';
import { usePermission } from '@/lib/usePermission';
import { apiClient } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  createdAt: string;
}

export default function LeaveApprovalsPage() {
  const { canApprove } = usePermission();
  const { toast } = useToast();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { loadRequests(); }, [filter]);

  async function loadRequests() {
    try {
      const params = filter !== 'all' ? `?status=${filter.toUpperCase()}` : '';
      const { data } = await apiClient.get(`/leave/requests${params}`);
      setRequests(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  const handleApprove = async (id: string) => {
    try { await apiClient.put(`/leave/requests/${id}/approve`); toast({ title: 'Leave approved', type: 'success' }); await loadRequests(); }
    catch (err: any) { toast({ title: err.response?.data?.error || 'Failed to approve', type: 'error' }); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try { await apiClient.put(`/leave/requests/${rejectModal}/reject`, { rejectionReason: rejectReason || undefined }); toast({ title: 'Leave rejected', type: 'success' }); setRejectModal(null); setRejectReason(''); await loadRequests(); }
    catch (err: any) { toast({ title: err.response?.data?.error || 'Failed to reject', type: 'error' }); }
  };

  if (!canApprove('leave')) {
    return <div className="text-center py-12 text-gray-500">You don&apos;t have permission to approve leave requests</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leave Approvals</h1>
        <p className="text-sm text-gray-500 mt-1">Review and approve team leave requests</p>
      </div>

      <div className="flex gap-2 mb-4">
        {(['pending', 'all', 'approved', 'rejected'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filter === f ? 'bg-green-100 text-green-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : requests.length === 0 ? (
        <Card><div className="text-center py-12 text-gray-500">No {filter === 'pending' ? 'pending' : ''} requests found</div></Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{req.leaveType?.name || 'Unknown'}</span>
                    <Badge color={req.status === 'PENDING' ? 'yellow' : req.status === 'APPROVED' ? 'green' : 'red'}>{req.status}</Badge>
                    <span className="text-sm text-gray-500">{req.days} day{req.days !== 1 ? 's' : ''}</span>
                  </div>
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

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">Reject Leave Request</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Why is this being rejected?" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleReject} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
