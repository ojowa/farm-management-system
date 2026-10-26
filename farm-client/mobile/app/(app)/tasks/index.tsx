import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MenuButton } from '@/core/ui/MenuButton';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { usePermission } from '@/core/hooks/usePermission';
import { Card, Button, colors } from '@/core/ui/UIComponents';
import { StateView } from '@/core/ui/feedback';
import { tasksAPI } from '@/modules/worker';
// Direct path (not the barrel) so a test that mocks '@/modules/worker' still
// gets the picker itself.
import { TaskLinkFields } from '@/modules/worker/TaskLinkFields';
import { linkedModuleLabel } from '@/modules/worker/taskLinks';
import { workersAPI } from '@/modules/hr';
import { offlineTasksAPI } from '@/modules/worker';
import { describeApiError } from '@/core/utils/apiError';
import { unwrapList } from '@/core/utils/listPayload';
import { useAppTheme } from '@/core/theme/ThemeContext';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  content: { paddingHorizontal: 16, paddingVertical: 12 },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
    marginBottom: 12,
  },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBtnText: { fontSize: 12, color: colors.text },
  filterBtnTextActive: { color: '#FFFFFF' },
  taskCard: { marginBottom: 12 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#FFFFFF' },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  taskDesc: { fontSize: 13, color: colors.textLight, marginBottom: 8 },
  taskMeta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  taskMetaText: { fontSize: 11, color: colors.textLight },
  overdueText: { fontSize: 11, color: '#DC2626', fontWeight: '600' },
  taskActions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: colors.textLight, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: colors.text,
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  select: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: '#FFFFFF',
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
});

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#9CA3AF',
  MEDIUM: '#F59E0B',
  HIGH: '#F97316',
  URGENT: '#EF4444',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  IN_PROGRESS: '#3B82F6',
  COMPLETED: '#10B981',
  CANCELLED: '#EF4444',
};

const RECURRENCE_RULES = ['DAILY', 'WEEKLY', 'MONTHLY'];

/** Is this task past due (and still open)? */
function isOverdue(task: any): boolean {
  if (!task?.dueDate) return false;
  if (task.status === 'COMPLETED' || task.status === 'CANCELLED') return false;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < Date.now();
}

