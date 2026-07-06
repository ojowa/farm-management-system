'use client';

import React, { useState, useMemo } from 'react';
import { attendanceAPI, workersAPI } from '@/lib/api';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { Card, Button, Badge, Input, Select, LoadingSpinner, EmptyState, Modal } from '@/components/ui';
import { useToasts } from '@/lib/toasts';
import { usePermission } from '@/lib/usePermission';

interface TodaySummary {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  onLeave: number;
}

interface AttendanceRecord {
  id: string;
  workerId: string;
  workerName: string;
  clockIn: string;
  clockOut: string | null;
  hoursWorked: number | null;
  status: string;
  date: string;
}

interface Worker {
  id: string;
  name: string;
  role: string;
}

interface WorkerRow {
  workerId: string;
  workerName: string;
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: number | null;
  status: string;
  hasRecord: boolean;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'present': return 'green';
    case 'absent': return 'red';
    case 'late': return 'orange';
    case 'half-day': return 'yellow';
    case 'on-leave': return 'gray';
    default: return 'gray';
  }
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

export default function AttendancePage() {
  const { success, error: toastError } = useToasts();
  const { canUpdate } = usePermission();
  const today = useMemo(() => formatDate(new Date()), []);

  const [selectedDate, setSelectedDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState('');
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOutId, setClockingOutId] = useState<string | null>(null);

  const {
    data: todayData,
    loading: todayLoading,
    refetch: refetchToday,
  } = useFetch<{ data: TodaySummary }>(
    'attendance-today',
    () => attendanceAPI.getToday(),
    { cacheTime: 30_000 }
  );

  const {
    data: attendanceData,
    loading: attendanceLoading,
    refetch: refetchAttendance,
  } = useFetch<{ data: AttendanceRecord[] }>(
    `attendance-list-${selectedDate}`,
    () => attendanceAPI.list({ date: selectedDate }),
    { cacheTime: 30_000 }
  );

  const { data: workersData } = useFetch<{ data: Worker[] }>(
    'workers-list',
    () => workersAPI.list({ limit: 200 }),
    { cacheTime: 60_000 }
  );

  const todaySummary = todayData?.data || { present: 0, absent: 0, late: 0, halfDay: 0, onLeave: 0 };
  const attendanceRecords = attendanceData?.data || [];
  const workers = workersData?.data || [];

  const tableRows = useMemo<WorkerRow[]>(() => {
    const recordMap = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach((r) => recordMap.set(r.workerId, r));

    return workers.map((w) => {
      const record = recordMap.get(w.id);
      if (record) {
        return {
          workerId: w.id,
          workerName: record.workerName || w.name,
          clockIn: record.clockIn || null,
          clockOut: record.clockOut || null,
          hoursWorked: record.hoursWorked,
          status: record.status,
          hasRecord: true,
        };
      }
      return {
        workerId: w.id,
        workerName: w.name,
        clockIn: null,
        clockOut: null,
        hoursWorked: null,
        status: 'absent',
        hasRecord: false,
      };
    });
  }, [workers, attendanceRecords]);

  const filteredRows = useMemo(() => {
    if (!statusFilter) return tableRows;
    return tableRows.filter((r) => r.status === statusFilter);
  }, [tableRows, statusFilter]);

  const notClockedInWorkers = useMemo(() => {
    const clockedInIds = new Set(attendanceRecords.filter((r) => r.clockIn).map((r) => r.workerId));
    return workers.filter((w) => !clockedInIds.has(w.id));
  }, [workers, attendanceRecords]);

  const handleClockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId) return;

    const worker = workers.find((w) => w.id === selectedWorkerId);
    if (!worker) return;

    setClockingIn(true);
    try {
      await attendanceAPI.clockIn({ workerId: selectedWorkerId, workerName: worker.name });
      success(`${worker.name} clocked in successfully`);
      setShowClockInModal(false);
      setSelectedWorkerId('');
      clearFetchCache('attendance');
      refetchToday();
      refetchAttendance();
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to clock in');
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async (workerId: string, workerName: string) => {
    setClockingOutId(workerId);
    try {
      await attendanceAPI.clockOut({ workerId });
      success(`${workerName} clocked out successfully`);
      clearFetchCache('attendance');
      refetchToday();
      refetchAttendance();
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to clock out');
    } finally {
      setClockingOutId(null);
    }
  };

  const loading = todayLoading || attendanceLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Worker Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">Track daily attendance for your workers</p>
        </div>
        <Button onClick={() => setShowClockInModal(true)}>Clock In Worker</Button>
      </div>

      {todayLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">✓</div>
              <div>
                <p className="text-sm text-gray-500">Present</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{todaySummary.present}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-600">✕</div>
              <div>
                <p className="text-sm text-gray-500">Absent</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{todaySummary.absent}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">!</div>
              <div>
                <p className="text-sm text-gray-500">Late</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{todaySummary.late}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">½</div>
              <div>
                <p className="text-sm text-gray-500">Half Day</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{todaySummary.halfDay}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 text-gray-600">—</div>
              <div>
                <p className="text-sm text-gray-500">On Leave</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{todaySummary.onLeave}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="half-day">Half Day</option>
            <option value="on-leave">On Leave</option>
          </Select>
          {statusFilter && (
            <Button variant="ghost" onClick={() => setStatusFilter('')}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      <Card>
        {loading ? (
          <LoadingSpinner />
        ) : filteredRows.length === 0 ? (
          <EmptyState
            title={statusFilter ? 'No workers match this filter' : 'No workers found'}
            description="Add workers first to track attendance."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Worker Name</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Clock In</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Clock Out</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Hours</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Status</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.workerId} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">{row.workerName}</td>
                    <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
                      {row.clockIn ? new Date(row.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
                      {row.clockOut ? new Date(row.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
                      {row.hoursWorked != null ? `${row.hoursWorked.toFixed(1)}h` : '—'}
                    </td>
                    <td className="py-3 px-2">
                      <Badge color={getStatusColor(row.status)}>{row.status.replace('-', ' ')}</Badge>
                    </td>
                    <td className="py-3 px-2 text-right">
                      {!row.clockIn && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedWorkerId(row.workerId);
                            setShowClockInModal(true);
                          }}
                        >
                          In
                        </Button>
                      )}
                      {row.clockIn && !row.clockOut && (
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={clockingOutId === row.workerId}
                          onClick={() => handleClockOut(row.workerId, row.workerName)}
                        >
                          Out
                        </Button>
                      )}
                      {row.clockIn && row.clockOut && (
                        <Badge color="blue">Done</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={showClockInModal}
        onClose={() => {
          setShowClockInModal(false);
          setSelectedWorkerId('');
        }}
        title="Clock In Worker"
      >
        <form onSubmit={handleClockIn} className="space-y-4">
          <Select
            label="Worker"
            value={selectedWorkerId}
            onChange={(e) => setSelectedWorkerId(e.target.value)}
          >
            <option value="">Select a worker</option>
            {notClockedInWorkers.map((w) => (
              <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
            ))}
          </Select>
          {notClockedInWorkers.length === 0 && (
            <p className="text-sm text-gray-500">All workers have already been clocked in.</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowClockInModal(false);
                setSelectedWorkerId('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={clockingIn} disabled={!selectedWorkerId}>
              Clock In
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
