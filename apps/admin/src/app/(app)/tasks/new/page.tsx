'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { tasksAPI, workersAPI, farmsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';

interface Farm {
  id: string;
  name: string;
}

interface Worker {
  id: string;
  firstName: string;
  lastName: string;
}

export default function NewTaskPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: '',
    assignedToId: '',
    farmId: '',
    dueDate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: farmsData, loading: loadingFarms } = useFetch<{ data: Farm[] }>(
    'farms-list',
    () => farmsAPI.list({ limit: 200 }),
    { cacheTime: 60_000 }
  );

  const { data: workersData, loading: loadingWorkers } = useFetch<{ data: Worker[] }>(
    'workers-list',
    () => workersAPI.list({ limit: 200 }),
    { cacheTime: 60_000 }
  );

  const farms = farmsData?.data || [];
  const workers = workersData?.data || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setErrors({ title: 'Title is required' });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await tasksAPI.create({
        title: form.title,
        description: form.description || undefined,
        priority: form.priority || undefined,
        assignedToId: form.assignedToId || undefined,
        farmId: form.farmId || undefined,
        dueDate: form.dueDate || undefined,
      });
      toast({ type: 'success', title: 'Task created successfully' });
      clearFetchCache('tasks');
      router.push('/tasks');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to create task',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loadingFarms || loadingWorkers) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/tasks"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Tasks
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Add Task</h1>
        <p className="text-muted-foreground">Create a new task</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Irrigate field A, Harvest corn"
                value={form.title}
                onChange={(e) => {
                  setForm({ ...form, title: e.target.value });
                  if (errors.title) setErrors({ ...errors, title: '' });
                }}
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Input
                placeholder="Task details..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Priority</label>
              <Select
                placeholder="Select priority"
                options={[
                  { value: 'LOW', label: 'Low' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'URGENT', label: 'Urgent' },
                ]}
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Assigned To</label>
              <Select
                placeholder="Select a worker"
                options={workers.map((w) => ({
                  value: w.id,
                  label: `${w.firstName} ${w.lastName}`,
                }))}
                value={form.assignedToId}
                onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Farm</label>
              <Select
                placeholder="Select a farm"
                options={farms.map((f) => ({ value: f.id, label: f.name }))}
                value={form.farmId}
                onChange={(e) => setForm({ ...form, farmId: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Due Date</label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/tasks')}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                <Save className="mr-2 h-4 w-4" />
                Create Task
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
