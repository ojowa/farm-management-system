'use client';

import React, { useState, useEffect } from 'react';
import { usePermission } from '@/lib/usePermission';
import { apiClient } from '@/lib/api';
import { Card, Button, Badge, Input } from '@/components/ui';
import { useToasts } from '@/lib/toasts';

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

export default function TasksPage() {
  const { canCreate, canDelete } = usePermission();
  const { success, error: toastError } = useToasts();
  const user = {
    id: '1',
    firstName: 'User',
    fullName: 'User',
    role: 'ADMIN',
    organizationId: '1',
    organizationName: 'Farm',
    permissions: [],
    planFeatures: { modules: [], farmTypes: [] }
  };
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', assignedToId: '', assignedToName: '', dueDate: '' });
  const [saving, setSaving] = useState(false);
  const [workers, setWorkers] = useState<any[]>([]);

  const canManageTasks = canCreate('task');

  useEffect(() => {
    loadTasks();
    if (canManageTasks) loadWorkers();
  }, []);

  async function loadTasks() {
    try {
      const params = filter !== 'all' ? `?status=${filter.toUpperCase()}` : '';
      const { data } = await apiClient.get(`/tasks${params}`);
      setTasks(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function loadWorkers() {
    try {
      const { data } = await apiClient.get('/workers');
      setWorkers(data);
    } catch { /* ignore */ }
  }

  const openForm = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setForm({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        assignedToId: task.assignedToId || '',
        assignedToName: task.assignedToName || '',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      });
    } else {
      setEditingTask(null);
      setForm({ title: '', description: '', priority: 'MEDIUM', assignedToId: '', assignedToName: '', dueDate: '' });
    }
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toastError('Title is required'); return; }
    setSaving(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
      };
      if (form.assignedToId) {
        payload.assignedToId = form.assignedToId;
        const w = workers.find((w: any) => w.id === form.assignedToId);
        payload.assignedToName = w ? `${w.firstName} ${w.lastName}` : form.assignedToName;
      }
      if (editingTask) {
        await apiClient.put(`/tasks/${editingTask.id}`, payload);
        success('Task updated');
      } else {
        await apiClient.post('/tasks', payload);
        success('Task created');
      }
      setShowForm(false);
      await loadTasks();
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to save task');
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (task: Task, newStatus: string) => {
    try {
      await apiClient.put(`/tasks/${task.id}`, { status: newStatus });
      success(`Task marked as ${newStatus.toLowerCase().replace('_', ' ')}`);
      await loadTasks();
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to update task');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await apiClient.delete(`/tasks/${id}`);
      success('Task deleted');
      await loadTasks();
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to delete task');
    }
  };

  const filteredTasks = tasks;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {canManageTasks ? 'Task Management' : 'My Tasks'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {canManageTasks ? 'Create and assign tasks to workers' : 'View and update your assigned tasks'}
          </p>
        </div>
        {canManageTasks && (
          <Button onClick={() => openForm()}>+ New Task</Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'in_progress', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); }}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === f
                ? 'bg-green-100 text-green-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No tasks found</p>
            {canManageTasks && <Button onClick={() => openForm()}>Create your first task</Button>}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <Card key={task.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">{task.title}</h3>
                    <Badge color={PRIORITY_COLORS[task.priority] || 'gray'}>{task.priority}</Badge>
                    <Badge color={STATUS_COLORS[task.status] || 'gray'}>{task.status.replace('_', ' ')}</Badge>
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-500 mb-2">{task.description}</p>
                  )}
                  <div className="flex gap-4 text-xs text-gray-400">
                    {task.assignedToName && <span>Assigned to: <strong className="text-gray-600">{task.assignedToName}</strong></span>}
                    {task.createdByName && <span>Created by: {task.createdByName}</span>}
                    {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                    {task.completedAt && <span>Completed: {new Date(task.completedAt).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  {/* Workers can update status of their own tasks */}
                  {!canManageTasks && task.assignedToId === user?.id && task.status !== 'COMPLETED' && (
                    <>
                      {task.status === 'PENDING' && (
                        <button onClick={() => handleStatusChange(task, 'IN_PROGRESS')} className="text-xs text-blue-600 hover:text-blue-800">Start</button>
                      )}
                      {task.status === 'IN_PROGRESS' && (
                        <button onClick={() => handleStatusChange(task, 'COMPLETED')} className="text-xs text-green-600 hover:text-green-800">Complete</button>
                      )}
                    </>
                  )}
                  {/* Supervisors+ can edit and delete */}
                  {canManageTasks && (
                    <>
                      <button onClick={() => openForm(task)} className="text-xs text-green-600 hover:text-green-800">Edit</button>
                      <button onClick={() => handleDelete(task.id)} className="text-xs text-red-600 hover:text-red-800">Delete</button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingTask ? 'Edit Task' : 'New Task'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="e.g. Feed chickens in pen A"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Optional details"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <Input
                  label="Due Date"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
              {canManageTasks && workers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                  <select
                    value={form.assignedToId}
                    onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {workers.map((w: any) => (
                      <option key={w.id} value={w.id}>{w.firstName} {w.lastName}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" loading={saving}>{editingTask ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
