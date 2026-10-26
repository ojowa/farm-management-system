'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Link2, Save, X } from 'lucide-react';
import { tasksAPI, workersAPI, farmsAPI, departmentsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';
import { RECORD_SOURCES, RecordOption } from '@/lib/taskLinks';

interface Farm {
  id: string;
  name: string;
}

interface Worker {
  id: string;
  firstName: string;
  lastName: string;
}

interface Department {
  id: string;
  name: string;
}

export default function NewTaskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { canCreate } = usePermission();
  const canManage = canCreate('hr');

  // Permission redirect happens in an effect — all hooks below must run on
  // every render (an early `return` above them used to trip React's
  // conditional-hooks rule whenever the user lacked hr.write).
  useEffect(() => {
    if (!canManage) router.push('/tasks');
  }, [canManage, router]);

  // Arriving from a record's "New task" button means the link is already
  // decided; the form still lets it be cleared below.
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: '',
    assignedToId: '',
    farmId: '',
    departmentId: searchParams.get('departmentId') || '',
    dueDate: '',
    isRecurring: false,
    recurrenceRule: 'WEEKLY',
  });
  const [linkModule, setLinkModule] = useState(searchParams.get('linkedModule') || '');
  const [recordId, setRecordId] = useState(searchParams.get('linkedRecordId') || '');
  const [recordName, setRecordName] = useState(searchParams.get('linkedRecordName') || '');
  const [recordOptions, setRecordOptions] = useState<RecordOption[] | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);
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

  const { data: departmentsData } = useFetch<{ data: Department[] }>(
    'departments-list',
    () => departmentsAPI.list(),
    { cacheTime: 60_000 }
  );

  // Record options load only for the chosen module — fetching every module's
  // rows up front would put eight list calls on the form's critical path.
  useEffect(() => {
    const source = RECORD_SOURCES.find((s) => s.key === linkModule);
    if (!source) {
      setRecordOptions(null);
      return;
    }
    let cancelled = false;
    setLoadingRecords(true);
    source
      .load()
      .then((options) => {
        if (cancelled) return;
        setRecordOptions(options);
        setLoadingRecords(false);
      })
      .catch(() => {
        if (cancelled) return;
        setRecordOptions([]);
        setLoadingRecords(false);
      });
    return () => {
      cancelled = true;
    };
  }, [linkModule]);

  const farms = farmsData?.data || [];
  const workers = workersData?.data || [];
  const departments = departmentsData?.data || [];

  const selectedWorker = workers.find((w) => w.id === form.assignedToId);
  const assignedToName = selectedWorker
    ? `${selectedWorker.firstName} ${selectedWorker.lastName}`
    : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setErrors({ title: 'Title is required' });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      // The server stores the link only when module and id agree, and the
      // name is denormalised so the task stays readable on its own.
      const linkedRecordName =
        recordName || recordOptions?.find((o) => o.id === recordId)?.name || '';
      await tasksAPI.create({
        title: form.title,
        description: form.description || undefined,
        priority: form.priority || undefined,
        assignedToId: form.assignedToId || undefined,
        // The server keeps a flat display name on the task row — without it the
        // tasks list would show "—" for every assignment.
        assignedToName,
        farmId: form.farmId || undefined,
        departmentId: form.departmentId || undefined,
        linkedModule: linkModule && recordId ? linkModule : undefined,
        linkedRecordId: linkModule && recordId ? recordId : undefined,
        linkedRecordName: linkModule && recordId ? linkedRecordName || undefined : undefined,
        dueDate: form.dueDate || undefined,
        isRecurring: form.isRecurring,
        recurrenceRule: form.isRecurring ? form.recurrenceRule : undefined,
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

  if (!canManage) return null;

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
              <Textarea
                placeholder="Task details..."
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
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
                <label className="text-sm font-medium mb-1 block">Due Date</label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
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
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Department</label>
              <Select
                placeholder="No department"
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              />
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Link2 className="h-4 w-4" />
                  Link to a record
                </label>
                {(linkModule || recordId) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLinkModule('');
                      setRecordId('');
                      setRecordName('');
                    }}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Clear link
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                The task then shows on that record&apos;s page, filtered to it.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Module</label>
                  <Select
                    placeholder="No link"
                    options={RECORD_SOURCES.map((s) => ({ value: s.key, label: s.label }))}
                    value={linkModule}
                    onChange={(e) => {
                      setLinkModule(e.target.value);
                      setRecordId('');
                      setRecordName('');
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Record</label>
                  <Select
                    placeholder={
                      !linkModule
                        ? 'Choose a module first'
                        : loadingRecords
                          ? 'Loading…'
                          : 'Select a record'
                    }
                    disabled={!linkModule || loadingRecords}
                    options={(recordOptions || []).map((o) => ({ value: o.id, label: o.name }))}
                    value={recordId}
                    onChange={(e) => {
                      setRecordId(e.target.value);
                      setRecordName(
                        recordOptions?.find((o) => o.id === e.target.value)?.name || ''
                      );
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={form.isRecurring}
                  onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                />
                Recurring task — repeat after each completion
              </label>
              {form.isRecurring && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Repeats</label>
                  <Select
                    options={[
                      { value: 'DAILY', label: 'Daily' },
                      { value: 'WEEKLY', label: 'Weekly' },
                      { value: 'MONTHLY', label: 'Monthly' },
                    ]}
                    value={form.recurrenceRule}
                    onChange={(e) => setForm({ ...form, recurrenceRule: e.target.value })}
                  />
                </div>
              )}
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