export default function TasksScreen() {
  const { user } = useAuth();
  const { canCreate, canDelete } = usePermission();
  const router = useRouter();
  // Tasks live under the HR module — the API enforces hr.write / hr.delete
  // (there are no task.* permissions).
  const canManageTasks = canCreate('hr');
  const canRemoveTasks = canDelete('hr');

  // A record page's "View all" / "＋ New task" arrives as query params — the
  // list then shows exactly this record's tasks until the chip is cleared.
  const routeParams = useLocalSearchParams<{
    linkedModule?: string;
    linkedRecordId?: string;
    linkedRecordName?: string;
    newTask?: string;
  }>();
  const pick = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value) || '';
  const routeModule = pick(routeParams.linkedModule);
  const routeRecordId = pick(routeParams.linkedRecordId);
  const routeRecordName = pick(routeParams.linkedRecordName);
  const routeNewTask = pick(routeParams.newTask) === '1' || pick(routeParams.newTask) === 'true';
  const routeLink =
    routeModule && routeRecordId
      ? { module: routeModule, id: routeRecordId, name: routeRecordName }
      : null;

  const [linkFilter, setLinkFilter] = useState<{ module: string; id: string; name: string } | null>(
    routeLink
  );

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [assignedToId, setAssignedToId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState('WEEKLY');
  const [saving, setSaving] = useState(false);
  const [workers, setWorkers] = useState<any[]>([]);
  // Task create/edit: owning department + the record this task is about.
  const [departmentId, setDepartmentId] = useState('');
  const [linkedModule, setLinkedModule] = useState('');
  const [linkedRecordId, setLinkedRecordId] = useState('');
  const [linkedRecordName, setLinkedRecordName] = useState<string | null>(null);
  const { colors: tc, isDark } = useAppTheme();

  const dynamicStyles = {
    container: {
      backgroundColor: tc.background,
    },
    searchInput: {
      backgroundColor: tc.inputBg,
      borderColor: tc.inputBorder,
      color: tc.inputText,
    },
    filterBtn: {
      backgroundColor: tc.card,
      borderColor: tc.border,
    },
    filterBtnText: {
      color: tc.text,
    },
    cardBackground: {
      backgroundColor: tc.card,
      borderColor: isDark ? tc.border : 'transparent',
      borderWidth: isDark ? 1 : 0,
    },
    taskTitle: {
      color: tc.text,
    },
    taskDesc: {
      color: tc.textSecondary,
    },
    taskMetaText: {
      color: tc.textSecondary,
    },
    emptyText: {
      color: tc.text,
    },
    emptySubtext: {
      color: tc.textSecondary,
    },
    modalOverlay: {
      backgroundColor: tc.overlay,
    },
    modalContent: {
      backgroundColor: tc.surface,
    },
    modalTitle: {
      color: tc.text,
    },
    input: {
      backgroundColor: tc.inputBg,
      borderColor: tc.inputBorder,
      color: tc.inputText,
    },
    label: {
      color: tc.text,
    },
  };

  const loadTasks = useCallback(async () => {
    setLoadError(null);
    try {
      const params: any = {};
      if (filter !== 'all') params.status = filter.toUpperCase();
      if (recurringOnly) params.isRecurring = true;
      // Server-side link filter — the badge on a card and the chip above the
      // list both narrow to one record without paging through everything.
      if (linkFilter) {
        params.linkedModule = linkFilter.module;
        params.linkedRecordId = linkFilter.id;
      }
      const res = await offlineTasksAPI.list(params);
      // GET /tasks answers `{ data, stats }` (hr.service.ts:896) — an object,
      // not a bare array. `res.data || []` therefore yielded the object and the
      // FlatList renderItem crashed. Normalize.
      setTasks(unwrapList(res?.data));
    } catch (err: any) {
      // Surface the failure — a silent catch renders as a false "No tasks".
      setLoadError(describeApiError(err, "Couldn't load tasks"));
      if (__DEV__) console.warn('[TasksScreen] Failed to load tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, recurringOnly, linkFilter]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // Re-read the URL's link only when it actually changes: clearing the chip
  // must not be undone by the params still sitting in the address bar.
  const routeKey = `${routeModule}|${routeRecordId}`;
  const appliedRouteKey = useRef(routeKey);
  useEffect(() => {
    if (appliedRouteKey.current === routeKey) return;
    appliedRouteKey.current = routeKey;
    setLinkFilter(routeLink);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  useEffect(() => {
    if (canManageTasks) {
      workersAPI.list().then((res) => setWorkers(res.data)).catch(() => {
        if (__DEV__) console.warn('[TasksScreen] Failed to load workers');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => { setRefreshing(true); loadTasks(); };

  const openModal = (task?: any, link?: { module: string; id: string; name: string }) => {
    if (task) {
      setEditingTask(task);
      setTitle(task.title);
      setDesc(task.description || '');
      setPriority(task.priority);
      setAssignedToId(task.assignedToId || '');
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      setIsRecurring(!!task.isRecurring);
      setRecurrenceRule(task.recurrenceRule || 'WEEKLY');
      setDepartmentId(task.departmentId || '');
      setLinkedModule(task.linkedModule || '');
      setLinkedRecordId(task.linkedRecordId || '');
      setLinkedRecordName(task.linkedRecordName || null);
    } else {
      setEditingTask(null);
      setTitle('');
      setDesc('');
      setPriority('MEDIUM');
      setAssignedToId('');
      setDueDate('');
      setIsRecurring(false);
      setRecurrenceRule('WEEKLY');
      setDepartmentId('');
      // You asked for a task about this record — prefill the link rather than
      // making the author pick it again.
      setLinkedModule(link?.module || '');
      setLinkedRecordId(link?.id || '');
      setLinkedRecordName(link?.name || null);
    }
    setShowModal(true);
  };

  // Arriving from a record page's "＋ New task": open the form straight away
  // with the record already linked.
  const openedRouteTask = useRef(false);
  useEffect(() => {
    if (!routeNewTask || openedRouteTask.current) return;
    openedRouteTask.current = true;
    if (!canManageTasks) return;
    openModal(undefined, routeLink || linkFilter || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeNewTask]);

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Error', 'Title is required'); return; }
    setSaving(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: desc.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        isRecurring,
        recurrenceRule: isRecurring ? recurrenceRule : null,
        // Null, not undefined: clearing a department or link must reach the
        // server, which only writes a field it is actually given.
        departmentId: departmentId || null,
        linkedModule: linkedModule && linkedRecordId ? linkedModule : null,
        linkedRecordId: linkedModule && linkedRecordId ? linkedRecordId : null,
        linkedRecordName: linkedModule && linkedRecordId ? linkedRecordName || null : null,
      };
      if (assignedToId) {
        payload.assignedToId = assignedToId;
        const w = workers.find((w) => w.id === assignedToId);
        payload.assignedToName = w ? `${w.firstName} ${w.lastName}` : '';
      }
      if (editingTask) {
        await offlineTasksAPI.update(editingTask.id, payload);
      } else {
        await offlineTasksAPI.create(payload);
      }
      setShowModal(false);
      await loadTasks();
    } catch (err: any) {
      Alert.alert('Error', describeApiError(err, 'Failed to complete this action.'));
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (task: any, newStatus: string) => {
    try {
      await offlineTasksAPI.update(task.id, { status: newStatus });
      await loadTasks();
    } catch (err: any) {
      Alert.alert('Error', describeApiError(err, 'Failed to complete this action.'));
    }
  };

  const handleCancelTask = (task: any) => {
    Alert.alert('Cancel Task', `Mark "${task.title}" as cancelled?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Task',
        style: 'destructive',
        onPress: () => handleStatusChange(task, 'CANCELLED'),
      },
    ]);
  };

  const handleDelete = (task: any) => {
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await offlineTasksAPI.delete(task.id);
            await loadTasks();
          } catch (err: any) {
            Alert.alert('Error', describeApiError(err, 'Failed to complete this action.'));
          }
        },
      },
    ]);
  };

  const searchTerm = search.trim().toLowerCase();
  const filteredTasks = useMemo(() => {
    if (!searchTerm) return tasks;
    return tasks.filter((t) =>
      [t.title, t.description, t.assignedToName]
        .filter(Boolean)
        .some((s: string) => String(s).toLowerCase().includes(searchTerm)),
    );
  }, [tasks, searchTerm]);

  const isSelfAssigned = (task: any) =>
    !!user?.id && (task.assignedToId === user.id);

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <MenuButton />
        <Text style={[styles.headerTitle, { flex: 1 }]}>{canManageTasks ? 'Tasks' : 'My Tasks'}</Text>
        {canManageTasks && (
          <TouchableOpacity style={styles.addButton} onPress={() => openModal()} accessibilityLabel="Create task">
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search tasks…"
              style={[styles.searchInput, dynamicStyles.searchInput]}
              placeholderTextColor={tc.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Search tasks"
            />
            <View style={styles.filterRow}>
              {['all', 'pending', 'in_progress', 'completed', 'cancelled'].map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[styles.filterBtn, dynamicStyles.filterBtn, filter === f && styles.filterBtnActive]}
                  accessibilityLabel={`Filter by ${f === 'all' ? 'all tasks' : f.replace('_', ' ')}`}
                >
                  <Text style={[styles.filterBtnText, dynamicStyles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
                    {f === 'all' ? 'All' : f.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setRecurringOnly((v) => !v)}
                style={[styles.filterBtn, dynamicStyles.filterBtn, recurringOnly && styles.filterBtnActive]}
                accessibilityLabel="Filter by recurring tasks"
              >
                <Text style={[styles.filterBtnText, dynamicStyles.filterBtnText, recurringOnly && styles.filterBtnTextActive]}>
                  ⟳ Recurring
                </Text>
              </TouchableOpacity>
              {linkFilter && (
                <TouchableOpacity
                  onPress={() => setLinkFilter(null)}
                  style={[styles.filterBtn, dynamicStyles.filterBtn, styles.filterBtnActive]}
                  accessibilityLabel={`Clear linked record filter ${linkFilter.name || linkedModuleLabel(linkFilter.module)}`}
                >
                  <Text style={[styles.filterBtnText, dynamicStyles.filterBtnText, styles.filterBtnTextActive]}>
                    🔗 {linkFilter.name || linkedModuleLabel(linkFilter.module)} ✕
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : loadError ? (
            <StateView
              variant="error"
              title="Couldn't load tasks"
              message={loadError}
              onRetry={() => { setLoading(true); loadTasks(); }}
              retryLabel="Try Again"
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={[styles.emptyText, dynamicStyles.emptyText]}>
                {searchTerm || filter !== 'all' || recurringOnly || linkFilter ? 'No matching tasks' : 'No tasks'}
              </Text>
              <Text style={[styles.emptySubtext, dynamicStyles.emptySubtext]}>
                {searchTerm || filter !== 'all' || recurringOnly || linkFilter
                  ? 'Try a different search or filter.'
                  : canManageTasks
                  ? 'Tap + to create a task'
                  : 'No tasks assigned to you yet'}
              </Text>
            </View>
          )
        }
        renderItem={({ item: task }) => {
          const overdue = isOverdue(task);
          return (
            <Card style={[styles.taskCard, dynamicStyles.cardBackground]} onPress={() => router.push(`/tasks/${task.id}`)} accessibilityLabel={`Open task ${task.title}`}>
              <View style={styles.taskHeader}>
                <Text style={[styles.taskTitle, dynamicStyles.taskTitle]}>{task.title}</Text>
                <View style={[styles.badge, { backgroundColor: PRIORITY_COLORS[task.priority] || '#9CA3AF' }]}>
                  <Text style={styles.badgeText}>{task.priority}</Text>
                </View>
              </View>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS[task.status] || '#9CA3AF' }]}>
                  <Text style={styles.badgeText}>{task.status.replace('_', ' ')}</Text>
                </View>
                {overdue && (
                  <View style={[styles.badge, { backgroundColor: '#DC2626' }]}>
                    <Text style={styles.badgeText}>OVERDUE</Text>
                  </View>
                )}
                {task.isRecurring && (
                  <View style={[styles.badge, { backgroundColor: '#8B5CF6' }]}>
                    <Text style={styles.badgeText}>⟳ {task.recurrenceRule || 'RECURRING'}</Text>
                  </View>
                )}
                {task.linkedModule && (
                  <TouchableOpacity
                    onPress={() =>
                      setLinkFilter({
                        module: task.linkedModule,
                        id: task.linkedRecordId || '',
                        name: task.linkedRecordName || '',
                      })
                    }
                    style={[styles.badge, { backgroundColor: '#0284C7' }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by tasks linked to ${
                      task.linkedRecordName || linkedModuleLabel(task.linkedModule)
                    }`}
                  >
                    <Text style={styles.badgeText} numberOfLines={1}>
                      🔗 {linkedModuleLabel(task.linkedModule)}
                      {task.linkedRecordName ? ` · ${task.linkedRecordName}` : ''}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {task.description ? <Text style={[styles.taskDesc, dynamicStyles.taskDesc]}>{task.description}</Text> : null}
              <View style={styles.taskMeta}>
                {task.assignedToName && <Text style={[styles.taskMetaText, dynamicStyles.taskMetaText]}>To: {task.assignedToName}</Text>}
                {task.dueDate && (
                  <Text style={overdue ? styles.overdueText : [styles.taskMetaText, dynamicStyles.taskMetaText]}>
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </Text>
                )}
                {task.completedAt && <Text style={[styles.taskMetaText, dynamicStyles.taskMetaText]}>Done: {new Date(task.completedAt).toLocaleDateString()}</Text>}
                {task.isRecurring && task.nextDueAt && (
                  <Text style={[styles.taskMetaText, dynamicStyles.taskMetaText]}>Next: {new Date(task.nextDueAt).toLocaleDateString()}</Text>
                )}
              </View>

              <View style={styles.taskActions}>
                {canManageTasks && task.status !== 'CANCELLED' && task.status !== 'COMPLETED' && (
                  <TouchableOpacity onPress={() => handleCancelTask(task)} style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]} accessibilityLabel="Cancel task">
                    <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Cancel</Text>
                  </TouchableOpacity>
                )}
                {canManageTasks && (
                  <>
                    <TouchableOpacity onPress={() => openModal(task)} style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]} accessibilityLabel="Edit task">
                      <Text style={[styles.actionBtnText, { color: '#059669' }]}>Edit</Text>
                    </TouchableOpacity>
                    {canRemoveTasks && (
                      <TouchableOpacity onPress={() => handleDelete(task)} style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]} accessibilityLabel="Delete task">
                        <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
                {!canManageTasks && isSelfAssigned(task) && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                  <>
                    {task.status === 'PENDING' && (
                      <TouchableOpacity onPress={() => handleStatusChange(task, 'IN_PROGRESS')} style={[styles.actionBtn, { backgroundColor: '#DBEAFE' }]} accessibilityLabel="Start task">
                        <Text style={[styles.actionBtnText, { color: '#2563EB' }]}>Start</Text>
                      </TouchableOpacity>
                    )}
                    {task.status === 'IN_PROGRESS' && (
                      <TouchableOpacity onPress={() => handleStatusChange(task, 'COMPLETED')} style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]} accessibilityLabel="Complete task">
                        <Text style={[styles.actionBtnText, { color: '#059669' }]}>Complete</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </Card>
          );
        }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={[styles.modalOverlay, dynamicStyles.modalOverlay]}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>{editingTask ? 'Edit Task' : 'New Task'}</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="Task title" style={[styles.input, dynamicStyles.input]} placeholderTextColor={tc.placeholder} />
              <TextInput value={desc} onChangeText={setDesc} placeholder="Description (optional)" style={[styles.input, dynamicStyles.input]} placeholderTextColor={tc.placeholder} multiline />
              <Text style={[styles.label, dynamicStyles.label]}>Priority</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPriority(p)}
                    style={[styles.filterBtn, dynamicStyles.filterBtn, priority === p && { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] }]}
                  >
                    <Text style={[styles.filterBtnText, dynamicStyles.filterBtnText, priority === p && { color: '#FFFFFF' }]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {canManageTasks && workers.length > 0 && (
                <>
                  <Text style={[styles.label, dynamicStyles.label]}>Assign To</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <TouchableOpacity
                      onPress={() => setAssignedToId('')}
                      style={[styles.filterBtn, dynamicStyles.filterBtn, !assignedToId && styles.filterBtnActive, { marginRight: 8 }]}
                    >
                      <Text style={[styles.filterBtnText, dynamicStyles.filterBtnText, !assignedToId && styles.filterBtnTextActive]}>None</Text>
                    </TouchableOpacity>
                    {workers.map((w) => (
                      <TouchableOpacity
                        key={w.id}
                        onPress={() => setAssignedToId(w.id)}
                        style={[styles.filterBtn, dynamicStyles.filterBtn, assignedToId === w.id && styles.filterBtnActive, { marginRight: 8 }]}
                      >
                        <Text style={[styles.filterBtnText, dynamicStyles.filterBtnText, assignedToId === w.id && styles.filterBtnTextActive]}>
                          {w.firstName} {w.lastName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}
              <TextInput value={dueDate} onChangeText={setDueDate} placeholder="Due date (YYYY-MM-DD)" style={[styles.input, dynamicStyles.input]} placeholderTextColor={tc.placeholder} />
              <Text style={[styles.label, dynamicStyles.label]}>Repeats</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <TouchableOpacity
                  onPress={() => setIsRecurring(false)}
                  style={[styles.filterBtn, dynamicStyles.filterBtn, !isRecurring && styles.filterBtnActive]}
                  accessibilityLabel="Does not repeat"
                >
                  <Text style={[styles.filterBtnText, dynamicStyles.filterBtnText, !isRecurring && styles.filterBtnTextActive]}>Never</Text>
                </TouchableOpacity>
                {RECURRENCE_RULES.map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => { setIsRecurring(true); setRecurrenceRule(r); }}
                    style={[styles.filterBtn, dynamicStyles.filterBtn, isRecurring && recurrenceRule === r && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }]}
                    accessibilityLabel={`Repeat ${r.toLowerCase()}`}
                  >
                    <Text style={[styles.filterBtnText, dynamicStyles.filterBtnText, isRecurring && recurrenceRule === r && { color: '#FFFFFF' }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TaskLinkFields
                departmentId={departmentId}
                onDepartmentChange={setDepartmentId}
                linkedModule={linkedModule}
                linkedRecordId={linkedRecordId}
                linkedRecordName={linkedRecordName}
                onLinkChange={(change) => {
                  setLinkedModule(change.linkedModule);
                  setLinkedRecordId(change.linkedRecordId);
                  setLinkedRecordName(change.linkedRecordName);
                }}
              />
              <View style={styles.modalActions}>
                <Button title="Cancel" onPress={() => setShowModal(false)} variant="secondary" style={{ flex: 1 }} />
                <Button title={saving ? 'Saving...' : editingTask ? 'Update' : 'Create'} onPress={handleSave} disabled={saving} style={{ flex: 1 }} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
