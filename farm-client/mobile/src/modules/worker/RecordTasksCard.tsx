import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { tasksAPI, workersAPI } from '../../services/api';
import { unwrapList } from '../../core/utils/listPayload';
import { describeApiError } from '../../core/utils/apiError';
import { usePermission } from '../../core/hooks/usePermission';
import { useAppTheme } from '../../core/theme/ThemeContext';
import { Card } from '../../core/ui/UIComponents';
import { linkedModuleLabel, linkedTasksPath, type LinkedModule } from './taskLinks';

/** Rows the preview may show; the fetch pulls a little more so the "open" count is honest. */
const PREVIEW_LIMIT = 5;
const FETCH_LIMIT = 20;

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  IN_PROGRESS: '#3B82F6',
  COMPLETED: '#10B981',
  CANCELLED: '#EF4444',
};

const styles = StyleSheet.create({
  card: { marginBottom: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  title: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  headerAction: { fontSize: 14, fontWeight: '600' },
  count: { fontSize: 12, marginBottom: 6 },
  meta: { fontSize: 12, marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  rowMain: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowSide: { alignItems: 'flex-end' },
  rowStatus: { fontSize: 12, fontWeight: '600' },
  rowPriority: { fontSize: 11, marginTop: 2 },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    marginTop: 4,
  },
  viewAll: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  openPill: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
});

export interface RecordTasksCardProps {
  /** Which farm-module record the tasks are linked to (Task.linkedModule). */
  moduleKey: LinkedModule;
  recordId: string;
  recordName?: string;
  /** When given, the card also reports this farm's worker headcount. */
  farmId?: string;
}

/**
 * The tasks panel every module's record page carries: tasks raised against
 * this exact record (queried server-side by linkedModule + linkedRecordId,
 * never filtered client-side) plus the farm's worker headcount when the
 * record belongs to a farm. Empty is a first-class state — it is what tells
 * the reader nothing has been scheduled here yet.
 */
export function RecordTasksCard({ moduleKey, recordId, recordName, farmId }: RecordTasksCardProps) {
  const router = useRouter();
  const { canCreate } = usePermission();
  const { colors: tc, isDark } = useAppTheme();
  const canManage = canCreate('hr');
  const label = linkedModuleLabel(moduleKey);
  const heading = recordName || label;

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [workerTotal, setWorkerTotal] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!recordId) {
      setLoading(false);
      return;
    }
    setLoadError(null);
    try {
      const res = await tasksAPI.list({
        linkedModule: moduleKey,
        linkedRecordId: recordId,
        limit: FETCH_LIMIT,
      });
      setTasks(unwrapList(res?.data));
    } catch (err: any) {
      // A failed panel must not read as "no tasks here yet".
      setLoadError(describeApiError(err, "Couldn't load tasks"));
      if (__DEV__) console.warn('[RecordTasksCard] Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [moduleKey, recordId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!farmId) return;
    let cancelled = false;
    // limit:1 keeps the payload to one row; `total` is the real headcount.
    workersAPI
      .list({ farmId, limit: 1 })
      .then((res: any) => {
        const body = res?.data;
        const total = Array.isArray(body) ? body.length : body?.total;
        if (!cancelled && typeof total === 'number') setWorkerTotal(total);
      })
      .catch(() => {
        // The headcount is decoration — losing it must not break the card.
        if (__DEV__) console.warn('[RecordTasksCard] Failed to load worker count');
      });
    return () => {
      cancelled = true;
    };
  }, [farmId]);

  const openCount = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length;
  const shown = tasks.slice(0, PREVIEW_LIMIT);
  const filterPath = linkedTasksPath(moduleKey, recordId, recordName);
  const newTaskPath = `${filterPath}&newTask=1`;

  const divider = { borderColor: isDark ? tc.border : '#F0F0F0' };

  return (
    <Card style={styles.card} accessibilityLabel={`Tasks linked to ${heading}`}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: tc.text }]}>Tasks · {label}</Text>
        {canManage && (
          <TouchableOpacity
            onPress={() => router.push(newTaskPath as any)}
            accessibilityRole="button"
            accessibilityLabel="Create task"
          >
            <Text style={[styles.headerAction, { color: tc.primary }]}>＋ New task</Text>
          </TouchableOpacity>
        )}
      </View>
      {workerTotal != null && (
        <Text style={[styles.count, { color: tc.textSecondary }]}>
          {workerTotal} worker{workerTotal === 1 ? '' : 's'}
        </Text>
      )}

      {loading ? (
        <Text style={[styles.meta, { color: tc.textSecondary }]}>Loading tasks…</Text>
      ) : loadError ? (
        <View style={styles.headerRow}>
          <Text style={[styles.meta, { color: tc.error }]}>{loadError}</Text>
          <TouchableOpacity onPress={load} accessibilityLabel="Retry loading tasks">
            <Text style={[styles.headerAction, { color: tc.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : tasks.length === 0 ? (
        <Text style={[styles.meta, { color: tc.textSecondary }]}>No tasks linked to {heading}</Text>
      ) : (
        shown.map((task) => (
          <TouchableOpacity
            key={task.id}
            style={[styles.row, divider]}
            onPress={() => router.push(`/tasks/${task.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Open task ${task.title}`}
          >
            <View style={styles.rowMain}>
              <Text style={[styles.rowTitle, { color: tc.text }]} numberOfLines={1}>
                {task.title}
              </Text>
              <Text style={[styles.rowSub, { color: tc.textSecondary }]}>
                {task.assignedToName || 'Unassigned'}
              </Text>
            </View>
            <View style={styles.rowSide}>
              <Text style={[styles.rowStatus, { color: STATUS_COLORS[task.status] || tc.textSecondary }]}>
                {String(task.status || '').replace('_', ' ') || '—'}
              </Text>
              <Text style={[styles.rowPriority, { color: tc.textSecondary }]}>
                {task.priority || '—'}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      <TouchableOpacity
        style={[styles.viewAllRow, divider]}
        onPress={() => router.push(filterPath as any)}
        accessibilityRole="link"
        accessibilityLabel="View all linked tasks"
      >
        <Text style={[styles.viewAll, { color: tc.textSecondary }]}>View all linked tasks</Text>
        {openCount > 0 && (
          <Text style={[styles.openPill, { backgroundColor: isDark ? tc.surface : '#F3F4F6', color: tc.textSecondary }]}>
            {openCount} open
          </Text>
        )}
      </TouchableOpacity>
    </Card>
  );
}
