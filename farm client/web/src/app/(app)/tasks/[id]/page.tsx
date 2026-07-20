'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Badge, LoadingSpinner } from '@/components/ui';
import { useToasts } from '@/lib/toasts';
import { tasksAPI } from '@/lib/api';
import { useFetch } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  assignedToId?: string;
  assignedToName?: string;
  createdById?: string;
  createdByName?: string;
  farmId?: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'gray',
  MEDIUM: 'yellow',
  HIGH: 'orange',
  URGENT: 'red',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'yellow',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canUpdate, canDelete } = usePermission();
  const { success, error: toastError } = useToasts();

  const {
    data: task,
    loading,
    error,
    refetch,
  } = useFetch<Task>(`task-${id}`, () => tasksAPI.get(id));

  const [updating, setUpdating] = useState(false);

  const canManage = canUpdate('task');
  const canDeleteTask = canDelete('task');

  const handleStatusUpdate = useCallback(async (newStatus: string) => {
    setUpdating(true);
    try {
      await tasksAPI.updateStatus(id, newStatus);
      success(`Task marked as ${newStatus.toLowerCase().replace('_', ' ')}`);
      refetch();
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to update task');
    } finally {
      setUpdating(false);
    }
  }, [id, refetch, success, toastError]);

  const handleDelete = useCallback(async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await tasksAPI.delete(id);
      success('Task deleted');
      router.push('/tasks');
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to delete task');
    }
  }, [id, router, success, toastError]);

  if (loading) return <LoadingSpinner size="lg" />;

  if (error || !task) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">{error || 'Task not found'}</p>
        <Link href="/tasks">
          <Button variant="secondary">Back to Tasks</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/tasks" className="text-sm text-green-600 hover:text-green-700 mb-2 inline-block">
          &larr; Back to Tasks
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{task.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge color={PRIORITY_COLORS[task.priority] || 'gray'}>{task.priority}</Badge>
              <Badge color={STATUS_COLORS[task.status] || 'gray'}>{task.status.replace('_', ' ')}</Badge>
            </div>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Link href={`/tasks/${task.id}/edit`}>
                <Button variant="secondary" size="sm">Edit</Button>
              </Link>
              {canDeleteTask && (
                <Button variant="danger" size="sm" onClick={handleDelete}>Delete</Button>
              )}
            </div>
          )}
        </div>
      </div>

      {task.description && (
        <Card>
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">Description</h3>
          <p className="text-gray-600 dark:text-gray-400">{task.description}</p>
        </Card>
      )}

      <Card>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Assigned To</p>
            <p className="font-medium text-gray-900 dark:text-white">{task.assignedToName || 'Unassigned'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Due Date</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Created By</p>
            <p className="font-medium text-gray-900 dark:text-white">{task.createdByName || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Created At</p>
            <p className="font-medium text-gray-900 dark:text-white">{new Date(task.createdAt).toLocaleDateString()}</p>
          </div>
          {task.completedAt && (
            <div>
              <p className="text-sm text-gray-500">Completed At</p>
              <p className="font-medium text-gray-900 dark:text-white">{new Date(task.completedAt).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </Card>

      {canManage && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
        <Card>
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">Quick Status Update</h3>
          <div className="flex gap-2">
            {task.status === 'PENDING' && (
              <Button
                variant="secondary"
                size="sm"
                loading={updating}
                onClick={() => handleStatusUpdate('IN_PROGRESS')}
              >
                Start Task
              </Button>
            )}
            {task.status === 'IN_PROGRESS' && (
              <Button
                variant="primary"
                size="sm"
                loading={updating}
                onClick={() => handleStatusUpdate('COMPLETED')}
              >
                Mark Complete
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              loading={updating}
              onClick={() => handleStatusUpdate('CANCELLED')}
            >
              Cancel Task
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
