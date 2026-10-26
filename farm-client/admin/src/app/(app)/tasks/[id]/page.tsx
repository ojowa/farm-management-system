'use client';

import React, { useCallback, useState } from 'react';
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
  XCircle,
  MessageSquare,
  Paperclip,
  Send,
  Link2,
  RotateCcw,
} from 'lucide-react';
import { tasksAPI, farmsAPI, departmentsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';
import { usePermission } from '@/lib/usePermission';
import { linkedModuleLabel, linkedRecordHref } from '@/lib/taskLinks';

interface TaskComment {
  id: string;
  authorName: string;
  authorId?: string | null;
  body: string;
  createdAt: string;
}

interface TaskAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  uploadedByName?: string | null;
  createdAt: string;
}

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
  departmentId?: string | null;
  /** Farm-module record this task was raised against; null = unlinked. */
  linkedModule?: string | null;
  linkedRecordId?: string | null;
  linkedRecordName?: string | null;
  dueDate?: string;
  completedAt?: string;
  isRecurring?: boolean;
  recurrenceRule?: string | null;
  nextDueAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
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
  CANCELLED: 'secondary',
};

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canCreate, canDelete } = usePermission();
  // Managers (hr.write) manage; workers (worker.read) may still flip the status
  // of tasks assigned to them via the scoped update path.
  const isManager = canCreate('hr');
  const canRemove = canDelete('hr');
  const { toast } = useToast();

  const [commentBody, setCommentBody] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [addingAttachment, setAddingAttachment] = useState(false);

  const {
    data: taskData,
    loading,
    error,
    refetch,
  } = useFetch<{ data: Task }>(`task-${id}`, () => tasksAPI.get(id), {
    cacheTime: 30_000,
  });

  // The Task model keeps farmId as a plain id — resolve the display name here.
  const { data: farmsData } = useFetch<{ data: Array<{ id: string; name: string }> }>(
    'farms-list',
    () => farmsAPI.list({ limit: 200 }),
    { cacheTime: 60_000 }
  );

  // The service returns the task (plus comments/attachments) bare; accept
  // `{ data }` too so a loaded task never falls through to "Task not found".
  const task = ((taskData as any)?.data ?? taskData ?? null);
  const farmName = task?.farmId
    ? farmsData?.data?.find((f) => f.id === task.farmId)?.name
    : undefined;

  // departmentId travels alone on tasks — resolve it to a name for display.
  const { data: departmentsData } = useFetch<{ data: Array<{ id: string; name: string }> }>(
    'departments-list',
    () => departmentsAPI.list(),
    { cacheTime: 60_000 }
  );
  const departmentName = task?.departmentId
    ? departmentsData?.data?.find((d) => d.id === task.departmentId)?.name
    : undefined;

  const recordHref = linkedRecordHref(task?.linkedModule, task?.linkedRecordId);
  const recordLabel = task?.linkedRecordId
    ? `${linkedModuleLabel(task.linkedModule)}${task.linkedRecordName ? ` · ${task.linkedRecordName}` : ''}`
    : null;

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (event.data?.id === id) {
        refetch();
      }
    },
    [id, refetch]
  );
  // Refetch on task events (previously listened on 'worker' — never fired).
  useRealtime('task', handleRealtimeEvent);
  useRealtime('taskComment', handleRealtimeEvent);
  useRealtime('taskAttachment', handleRealtimeEvent);

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
      if (isManager) {
        await tasksAPI.updateStatus(id, status);
      } else {
        // Workers take the scoped update path — status only, own tasks only.
        await tasksAPI.update(id, { status });
      }
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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setPostingComment(true);
    try {
      await tasksAPI.addComment(id, commentBody);
      setCommentBody('');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to post comment',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await tasksAPI.deleteComment(commentId);
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete comment',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachmentName.trim() || !attachmentUrl.trim()) return;
    setAddingAttachment(true);
    try {
      await tasksAPI.addAttachment(id, {
        fileName: attachmentName.trim(),
        fileUrl: attachmentUrl.trim(),
      });
      setAttachmentName('');
      setAttachmentUrl('');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to add attachment',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setAddingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Remove this attachment?')) return;
    try {
      await tasksAPI.removeAttachment(attachmentId);
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to remove attachment',
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

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="font-medium text-destructive">Failed to load task</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Retry
        </Button>
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

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const overdue =
    Boolean(task.dueDate) &&
    new Date(task.dueDate as string) < startOfToday &&
    task.status !== 'COMPLETED' &&
    task.status !== 'CANCELLED';

  // Typed as any[] so the render callbacks stay typed now that `task`
  // itself accepts either response shape.
  const comments: any[] = task.comments || [];
  const attachments: any[] = task.attachments || [];

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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{task.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {task.priority && (
                <Badge variant={priorityVariant[task.priority] || 'secondary'}>
                  {task.priority}
                </Badge>
              )}
              <Badge variant={statusVariant[task.status] || 'secondary'}>
                {task.status}
              </Badge>
              {overdue && (
                <Badge variant="destructive">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Overdue
                </Badge>
              )}
              {task.isRecurring && (
                <Badge variant="secondary">
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Recurring ({(task.recurrenceRule || 'WEEKLY').toLowerCase()})
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isManager && (
              <Button
                variant="outline"
                onClick={() => router.push(`/tasks/${id}/edit`)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {canRemove && (
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Status Updates — managers flip anything, workers flip their own */}
      {(isManager || task.assignedToId) && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium mb-3">Quick Status Update</p>
            <div className="flex flex-wrap gap-3">
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
              {task.status !== 'CANCELLED' && isManager && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusUpdate('CANCELLED')}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Task
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
            <div className="flex flex-wrap items-center gap-3">
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
            <div className="flex flex-wrap items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Sprout className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Farm</p>
                <p className="text-lg font-semibold">{farmName || task.farmName || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className={`text-lg font-semibold ${overdue ? 'text-red-600' : ''}`}>
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString()
                    : 'Not set'}
                  {overdue && ' · Overdue'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-lg font-semibold">
                  {/* Server field is completedAt (completedDate never existed). */}
                  {task.completedAt
                    ? new Date(task.completedAt).toLocaleDateString()
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
            <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Recurring next occurrence */}
      {task.isRecurring && task.nextDueAt && (
        <Card>
          <CardContent className="p-6 flex items-center gap-3">
            <RotateCcw className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-sm font-medium">Next occurrence</p>
              <p className="text-sm text-muted-foreground">
                Due {new Date(task.nextDueAt).toLocaleDateString()} — created automatically
                when this one was completed.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments ({comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{c.authorName}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{c.body}</p>
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteComment(c.id)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <Textarea
              placeholder="Write a comment..."
              rows={2}
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
            />
            <Button type="submit" loading={postingComment} disabled={!commentBody.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Attachments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Attachments ({attachments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attachments yet.</p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <a
                    href={a.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium hover:underline"
                  >
                    <Link2 className="h-4 w-4" />
                    {a.fileName}
                  </a>
                  <div className="flex items-center gap-3">
                    {a.uploadedByName && (
                      <span className="text-xs text-muted-foreground">
                        by {a.uploadedByName}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAttachment(a.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={handleAddAttachment} className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="File name"
              value={attachmentName}
              onChange={(e) => setAttachmentName(e.target.value)}
            />
            <Input
              placeholder="https://..."
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
            />
            <Button
              type="submit"
              loading={addingAttachment}
              disabled={!attachmentName.trim() || !attachmentUrl.trim()}
            >
              Add Link
            </Button>
          </form>
        </CardContent>
      </Card>

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
            <div>
              <span className="text-muted-foreground">Department: </span>
              <span>{departmentName || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Linked record: </span>
              {recordLabel ? (
                recordHref ? (
                  <Link href={recordHref} className="font-medium hover:underline">
                    {recordLabel}
                  </Link>
                ) : (
                  // Module without a detail page — the name still says it all.
                  <span className="font-medium">{recordLabel}</span>
                )
              ) : (
                <span>—</span>
              )}
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
