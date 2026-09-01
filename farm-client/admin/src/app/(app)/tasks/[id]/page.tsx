'use client';

import React, { useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  Pencil,
  Trash2,
  User,
  Sprout,
  AlertTriangle,
} from 'lucide-react';
import { tasksAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';
import { useReadOnly } from '@/lib/useReadOnly';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority?: string;
  status: string;
  assignedToId?: string;
  assignedToName?: string;
  createdByName?: string;
  farmId?: string;
  farmName?: string;
  dueDate?: string;
  completedDate?: string;
  createdAt: string;
  updatedAt?: string;
}

const priorityVariant: Record<string, 'destructive' | 'warning' | 'default' | 'secondary'> = {
  URGENT: 'destructive',
  HIGH: 'warning',
  MEDIUM: 'default',
  LOW: 'secondary',
};

const statusVariant: Record<string, 'success' | 'default' | 'warning' | 'secondary'> = {
  COMPLETED: 'success',
  IN_PROGRESS: 'default',
  PENDING: 'warning',
};

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const readOnly = useReadOnly();
  const { toast } = useToast();

  const {
    data: taskData,
    loading,
    refetch,
  } = useFetch<{ data: Task }>(`task-${id}`, () => tasksAPI.get(id), {
    cacheTime: 30_000,
  });

  const task = taskData?.data;

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (event.data?.id === id) {
        refetch();
      }
    },
    [id, refetch]
  );
  useRealtime('worker' as any, handleRealtimeEvent);

  const handleDelete = async () => {
    if (!task || !confirm(`Delete "${task.title}"? This action cannot be undone.`))
      return;
    try {
      await tasksAPI.delete(id);
      toast({ type: 'success', title: 'Task deleted' });
      clearFetchCache('tasks');
      router.push('/tasks');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete task',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  const handleStatusUpdate = async (status: string) => {
    try {
      await tasksAPI.updateStatus(id, status);
      toast({ type: 'success', title: `Task marked as ${status.toLowerCase()}` });
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to update status',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Task not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/tasks')}>
          Back to Tasks
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/tasks"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Tasks
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{task.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              {task.priority && (
                <Badge variant={priorityVariant[task.priority] || 'secondary'}>
                  {task.priority}
                </Badge>
              )}
              <Badge variant={statusVariant[task.status] || 'secondary'}>
                {task.status}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!readOnly && (
              <Button
                variant="outline"
                onClick={() => router.push(`/tasks/${id}/edit`)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {!readOnly && (
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Status Updates */}
      {!readOnly && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium mb-3">Quick Status Update</p>
            <div className="flex gap-3">
              {task.status !== 'PENDING' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusUpdate('PENDING')}
                >
                  <PauseCircle className="mr-2 h-4 w-4" />
                  Mark Pending
                </Button>
              )}
              {task.status !== 'IN_PROGRESS' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusUpdate('IN_PROGRESS')}
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Mark In Progress
                </Button>
              )}
              {task.status !== 'COMPLETED' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleStatusUpdate('COMPLETED')}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark Completed
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <User className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assigned To</p>
                <p className="text-lg font-semibold">{task.assignedToName || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Sprout className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Farm</p>
                <p className="text-lg font-semibold">{task.farmName || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="text-lg font-semibold">
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString()
                    : 'Not set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-lg font-semibold">
                  {task.completedDate
                    ? new Date(task.completedDate).toLocaleDateString()
                    : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {task.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{task.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <span className="text-muted-foreground">Created by: </span>
              <span>{task.createdByName || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Created at: </span>
              <span>{new Date(task.createdAt).toLocaleString()}</span>
            </div>
            {task.updatedAt && (
              <div>
                <span className="text-muted-foreground">Updated at: </span>
                <span>{new Date(task.updatedAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
