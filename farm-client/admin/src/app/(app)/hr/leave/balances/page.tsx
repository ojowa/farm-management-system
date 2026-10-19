'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Users } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { usePermission } from '@/lib/usePermission';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { useToast } from '@/lib/toasts';

interface BalanceCell {
  leaveTypeId: string;
  leaveTypeName: string;
  isPaid: boolean;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

interface BalanceRow {
  userId: string;
  userName: string;
  email?: string | null;
  leaveTypes: BalanceCell[];
}

export default function LeaveBalancesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const canRead = hasPermission('hr.read');
  const canEdit = hasPermission('hr.write');

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ row: BalanceRow; cell: BalanceCell } | null>(null);
  const [totalDays, setTotalDays] = useState('');
  const [saving, setSaving] = useState(false);

  const yearOptions = useMemo(() => {
    const years: Array<{ value: string; label: string }> = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      years.push({ value: String(y), label: String(y) });
    }
    return years;
  }, [currentYear]);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await apiClient.get('/leave/balance/all', { params: { year } });
      setRows(Array.isArray(data) ? data : data?.data || []);
    } catch (err: any) {
      setLoadError(err.response?.data?.message || 'Failed to load leave balances.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canRead) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead, year]);

  const columns = rows[0]?.leaveTypes || [];

  const openEdit = (row: BalanceRow, cell: BalanceCell) => {
    if (!canEdit) return;
    setEditing({ row, cell });
    setTotalDays(String(cell.totalDays));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const value = Number(totalDays);
    if (!Number.isFinite(value) || value < 0) {
      toast({ title: 'Total days must be a non-negative number', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      await apiClient.put('/leave/balance', {
        userId: editing.row.userId,
        leaveTypeId: editing.cell.leaveTypeId,
        year: Number(year),
        totalDays: value,
      });
      toast({ title: 'Balance updated', type: 'success' });
      setEditing(null);
      await load();
    } catch (err: any) {
      toast({ title: err.response?.data?.message || 'Failed to update balance', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!canRead) {
    return (
      <div className="text-center py-12 text-gray-500">
        You don&apos;t have permission to view leave balances.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/hr/leave"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Leave
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Team Leave Balances</h1>
          <p className="text-sm text-gray-500 mt-1">
            Every employee&apos;s allowance for the year — {canEdit ? 'click a cell to adjust a total.' : 'view only.'}
          </p>
        </div>
        <Select options={yearOptions} value={year} onChange={(e) => setYear(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      ) : loadError ? (
        <Card>
          <div className="text-center py-12">
            <p className="font-medium text-destructive">Failed to load balances</p>
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button variant="outline" className="mt-4" onClick={() => load()}>Retry</Button>
          </div>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              No employees found for {year}.
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  {columns.map((c) => (
                    <TableHead key={c.leaveTypeId}>
                      {c.leaveTypeName}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {c.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.userId}>
                    <TableCell>
                      <span className="font-medium">{row.userName}</span>
                      {row.email && (
                        <span className="block text-xs text-muted-foreground">{row.email}</span>
                      )}
                    </TableCell>
                    {row.leaveTypes.map((cell) => (
                      <TableCell key={cell.leaveTypeId}>
                        <button
                          type="button"
                          onClick={() => openEdit(row, cell)}
                          disabled={!canEdit}
                          className={`rounded px-2 py-1 text-left ${canEdit ? 'hover:bg-muted' : 'cursor-default'}`}
                          title={canEdit ? 'Edit total days' : undefined}
                        >
                          <span className="block font-semibold">{cell.remainingDays} left</span>
                          <span className="block text-xs text-muted-foreground">
                            {cell.usedDays}/{cell.totalDays} used
                          </span>
                        </button>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog
        open={!!editing}
        onOpenChange={(open) => { if (!open) setEditing(null); }}
        title="Adjust Leave Total"
        description={editing ? `${editing.row.userName} — ${editing.cell.leaveTypeName} (${year})` : undefined}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total days per year</label>
            <Input
              type="number"
              min="0"
              step="1"
              value={totalDays}
              onChange={(e) => setTotalDays(e.target.value)}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Used days ({editing?.cell.usedDays ?? 0}) are kept — only the allowance changes.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
