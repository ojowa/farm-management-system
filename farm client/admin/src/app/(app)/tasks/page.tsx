'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { tasksAPI } from '@/lib/api';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useReadOnly } from '@/lib/useReadOnly';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { Plus, Pencil, Trash2, Search, ListTodo } from 'lucide-react';

const PAGE_SIZE = 10;

interface TaskItem {
  id: string;
  title: string;
  priority: string;
  status: string;
  assignedTo?: { name: string };
  dueDate?: string;
}

const priorityColors: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  LOW: 'bg-gray-100 text-gray-800',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const priorityOptions = [
  { value: '', label: 'All Priorities' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

export default function TasksPage() {
  const router = useRouter();
  const isReadOnly = useReadOnly();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchKey = `tasks-list-${search}-${statusFilter}-${priorityFilter}-${page}`;

  const { data, loading: isLoading, error, refetch } = useFetch<{ data: TaskItem[]; totalPages: number }>(
    fetchKey,
    useCallback(async () => {
      return await tasksAPI.list({
        search,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        page,
        limit: PAGE_SIZE,
      });
    }, [search, statusFilter, priorityFilter, page])
  );

  const tasks = data?.data || [];
  const totalPages = data?.totalPages || 1;

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    await tasksAPI.delete(id);
    clearFetchCache();
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Tasks</h1>
        </div>
        {!isReadOnly && (
          <Button onClick={() => router.push('/tasks/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={statusOptions} />
            <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} options={priorityOptions} />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="pt-6 text-center text-destructive">
            Failed to load tasks. Please try again.
          </CardContent>
        </Card>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListTodo className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">No tasks found</p>
            <p className="text-sm text-muted-foreground">
              {search || statusFilter || priorityFilter
                ? 'Try adjusting your filters'
                : 'Create your first task to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Assigned To</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task: TaskItem) => (
                    <tr
                      key={task.id}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                      onClick={() => router.push(`/tasks/${task.id}`)}
                    >
                      <td className="px-4 py-3 font-medium">{task.title}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${priorityColors[task.priority] || ''}`}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${statusColors[task.status] || ''}`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {task.assignedTo?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {!isReadOnly && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push(`/tasks/${task.id}/edit`)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(task.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
