'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { usePermission } from '@/lib/usePermission';
import { rosterAPI, orgAdminAPI } from '@/lib/api';
import { Card, Button, Badge, Input } from '@/components/ui';
import { useToasts } from '@/lib/toasts';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
  isActive: boolean;
  _count?: { assignments: number };
}

interface Assignment {
  id: string;
  shiftId: string;
  userId: string;
  date: string;
  notes?: string;
  shift: Shift;
}

function getWeekDates(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return dt;
  });
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SHIFT_COLORS: Record<string, string> = {
  '#3B82F6': 'bg-blue-500',
  '#10B981': 'bg-emerald-500',
  '#F59E0B': 'bg-amber-500',
  '#EF4444': 'bg-red-500',
  '#8B5CF6': 'bg-violet-500',
  '#EC4899': 'bg-pink-500',
};

export default function RosterPage() {
  const { user } = useAuth();
  const { canCreate, canDelete } = usePermission();
  const { success, error: toastError } = useToasts();

  const canManage = canCreate('roster');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  });
  const [loading, setLoading] = useState(true);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftForm, setShiftForm] = useState({ name: '', startTime: '08:00', endTime: '16:00', color: '#3B82F6' });
  const [saving, setSaving] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const weekEnd = weekDates[6];

  const loadData = useCallback(async () => {
    try {
      const [sRes, aRes] = await Promise.all([
        rosterAPI.listShifts(),
        rosterAPI.listAssignments({
          startDate: weekDates[0].toISOString().split('T')[0],
          endDate: weekDates[6].toISOString().split('T')[0],
        }),
      ]);
      setShifts(sRes.data);
      setAssignments(aRes.data);
      if (canManage) {
        const wRes = await orgAdminAPI.listUsers();
        setWorkers(wRes.data);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [weekDates[0]?.toISOString(), weekDates[6]?.toISOString(), canManage]);

  useEffect(() => { loadData(); }, [loadData]);

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const goToday = () => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    setWeekStart(d);
  };

  const getAssignmentsForDate = (date: Date) => {
    const key = date.toISOString().split('T')[0];
    return assignments.filter((a) => a.date.split('T')[0] === key);
  };

  const openShiftForm = (shift?: Shift) => {
    if (shift) {
      setEditingShift(shift);
      setShiftForm({ name: shift.name, startTime: shift.startTime, endTime: shift.endTime, color: shift.color });
    } else {
      setEditingShift(null);
      setShiftForm({ name: '', startTime: '08:00', endTime: '16:00', color: '#3B82F6' });
    }
    setShowShiftForm(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.name.trim()) { toastError('Shift name is required'); return; }
    setSaving(true);
    try {
      if (editingShift) {
        await rosterAPI.updateShift(editingShift.id, shiftForm);
        success('Shift updated');
      } else {
        await rosterAPI.createShift(shiftForm);
        success('Shift created');
      }
      setShowShiftForm(false);
      await loadData();
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to save shift');
    } finally { setSaving(false); }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Delete this shift?')) return;
    try {
      await rosterAPI.deleteShift(id);
      success('Shift deleted');
      await loadData();
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to delete shift');
    }
  };

  const handleAssign = async (shiftId: string, userId: string, date: string) => {
    try {
      await rosterAPI.createAssignment({ shiftId, userId, date });
      success('Worker assigned');
      await loadData();
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to assign');
    }
    setShowAssignModal(null);
  };

  const handleRemoveAssignment = async (id: string) => {
    try {
      await rosterAPI.deleteAssignment(id);
      success('Assignment removed');
      await loadData();
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to remove');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Duty Roster</h1>
          <p className="text-sm text-gray-500 mt-1">Manage shift schedules and worker assignments</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => openShiftForm()}>+ New Shift</Button>
          </div>
        )}
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">←</button>
          <button onClick={goToday} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">Today</button>
          <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">→</button>
        </div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading roster...</div>
      ) : (
        <>
          {/* Shift Legend */}
          {shifts.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {shifts.filter(s => s.isActive).map((shift) => (
                <div key={shift.id} className="flex items-center gap-2 text-sm">
                  <span className={`w-3 h-3 rounded-full ${SHIFT_COLORS[shift.color] || 'bg-gray-400'}`} />
                  <span className="text-gray-700 dark:text-gray-300">{shift.name} ({shift.startTime}–{shift.endTime})</span>
                  {canManage && (
                    <>
                      <button onClick={() => openShiftForm(shift)} className="text-xs text-green-600 hover:text-green-800">Edit</button>
                      <button onClick={() => handleDeleteShift(shift.id)} className="text-xs text-red-600 hover:text-red-800">Del</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Weekly Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date, i) => {
              const dayAssignments = getAssignmentsForDate(date);
              const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
              return (
                <div key={i} className={`rounded-lg border ${isToday ? 'border-green-400 bg-green-50/50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700'} min-h-[180px]`}>
                  <div className={`px-2 py-1.5 border-b ${isToday ? 'border-green-200' : 'border-gray-200 dark:border-gray-700'}`}>
                    <p className="text-xs text-gray-500">{DAY_NAMES[i]}</p>
                    <p className={`text-sm font-semibold ${isToday ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                      {date.toLocaleDateString('en-US', { day: 'numeric' })}
                    </p>
                  </div>
                  <div className="p-1.5 space-y-1">
                    {dayAssignments.map((a) => (
                      <div
                        key={a.id}
                        className={`text-xs px-2 py-1 rounded text-white truncate ${SHIFT_COLORS[a.shift.color] || 'bg-gray-400'}`}
                        title={`${a.shift.name} — Worker #${a.userId.slice(0, 6)}`}
                      >
                        {a.shift.name}
                        {canManage && (
                          <button onClick={() => handleRemoveAssignment(a.id)} className="float-right text-white/60 hover:text-white ml-1">×</button>
                        )}
                      </div>
                    ))}
                    {canManage && shifts.length > 0 && (
                      <button
                        onClick={() => setShowAssignModal(date.toISOString().split('T')[0])}
                        className="text-xs text-green-600 hover:text-green-800 mt-1"
                      >+ Assign</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Shift Form Modal */}
      {showShiftForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingShift ? 'Edit Shift' : 'New Shift'}
            </h2>
            <form onSubmit={handleSaveShift} className="space-y-4">
              <Input
                label="Shift Name"
                value={shiftForm.name}
                onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                required
                placeholder="e.g. Morning Shift"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Time"
                  type="time"
                  value={shiftForm.startTime}
                  onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                  required
                />
                <Input
                  label="End Time"
                  type="time"
                  value={shiftForm.endTime}
                  onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex gap-2">
                  {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setShiftForm({ ...shiftForm, color: c })}
                      className={`w-8 h-8 rounded-full ${SHIFT_COLORS[c]} ${shiftForm.color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowShiftForm(false)}>Cancel</Button>
                <Button type="submit" loading={saving}>{editingShift ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Worker Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Assign Worker — {showAssignModal}</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {workers.length === 0 ? (
                <p className="text-sm text-gray-500">No workers available</p>
              ) : (
                shifts.filter(s => s.isActive).map((shift) => (
                  <div key={shift.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">{shift.name}</p>
                    <div className="flex flex-wrap gap-1">
                      {workers.map((w: any) => (
                        <button
                          key={w.id}
                          onClick={() => handleAssign(shift.id, w.id, showAssignModal)}
                          className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-700 dark:text-gray-300"
                        >
                          {w.firstName} {w.lastName}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end pt-4">
              <Button variant="ghost" onClick={() => setShowAssignModal(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
