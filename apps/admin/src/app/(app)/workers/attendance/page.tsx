'use client';

import React, { useState, useMemo } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  LogIn,
  LogOut,
} from 'lucide-react';
import { attendanceAPI, workersAPI } from '@/lib/api';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';

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

interface TableRow {
  workerId: string;
  workerName: string;
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: number | null;
  status: string;
  hasRecord: boolean;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'half-day', label: 'Half Day' },
  { value: 'on-leave', label: 'On Leave' },
];

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'present':
      return 'success' as const;
    case 'absent':
      return 'destructive' as const;
    case 'late':
      return 'warning' as const;
    case 'half-day':
      return 'secondary' as const;
    case 'on-leave':
      return 'outline' as const;
    default:
      return 'default' as const;
  }
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

export default function AttendancePage() {
  const { toast } = useToast();
  const today = useMemo(() => formatDate(new Date()), []);

  const [selectedDate, setSelectedDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState('');
  const [showClockInDialog, setShowClockInDialog] = useState(false);
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

  const tableRows = useMemo<TableRow[]>(() => {
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

  const handleClockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId) return;

    const worker = workers.find((w) => w.id === selectedWorkerId);
    if (!worker) return;

    setClockingIn(true);
    try {
      await attendanceAPI.clockIn({ workerId: selectedWorkerId, workerName: worker.name });
      toast({ type: 'success', title: `${worker.name} clocked in successfully` });
      setShowClockInDialog(false);
      setSelectedWorkerId('');
      clearFetchCache('attendance');
      refetchToday();
      refetchAttendance();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to clock in',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async (workerId: string, workerName: string) => {
    setClockingOutId(workerId);
    try {
      await attendanceAPI.clockOut({ workerId });
      toast({ type: 'success', title: `${workerName} clocked out successfully` });
      clearFetchCache('attendance');
      refetchToday();
      refetchAttendance();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to clock out',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setClockingOutId(null);
    }
  };

  const notClockedInWorkers = useMemo(() => {
    const clockedInIds = new Set(attendanceRecords.filter((r) => r.clockIn).map((r) => r.workerId));
    return workers.filter((w) => !clockedInIds.has(w.id));
  }, [workers, attendanceRecords]);

  const loading = todayLoading || attendanceLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Worker Attendance</h1>
          <p className="text-muted-foreground">Track daily attendance for your workers</p>
        </div>
        <Button onClick={() => setShowClockInDialog(true)}>
          <LogIn className="mr-2 h-4 w-4" />
          Clock In Worker
        </Button>
      </div>

      {todayLoading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Present</p>
                  <p className="text-2xl font-bold">{todaySummary.present}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Absent</p>
                  <p className="text-2xl font-bold">{todaySummary.absent}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Late</p>
                  <p className="text-2xl font-bold">{todaySummary.late}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Half Day</p>
                  <p className="text-2xl font-bold">{todaySummary.halfDay}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-900/30">
                  <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">On Leave</p>
                  <p className="text-2xl font-bold">{todaySummary.onLeave}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <Select
              placeholder="All Statuses"
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
            {statusFilter && (
              <Button variant="ghost" size="sm" onClick={() => setStatusFilter('')}>
                Clear filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        {loading ? (
          <CardContent className="p-8 flex items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
          </CardContent>
        ) : filteredRows.length === 0 ? (
          <CardContent className="p-12 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {statusFilter
                ? 'No workers match this status filter.'
                : 'No workers found. Add workers first.'}
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker Name</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Hours Worked</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.workerId}>
                    <TableCell>
                      <span className="font-medium">{row.workerName}</span>
                    </TableCell>
                    <TableCell>
                      {row.clockIn
                        ? new Date(row.clockIn).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {row.clockOut
                        ? new Date(row.clockOut).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {row.hoursWorked != null ? `${row.hoursWorked.toFixed(1)}h` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(row.status)}>
                        {row.status.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {!row.clockIn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedWorkerId(row.workerId);
                              setShowClockInDialog(true);
                            }}
                          >
                            <LogIn className="mr-1 h-3 w-3" />
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
                            <LogOut className="mr-1 h-3 w-3" />
                            Out
                          </Button>
                        )}
                        {row.clockIn && row.clockOut && (
                          <Badge variant="secondary">Completed</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog
        open={showClockInDialog}
        onOpenChange={(open) => {
          setShowClockInDialog(open);
          if (!open) setSelectedWorkerId('');
        }}
        title="Clock In Worker"
        description="Select a worker to clock in for today."
      >
        <form onSubmit={handleClockIn} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Worker <span className="text-destructive">*</span>
            </label>
            <Select
              placeholder="Select a worker"
              options={notClockedInWorkers.map((w) => ({
                value: w.id,
                label: `${w.name} (${w.role})`,
              }))}
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
            />
            {notClockedInWorkers.length === 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                All workers have already been clocked in.
              </p>
            )}
          </div>
          {selectedWorkerId && (
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <Input
                value={workers.find((w) => w.id === selectedWorkerId)?.name || ''}
                disabled
              />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowClockInDialog(false);
                setSelectedWorkerId('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={clockingIn} disabled={!selectedWorkerId}>
              <LogIn className="mr-2 h-4 w-4" />
              Clock In
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
