'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Link2, Save } from 'lucide-react';
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
import { RECORD_SOURCES, RecordOption, linkedModuleLabel } from '@/lib/taskLinks';

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

export default function EditTaskPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { canCreate } = usePermission();
  const canManage = canCreate('hr');

  // Redirect in an effect — an early return above the hooks below used to
  // break the conditional-hooks rule for users without hr.write.
  useEffect(() => {
    if (!canManage) router.push('/tasks');
  }, [canManage, router]);

  const {
    data: taskData,
    loading: loadingTask,
  } = useFetch<{ data: any }>(`task-${id}`, () => tasksAPI.get(id));

  const {
    data: farmsData,
    loading: loadingFarms,
  } = useFetch<{ data: Farm[] }>(
    'farms-list',
    () => farmsAPI.list({ limit: 200 }),
    { cacheTime: 60_000 }
  );

  const {
    data: workersData,
    loading: loadingWorkers,
  } = useFetch<{ data: Worker[] }>(
    'workers-list',
    () => workersAPI.list({ limit: 200 }),
    { cacheTime: 60_000 }
  );

  const { data: departmentsData } = useFetch<{ data: Department[] }>(
    'departments-list',
    () => departmentsAPI.list(),
    { cacheTime: 60_000 }
  );

  // The service returns the task (plus comments/attachments) bare; accept
  // `{ data }` too so a loaded task never falls through to "Task not found".
  const task = ((taskData as any)?.data ?? taskData ?? null);
  const farms = farmsData?.data || [];
  const workers = workersData?.data || [];
  const departments = departmentsData?.data || [];

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: '',
    assignedToId: '',
    farmId: '',
    departmentId: '',
    dueDate: '',
    isRecurring: false,
    recurrenceRule: 'WEEKLY',
  });
  const [linkModule, setLinkModule] = useState('');
  const [recordId, setRecordId] = useState('');
  const [recordName, setRecordName] = useState('');
  const [recordOptions, setRecordOptions] = useState<RecordOption[] | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || '',
        assignedToId: task.assignedToId || '',
        farmId: task.farmId || '',
        departmentId: task.departmentId || '',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        isRecurring: Boolean(task.isRecurring),
        recurrenceRule: task.recurrenceRule || 'WEEKLY',
      });
      setLinkModule(task.linkedModule || '');
      setRecordId(task.linkedRecordId || '');
      setRecordName(task.linkedRecordName || '');
    }
  }, [task]);

  // Options load only for the chosen module, and the task's own module may be
  // one the picker does not offer (`field`) — keep it selectable either way.
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

  const moduleOptions: Array<{ value: string; label: string }> = RECORD_SOURCES.map((s) => ({
    value: s.key,
    label: s.label,
  }));
  if (linkModule && !moduleOptions.some((o) => o.value === linkModule)) {
    moduleOptions.push({ value: linkModule, label: linkedModuleLabel(linkModule) });
  }

  const recordSelectOptions = [...(recordOptions || [])];
  if (recordId && !recordSelectOptions.some((o) => o.id === recordId)) {
    // Beyond the picker's page, or a module without a source: show it anyway
    // rather than rendering a select whose current value has no option.
    recordSelectOptions.push({ id: recordId, name: recordName || recordId });
  }

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
      await tasksAPI.update(id, {
        title: form.title,
        description: form.description || undefined,
        priority: form.priority || undefined,
        assignedToId: form.assignedToId || undefined,
        // Flat display name kept on the row — required for the tasks list.
        assignedToName,
        farmId: form.farmId || undefined,
        // Null, not undefined: clearing a department or link must reach the
        // server, which only writes a field it is actually given.
        departmentId: form.departmentId || null,
        linkedModule: linkModule && recordId ? linkModule : null,
        linkedRecordId: linkModule && recordId ? recordId : null,
        linkedRecordName:
          linkModule && recordId
            ? recordName ||
              recordOptions?.find((o) => o.id === recordId)?.name ||
              null
            : null,
        dueDate: form.dueDate || undefined,
        isRecurring: form.isRecurring,
        recurrenceRule: form.isRecurring ? form.recurrenceRule : null,
      });
      toast({ type: 'success', title: 'Task updated successfully' });
      clearFetchCache('tasks');
      router.push(`/tasks/${id}`);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to update task',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) return null;

  if (loadingTask || loadingFarms || loadingWorkers) {
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
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/tasks')}
        >
          Back to Tasks
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/tasks/${id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Task
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Edit Task</h1>
        <p className="text-muted-foreground">Update {task.title}</p>
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
              <label className="text-sm font-medium mb-1 block">Department</label>
              <Select
                placeholder="No department"
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              />
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Link2 className="h-4 w-4" />
                Link to a record
              </label>
              <p className="text-xs text-muted-foreground">
                The task then shows on that record&apos;s page, filtered to it.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Module</label>
                  <Select
                    placeholder="No link"
                    options={moduleOptions}
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
                    options={recordSelectOptions.map((o) => ({ value: o.id, label: o.name }))}
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
                onClick={() => router.push(`/tasks/${id}`)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
