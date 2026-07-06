'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  User,
} from 'lucide-react';
import { attendanceAPI, workersAPI } from '@/lib/api';
import { useFetch } from '@/hooks/useFetch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';

interface Worker {
  id: string;
  name: string;
  role: string;
}

interface Summary {
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;
  totalHours: number;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  clockIn: string;
  clockOut: string | null;
  hoursWorked: number | null;
  notes: string;
}

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
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

function formatTime(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function WorkerAttendancePage() {
  const { workerId } = useParams<{ workerId: string }>();
  const router = useRouter();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));

  const currentYear = now.getFullYear();
  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      years.push({ value: String(y), label: String(y) });
    }
    return years;
  }, [currentYear]);

  const {
    data: workerData,
    loading: workerLoading,
  } = useFetch<{ data: Worker }>(
    `worker-${workerId}`,
    () => workersAPI.get(workerId),
    { cacheTime: 30_000 }
  );

  const {
    data: summaryData,
    loading: summaryLoading,
  } = useFetch<{ data: Summary }>(
    `attendance-summary-${workerId}-${selectedMonth}-${selectedYear}`,
    () =>
      attendanceAPI.getSummary({
        workerId,
        month: Number(selectedMonth),
        year: Number(selectedYear),
      }),
    { cacheTime: 30_000 }
  );

  const {
    data: recordsData,
    loading: recordsLoading,
  } = useFetch<{ data: AttendanceRecord[] }>(
    `attendance-list-${workerId}-${selectedMonth}-${selectedYear}`,
    () =>
      attendanceAPI.list({
        workerId,
        month: Number(selectedMonth),
        year: Number(selectedYear),
      }),
    { cacheTime: 30_000 }
  );

  const worker = workerData?.data;
  const summary = summaryData?.data;
  const records = recordsData?.data || [];

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [records]
  );

  const loading = workerLoading || summaryLoading || recordsLoading;

  if (workerLoading && !worker) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Worker not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/workers')}>
          Back to Workers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/workers/attendance"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Attendance
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{worker.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{worker.role}</Badge>
              <span className="text-muted-foreground text-sm">Attendance History</span>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select
                placeholder="Month"
                options={MONTHS}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <Select
              placeholder="Year"
              options={yearOptions}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {summaryLoading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      ) : summary ? (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Days</p>
                  <p className="text-2xl font-bold">{summary.totalDays}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Present</p>
                  <p className="text-2xl font-bold">{summary.present}</p>
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
                  <p className="text-2xl font-bold">{summary.absent}</p>
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
                  <p className="text-2xl font-bold">{summary.late}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Attendance</p>
                  <p className="text-2xl font-bold">{summary.attendanceRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-900/30">
                  <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                  <p className="text-2xl font-bold">{summary.totalHours}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        {recordsLoading ? (
          <CardContent className="p-8 flex items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
          </CardContent>
        ) : sortedRecords.length === 0 ? (
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              No attendance records for this period.
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Hours Worked</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <span className="font-medium">
                        {new Date(record.date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(record.status)}>
                        {record.status.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatTime(record.clockIn)}</TableCell>
                    <TableCell>{formatTime(record.clockOut)}</TableCell>
                    <TableCell>
                      {record.hoursWorked != null ? `${record.hoursWorked.toFixed(1)}h` : '—'}
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">
                        {record.notes || '—'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
