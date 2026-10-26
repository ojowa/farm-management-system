'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ListTodo, Plus, Users } from 'lucide-react';
import { tasksAPI, workersAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFetch } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';
import {
  LinkedModule,
  linkedModuleLabel,
} from '@/lib/taskLinks';

const PREVIEW_LIMIT = 5;

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  IN_PROGRESS: 'default',
  COMPLETED: 'success',
  CANCELLED: 'outline',
};

interface RecordTasksCardProps {
  /** Which farm-module record the tasks are linked to (Task.linkedModule). */
  moduleKey: LinkedModule;
  recordId: string;
  recordName?: string;
  /** When given, the header also reports how many workers are on this farm. */
  farmId?: string;
}

/**
 * The "people" card every module's record page carries: the tasks raised
 * against this exact record (queried by linkedModule + linkedRecordId, not
 * filtered client-side) plus the farm's worker headcount when the record
 * belongs to a farm. Empty is a first-class state — it is what tells the
 * reader nothing has been scheduled here yet.
 */
export function RecordTasksCard({ moduleKey, recordId, recordName, farmId }: RecordTasksCardProps) {
  const router = useRouter();
  const { canCreate } = usePermission();
  const canManage = canCreate('hr');
  const label = linkedModuleLabel(moduleKey);
  const heading = recordName || label;

  const { data, loading } = useFetch<{ data: any[]; total?: number }>(
    `record-tasks-${moduleKey}-${recordId}`,
    () =>
      tasksAPI.list({
        linkedModule: moduleKey,
        linkedRecordId: recordId,
        limit: PREVIEW_LIMIT,
      }),
    { enabled: Boolean(recordId), cacheTime: 30_000 }
  );

  // The workers endpoint only paginates when `page` is passed, and only the
  // paginated shape carries `total` — limit:1 keeps the payload to one row.
  const { data: workersStat } = useFetch<{ data: any[]; total?: number }>(
    `record-workers-${farmId}`,
    () => workersAPI.list({ farmId, page: 1, limit: 1 }),
    { enabled: Boolean(farmId), cacheTime: 30_000 }
  );

  const tasks = data?.data || [];
  const openCount = tasks.filter(
    (t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
  ).length;
  const workerTotal = workersStat?.total;

  // Both links are built by hand rather than from the helper's return value:
  // URLSearchParams needs a concrete record, and a conditional object type
  // does not satisfy one.
  const newTaskParams = new URLSearchParams();
  newTaskParams.set('linkedModule', moduleKey);
  newTaskParams.set('linkedRecordId', recordId);
  newTaskParams.set('linkedRecordName', heading);
  if (farmId) newTaskParams.set('farmId', farmId);

  const viewParams = new URLSearchParams();
  viewParams.set('linkedModule', moduleKey);
  viewParams.set('linkedRecordId', recordId);

  return (
    <Card data-testid="record-tasks">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="h-4 w-4" />
          Tasks · {label}
        </CardTitle>
        <div className="flex items-center gap-2">
          {workerTotal != null && (
            <span
              className="inline-flex items-center gap-1 text-sm text-muted-foreground"
              data-testid="farm-worker-count"
            >
              <Users className="h-3.5 w-3.5" />
              {workerTotal} worker{workerTotal === 1 ? '' : 's'}
            </span>
          )}
          {canManage && (
            <Button
              size="sm"
              onClick={() => router.push(`/tasks/new?${newTaskParams.toString()}`)}
            >
              <Plus className="mr-1 h-4 w-4" />
              New task
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tasks linked to {heading} yet.
          </p>
        ) : (
          <ul className="divide-y">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-3 py-2">
                <Link
                  href={`/tasks/${task.id}`}
                  className="truncate font-medium hover:underline"
                >
                  {task.title}
                </Link>
                <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                  {task.assignedToName || 'Unassigned'}
                  <Badge variant={statusVariant[task.status] || 'secondary'}>
                    {task.status}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}

        <Link
          href={`/tasks?${viewParams.toString()}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          View all linked tasks
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
          {openCount > 0 && (
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
              {openCount} open
            </span>
          )}
        </Link>
      </CardContent>
    </Card>
  );
}
