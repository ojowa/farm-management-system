'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Badge, LoadingSpinner, Select } from '@/components/ui';
import { attendanceAPI, workersAPI } from '@/lib/api';
import { useFetch } from '@/hooks/useFetch';

interface Worker {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  position: string;
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

function formatTime(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function WorkerAttendancePage() {
  const { workerId } = useParams<{ workerId: string }>();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));

  const currentYear = now.getFullYear();
  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      years.push(String(y));
    }
    return years;
  }, [currentYear]);

  const {
    data: workerData,
    loading: workerLoading,
  } = useFetch<Worker>(`worker-${workerId}`, () => workersAPI.get(workerId), { cacheTime: 30_000 });

  const {
    data: summaryData,
    loading: summaryLoading,
  } = useFetch<Summary>(
    `attendance-summary-${workerId}-${selectedMonth}-${selectedYear}`,
    () => attendanceAPI.getSummary({ workerId, month: Number(selectedMonth), year: Number(selectedYear) }),
    { cacheTime: 30_000 }
  );

  const {
    data: recordsData,
    loading: recordsLoading,
  } = useFetch<AttendanceRecord[]>(
    `attendance-list-${workerId}-${selectedMonth}-${selectedYear}`,
    () => attendanceAPI.list({ workerId, month: Number(selectedMonth), year: Number(selectedYear) }),
    { cacheTime: 30_000 }
  );

  const worker = workerData;
  const summary = summaryData;
  const records = recordsData || [];

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [records]
  );

  const loading = workerLoading || summaryLoading || recordsLoading;

  if (workerLoading && !worker) {
    return <LoadingSpinner size="lg" />;
  }

  if (!worker) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Worker not found.</p>
        <Link href="/workers/attendance">
          <Button variant="secondary">Back to Attendance</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/workers/attendance" className="text-sm text-green-600 hover:text-green-700 mb-2 inline-block">
          &larr; Back to Attendance
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{worker.firstName} {worker.middleName ? `${worker.middleName} ` : ''}{worker.lastName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge color="blue">{worker.position}</Badge>
              <span className="text-gray-500 text-sm">Attendance History</span>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
            <option value="7">July</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </Select>
          <Select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
        </div>
      </Card>

      {summaryLoading ? (
        <LoadingSpinner />
      ) : summary ? (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card>
            <p className="text-sm text-gray-500">Total Days</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalDays}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Present</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.present}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Absent</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.absent}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Late</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.late}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Attendance Rate</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.attendanceRate}%</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Total Hours</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalHours}h</p>
          </Card>
        </div>
      ) : null}

      <Card>
        {recordsLoading ? (
          <LoadingSpinner />
        ) : sortedRecords.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No attendance records for this period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Clock In</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Clock Out</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Hours</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Notes</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">
                      {new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-3 px-2">
                      <Badge color={getStatusColor(record.status)}>{record.status.replace('-', ' ')}</Badge>
                    </td>
                    <td className="py-3 px-2 text-gray-600 dark:text-gray-400">{formatTime(record.clockIn)}</td>
                    <td className="py-3 px-2 text-gray-600 dark:text-gray-400">{formatTime(record.clockOut)}</td>
                    <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
                      {record.hoursWorked != null ? `${record.hoursWorked.toFixed(1)}h` : '—'}
                    </td>
                    <td className="py-3 px-2 text-gray-500 text-sm">{record.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
