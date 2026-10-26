'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePermission } from '@/lib/usePermission';
import { rosterAPI, orgAdminAPI, departmentsAPI } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  /** ["MON", ...]; empty/missing = runs every day. */
  daysOfWeek?: string[];
  color: string;
  isActive: boolean;
  /** Optional department this shift is run for — the roster filters on it. */
  departmentId?: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  shiftId: string;
  userId: string;
  date: string;
  notes?: string | null;
  /** Display name attached server-side (bare userId otherwise). */
  userName?: string | null;
  shift?: Shift;
}

interface Person {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
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
/** Index in getDay() order (Sun=0) for each daysOfWeek token. */
const DAY_TOKENS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const SHIFT_COLORS: Record<string, string> = {
  '#3B82F6': 'bg-blue-500',
  '#10B981': 'bg-emerald-500',
  '#F59E0B': 'bg-amber-500',
  '#EF4444': 'bg-red-500',
  '#8B5CF6': 'bg-violet-500',
  '#EC4899': 'bg-pink-500',
};

function dayToken(date: Date) {
  return DAY_TOKENS[date.getDay()];
}

/** Shift runs on this date when daysOfWeek is empty or contains the weekday. */
function runsOnDay(date: Date, shift?: Shift) {
  const days = shift?.daysOfWeek;
  if (!days || days.length === 0) return true;
  return days.includes(dayToken(date));
}

function dateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

export default function RosterPage() {
  const { canCreate } = usePermission();
  const { toast } = useToast();

  // Shift management lives under the HR module server-side (hr.write).
  const canManage = canCreate('hr');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [workers, setWorkers] = useState<Person[]>([]);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftForm, setShiftForm] = useState({
    name: '',
    startTime: '08:00',
    endTime: '16:00',
    color: '#3B82F6',
    daysOfWeek: [] as string[],
    departmentId: '',
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
  const [assignNote, setAssignNote] = useState('');
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assignmentNote, setAssignmentNote] = useState('');
  const [copying, setCopying] = useState(false);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [sRes, aRes] = await Promise.all([
        rosterAPI.listShifts(departmentFilter ? { departmentId: departmentFilter } : undefined),
        rosterAPI.listAssignments({
          startDate: dateKey(weekDates[0]),
          endDate: dateKey(weekDates[6]),
        }),
      ]);
      const shiftRows = Array.isArray(sRes.data) ? sRes.data : sRes.data?.data || [];
      const assignmentRows = Array.isArray(aRes.data) ? aRes.data : aRes.data?.data || [];
      setShifts(shiftRows);
      setAssignments(assignmentRows);
      if (canManage) {
        try {
          const wRes = await orgAdminAPI.listUsers();
          setWorkers(Array.isArray(wRes.data) ? wRes.data : wRes.data?.data || []);
        } catch {
          // Names still resolve from the server-attached userName; the picker
          // is the only thing that degrades.
        }
      }
    } catch (err: any) {
      setLoadError(
        err.response?.data?.message || 'Failed to load the roster. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [dateKey(weekDates[0]), dateKey(weekDates[6]), canManage, departmentFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // Names for the legend, the filter and the form — loaded once, they never
  // change within a session, so no refetch on week navigation.
  useEffect(() => {
    let cancelled = false;
    departmentsAPI
      .list()
      .then((res: any) => {
        if (cancelled) return;
        setDepartments(res?.data?.data ?? res?.data ?? []);
      })
      .catch(() => {
        /* Filter and legend just show fewer labels. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const departmentName = (id?: string | null) =>
    id ? departments.find((d) => d.id === id)?.name || null : null;

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const goToday = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); setWeekStart(d); };

  const shiftById = useMemo(() => new Map(shifts.map((s) => [s.id, s])), [shifts]);

  const personName = (userId: string) => {
    const person = workers.find((w) => w.id === userId);
    if (person?.fullName) return person.fullName;
    if (person?.firstName || person?.lastName) {
      return `${person.firstName || ''} ${person.lastName || ''}`.trim();
    }
    return userId.slice(0, 8);
  };

  const getAssignmentsForDate = (date: Date) => {
    const key = dateKey(date);
    return assignments.filter((a) => (a.date || '').split('T')[0] === key);
  };

  const openShiftForm = (shift?: Shift) => {
    if (shift) {
      setEditingShift(shift);
      setShiftForm({
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        color: shift.color,
        daysOfWeek: shift.daysOfWeek || [],
        departmentId: shift.departmentId || '',
      });
    } else {
      setEditingShift(null);
      setShiftForm({
        name: '',
        startTime: '08:00',
        endTime: '16:00',
        color: '#3B82F6',
        daysOfWeek: [],
        departmentId: '',
      });
    }
    setShowShiftForm(true);
  };

  const toggleDay = (token: string) => {
    setShiftForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(token)
        ? f.daysOfWeek.filter((d) => d !== token)
        : [...f.daysOfWeek, token],
    }));
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.name.trim()) { toast({ title: 'Shift name is required', type: 'error' }); return; }
    setSaving(true);
    const payload = {
      name: shiftForm.name,
      startTime: shiftForm.startTime,
      endTime: shiftForm.endTime,
      color: shiftForm.color,
      daysOfWeek: shiftForm.daysOfWeek,
      // Null clears the link — the server only writes what it is given.
      departmentId: shiftForm.departmentId || null,
    };
    try {
      if (editingShift) { await rosterAPI.updateShift(editingShift.id, payload); toast({ title: 'Shift updated', type: 'success' }); }
      else { await rosterAPI.createShift(payload); toast({ title: 'Shift created', type: 'success' }); }
      setShowShiftForm(false);
      await loadData();
    } catch (err: any) { toast({ title: err.response?.data?.message || err.response?.data?.error || 'Failed to save', type: 'error' }); }
    finally { setSaving(false); }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Delete this shift?')) return;
    try { await rosterAPI.deleteShift(id); toast({ title: 'Shift deleted', type: 'success' }); await loadData(); }
    catch (err: any) { toast({ title: err.response?.data?.message || 'Failed to delete', type: 'error' }); }
  };

  const handleAssign = async (shiftId: string, userId: string, date: string) => {
    try {
      await rosterAPI.createAssignment({
        shiftId,
        userId,
        date,
        notes: assignNote.trim() || undefined,
      });
      toast({ title: 'Worker assigned', type: 'success' });
      setAssignNote('');
      await loadData();
    } catch (err: any) {
      // Surface the real reason (duplicate, non-running day, overlap).
      toast({ title: err.response?.data?.message || 'Failed to assign', type: 'error' });
    }
    setShowAssignModal(null);
  };

  const handleRemoveAssignment = async (id: string) => {
    try { await rosterAPI.deleteAssignment(id); toast({ title: 'Assignment removed', type: 'success' }); setEditingAssignment(null); await loadData(); }
    catch (err: any) { toast({ title: err.response?.data?.message || 'Failed to remove', type: 'error' }); }
  };

  const handleSaveAssignmentNote = async () => {
    if (!editingAssignment) return;
    setSaving(true);
    try {
      await rosterAPI.updateAssignment(editingAssignment.id, { notes: assignmentNote });
      toast({ title: 'Assignment updated', type: 'success' });
      setEditingAssignment(null);
      await loadData();
    } catch (err: any) {
      toast({ title: err.response?.data?.message || 'Failed to update assignment', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  /** Clone this week's assignments onto the following week (skips exact dupes). */
  const handleCopyWeek = async () => {
    setCopying(true);
    try {
      const nextStart = new Date(weekDates[0]);
      nextStart.setDate(nextStart.getDate() + 7);
      const nextEnd = new Date(weekDates[6]);
      nextEnd.setDate(nextEnd.getDate() + 7);

      const existingRes = await rosterAPI.listAssignments({
        startDate: dateKey(nextStart),
        endDate: dateKey(nextEnd),
      });
      const existing = Array.isArray(existingRes.data) ? existingRes.data : existingRes.data?.data || [];
      const taken = new Set(
        existing.map((a: Assignment) => `${a.shiftId}|${a.userId}|${(a.date || '').split('T')[0]}`)
      );

      const rows = assignments
        .map((a) => {
          const src = new Date((a.date || '').split('T')[0] + 'T00:00:00');
          const dst = new Date(src);
          dst.setDate(dst.getDate() + 7);
          return {
            shiftId: a.shiftId,
            userId: a.userId,
            date: dateKey(dst),
            notes: a.notes || undefined,
          };
        })
        .filter((r) => !taken.has(`${r.shiftId}|${r.userId}|${r.date}`));

      if (rows.length === 0) {
        toast({ title: 'Nothing to copy — next week already matches', type: 'info' });
        return;
      }

      await rosterAPI.bulkAssign(rows);
      toast({ title: `Copied ${rows.length} assignment${rows.length === 1 ? '' : 's'} to next week`, type: 'success' });
    } catch (err: any) {
      toast({ title: err.response?.data?.message || 'Failed to copy week', type: 'error' });
    } finally {
      setCopying(false);
    }
  };

  const totalWeekAssignments = assignments.length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Duty Roster</h1>
          <p className="text-sm text-gray-500 mt-1">Manage shift schedules and worker assignments</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            {totalWeekAssignments > 0 && (
              <Button variant="outline" onClick={handleCopyWeek} loading={copying}>
                Copy to Next Week
              </Button>
            )}
            <Button variant="ghost" onClick={() => openShiftForm()}>+ New Shift</Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Previous week">←</button>
          <button onClick={goToday} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">Today</button>
          <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Next week">→</button>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-gray-700">
            {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <Select
            aria-label="Filter shifts by department"
            className="w-48"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            options={[
              { value: '', label: 'All departments' },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      ) : loadError ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-lg font-medium text-destructive">Failed to load the roster</p>
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button variant="outline" className="mt-4" onClick={() => { setLoading(true); loadData(); }}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : shifts.filter((s) => s.isActive).length === 0 ? (
        /* Explicit empty state — no silent blank grid. */
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              {departmentFilter ? 'No shifts for that department.' : 'No shifts yet.'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {departmentFilter
                ? 'Pick another department or clear the filter to see the whole roster.'
                : canManage
                  ? 'Create a shift (e.g. Morning Shift), then assign workers to days.'
                  : 'Ask a manager to create shifts for the roster to appear.'}
            </p>
            {!departmentFilter && canManage && (
              <Button className="mt-4" onClick={() => openShiftForm()}>+ New Shift</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            {shifts.filter(s => s.isActive).map((shift) => (
              <div key={shift.id} className="flex items-center gap-2 text-sm">
                <span className={`w-3 h-3 rounded-full ${SHIFT_COLORS[shift.color] || 'bg-gray-400'}`} />
                <span className="text-gray-700">
                  {shift.name} ({shift.startTime}–{shift.endTime})
                  {shift.departmentId && (
                    <span className="text-gray-400"> · {departmentName(shift.departmentId) || 'Dept'}</span>
                  )}
                  {shift.daysOfWeek && shift.daysOfWeek.length > 0 && (
                    <span className="text-gray-400"> · {shift.daysOfWeek.map((d) => d[0] + d.slice(1).toLowerCase()).join(',')}</span>
                  )}
                </span>
                {canManage && (
                  <>
                    <button onClick={() => openShiftForm(shift)} className="text-xs text-green-600 hover:text-green-800">Edit</button>
                    <button onClick={() => handleDeleteShift(shift.id)} className="text-xs text-red-600 hover:text-red-800">Del</button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="grid grid-cols-7 gap-2 min-w-[720px]">
            {weekDates.map((date, i) => {
              const dayAssignments = getAssignmentsForDate(date);
              const isToday = dateKey(date) === dateKey(new Date());
              const runningShifts = shifts.filter((s) => s.isActive && runsOnDay(date, s));
              return (
                <div key={i} className={`rounded-lg border ${isToday ? 'border-green-400 bg-green-50/50' : 'border-gray-200'} min-h-[180px]`}>
                  <div className={`px-2 py-1.5 border-b ${isToday ? 'border-green-200' : 'border-gray-200'}`}>
                    <p className="text-xs text-gray-500">{DAY_NAMES[i]}</p>
                    <p className={`text-sm font-semibold ${isToday ? 'text-green-700' : 'text-gray-900'}`}>
                      {date.toLocaleDateString('en-US', { day: 'numeric' })}
                    </p>
                  </div>
                  <div className="p-1.5 space-y-1">
                    {dayAssignments.map((a) => {
                      const shift = a.shift || shiftById.get(a.shiftId);
                      const name = a.userName || personName(a.userId);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          title={`${name} · ${shift?.name || 'Shift'}${a.notes ? ` — ${a.notes}` : ''}`}
                          onClick={() => {
                            if (!canManage) return;
                            setEditingAssignment(a);
                            setAssignmentNote(a.notes || '');
                          }}
                          className={`w-full text-left text-xs px-2 py-1 rounded text-white truncate ${SHIFT_COLORS[shift?.color || ''] || 'bg-gray-400'} ${canManage ? 'hover:opacity-80' : ''}`}
                        >
                          {/* Worker name first — the chip is about who works it. */}
                          <span className="font-medium">{name}</span>
                          <span className="opacity-80"> · {shift?.name || 'Shift'}</span>
                          {a.notes && <span className="opacity-60"> · 📝</span>}
                        </button>
                      );
                    })}
                    {canManage && runningShifts.length > 0 && (
                      <button onClick={() => { setShowAssignModal(dateKey(date)); setAssignNote(''); }} className="text-xs text-green-600 hover:text-green-800 mt-1">+ Assign</button>
                    )}
                    {canManage && runningShifts.length === 0 && (
                      <p className="text-[10px] text-gray-400 mt-1">No shifts run {DAY_NAMES[i]}</p>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </>
      )}

      <Dialog
        open={showShiftForm}
        onOpenChange={setShowShiftForm}
        title={editingShift ? 'Edit Shift' : 'New Shift'}
      >
        <form onSubmit={handleSaveShift} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift Name</label>
                <Input value={shiftForm.name} onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })} required placeholder="e.g. Morning Shift" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <Input type="time" value={shiftForm.startTime} onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <Input type="time" value={shiftForm.endTime} onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <Select
                  value={shiftForm.departmentId}
                  onChange={(e) => setShiftForm({ ...shiftForm, departmentId: e.target.value })}
                  options={[
                    // Plain option, not `placeholder`: an empty department must
                    // stay selectable so a link can be cleared again.
                    { value: '', label: 'No department' },
                    ...departments.map((d) => ({ value: d.id, label: d.name })),
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Runs On</label>
                <div className="flex flex-wrap gap-1">
                  {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((token) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => toggleDay(token)}
                      className={`text-xs px-2 py-1 rounded border ${
                        shiftForm.daysOfWeek.includes(token)
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {token[0] + token.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {shiftForm.daysOfWeek.length === 0
                    ? 'No days selected — runs every day.'
                    : `Runs on ${shiftForm.daysOfWeek.length} day${shiftForm.daysOfWeek.length === 1 ? '' : 's'} per week.`}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex gap-2">
                  {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map((c) => (
                    <button key={c} type="button" onClick={() => setShiftForm({ ...shiftForm, color: c })} className={`w-8 h-8 rounded-full ${SHIFT_COLORS[c]} ${shiftForm.color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`} />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowShiftForm(false)}>Cancel</Button>
                <Button type="submit" loading={saving}>{editingShift ? 'Update' : 'Create'}</Button>
              </div>
            </form>
      </Dialog>

      <Dialog
        open={!!showAssignModal}
        onOpenChange={(open) => { if (!open) { setShowAssignModal(null); setAssignNote(''); } }}
        title={`Assign Worker — ${showAssignModal ?? ''}`}
      >
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(() => {
                const assignDate = showAssignModal
                  ? new Date(showAssignModal + 'T00:00:00')
                  : null;
                const runnable = shifts.filter((s) => s.isActive && (!assignDate || runsOnDay(assignDate, s)));
                if (workers.length === 0) {
                  return <p className="text-sm text-gray-500">No workers available</p>;
                }
                if (runnable.length === 0) {
                  return <p className="text-sm text-gray-500">No shifts run on this day.</p>;
                }
                return runnable.map((shift) => (
                  <div key={shift.id} className="border border-gray-200 rounded-lg p-3">
                    <p className="text-sm font-medium mb-2">{shift.name} ({shift.startTime}–{shift.endTime})</p>
                    <div className="flex flex-wrap gap-1">
                      {workers.map((w: any) => (
                        <button key={w.id} onClick={() => handleAssign(shift.id, w.id, showAssignModal ?? '')} className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-green-100 text-gray-700">
                          {w.firstName} {w.lastName}
                        </button>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
              <Input value={assignNote} onChange={(e) => setAssignNote(e.target.value)} placeholder="e.g. Cover for James" />
            </div>
            <div className="flex justify-end pt-4"><Button variant="ghost" onClick={() => { setShowAssignModal(null); setAssignNote(''); }}>Close</Button></div>
      </Dialog>

      {/* Edit an assignment's notes / remove it (managers only). */}
      <Dialog
        open={!!editingAssignment}
        onOpenChange={(open) => { if (!open) setEditingAssignment(null); }}
        title="Assignment"
        description={editingAssignment
          ? `${editingAssignment.userName || personName(editingAssignment.userId)} — ${(editingAssignment.shift || shiftById.get(editingAssignment.shiftId))?.name || 'Shift'} on ${new Date((editingAssignment.date || '').split('T')[0] + 'T00:00:00').toLocaleDateString()}`
          : undefined}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <Input
              value={assignmentNote}
              onChange={(e) => setAssignmentNote(e.target.value)}
              placeholder="Optional note"
            />
          </div>
          <div className="flex justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => editingAssignment && handleRemoveAssignment(editingAssignment.id)}
            >
              Remove
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditingAssignment(null)}>Cancel</Button>
              <Button type="button" loading={saving} onClick={handleSaveAssignmentNote}>Save</Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
