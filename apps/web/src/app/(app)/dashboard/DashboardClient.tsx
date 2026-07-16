'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui';

interface KPI {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: string;
}

const FARM_TYPE_LABELS: Record<string, string> = {
  CROP: 'Crop',
  LIVESTOCK: 'Livestock',
  POULTRY: 'Poultry',
  DAIRY: 'Dairy',
  AQUACULTURE: 'Aquaculture',
};

const FARM_TYPE_BG: Record<string, string> = {
  CROP: 'bg-green-100',
  LIVESTOCK: 'bg-amber-100',
  POULTRY: 'bg-orange-100',
  DAIRY: 'bg-blue-100',
  AQUACULTURE: 'bg-cyan-100',
};

const FARM_TYPE_TEXT: Record<string, string> = {
  CROP: 'text-green-800',
  LIVESTOCK: 'text-amber-800',
  POULTRY: 'text-orange-800',
  DAIRY: 'text-blue-800',
  AQUACULTURE: 'text-cyan-800',
};

interface DashboardClientProps {
  user: { firstName: string; lastName: string } | null;
  kpis: KPI[];
  farmTypeBreakdown: Record<string, number>;
  pendingTasks: any[];
  attendanceSummary: { total: number; present: number; absent: number; late: number } | null;
}

export function DashboardClient({ user, kpis, farmTypeBreakdown, pendingTasks, attendanceSummary }: DashboardClientProps) {
  const router = useRouter();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user ? `${user.firstName} ${user.lastName}` : 'Farmer'}</h1>
        <p className="text-gray-500 mt-1">Here's what's happening on your farm today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-2xl ${kpi.color} w-12 h-12 rounded-xl flex items-center justify-center`}>{kpi.icon}</span>
              <span className="text-sm font-medium text-gray-600">{kpi.label}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
            {kpi.trend && <p className="text-sm text-green-600 mt-1">{kpi.trend}</p>}
          </Card>
        ))}
      </div>

      {Object.keys(farmTypeBreakdown).length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Farm Types</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(farmTypeBreakdown).map(([type, count]) => (
              <div key={type} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${FARM_TYPE_BG[type] || 'bg-gray-100'}`}>
                <span className={`text-sm font-medium ${FARM_TYPE_TEXT[type] || 'text-gray-700'}`}>
                  {FARM_TYPE_LABELS[type] || type}
                </span>
                <span className={`text-xs font-bold ${FARM_TYPE_TEXT[type] || 'text-gray-500'}`}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Add Farm', href: '/farms', icon: '🏡' },
              { label: 'Add Crop', href: '/crops', icon: '🌾' },
              { label: 'Add Livestock', href: '/livestock', icon: '🐄' },
              { label: 'Record Transaction', href: '/sales', icon: '💰' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => router.push(action.href)}
                className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
              >
                <span className="text-xl">{action.icon}</span>
                <span className="text-sm font-medium text-gray-700">{action.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <p className="text-gray-500 text-sm text-center py-4">No recent activity yet. Start by adding your first farm!</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Pending Tasks</h3>
            <button onClick={() => router.push('/tasks')} className="text-sm text-blue-600 hover:text-blue-800">View all</button>
          </div>
          {pendingTasks.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No pending tasks</p>
          ) : (
            <div className="space-y-2">
              {pendingTasks.map((task: any) => (
                <div key={task.id} onClick={() => router.push(`/tasks/${task.id}`)} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    <p className="text-xs text-gray-500">{task.assignedToName || 'Unassigned'}{task.dueDate ? ` · Due ${new Date(task.dueDate).toLocaleDateString()}` : ''}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${task.priority === 'URGENT' ? 'bg-red-100 text-red-700' : task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Today's Attendance</h3>
            <button onClick={() => router.push('/workers/attendance')} className="text-sm text-blue-600 hover:text-blue-800">View all</button>
          </div>
          {attendanceSummary ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">{attendanceSummary.present}</p>
                <p className="text-xs text-green-600">Present</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-700">{attendanceSummary.absent}</p>
                <p className="text-xs text-red-600">Absent</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-700">{attendanceSummary.late}</p>
                <p className="text-xs text-yellow-600">Late</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-700">{attendanceSummary.total}</p>
                <p className="text-xs text-gray-600">Total</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">No attendance data</p>
          )}
        </Card>
      </div>
    </div>
  );
}
