import React, { useState, useEffect, useCallback } from 'react';
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
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { usePermission } from '@/core/hooks/usePermission';
import { Card, Button, colors } from '@/core/ui/UIComponents';
import { tasksAPI, workersAPI } from '@/services/api';
import { offlineTasksAPI } from '@/services/offlineApi';

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
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
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
  taskDesc: { fontSize: 13, color: colors.textLight, marginBottom: 8 },
  taskMeta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  taskMetaText: { fontSize: 11, color: colors.textLight },
  taskActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
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

export default function TasksScreen() {
  const { user } = useAuth();
  const { canCreate } = usePermission();
  const canManageTasks = canCreate('task');

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [assignedToId, setAssignedToId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [workers, setWorkers] = useState<any[]>([]);

  const loadTasks = useCallback(async () => {
    try {
      const params: any = {};
      if (filter !== 'all') params.status = filter.toUpperCase();
      const res = await offlineTasksAPI.list(params);
      setTasks(res.data);
    } catch {
      console.warn('[TasksScreen] Failed to load tasks');
    }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  useEffect(() => {
    if (canManageTasks) {
      workersAPI.list().then((res) => setWorkers(res.data)).catch(() => {
        console.warn('[TasksScreen] Failed to load workers');
      });
    }
  }, []);

  const onRefresh = () => { setRefreshing(true); loadTasks(); };

  const openModal = (task?: any) => {
    if (task) {
      setEditingTask(task);
      setTitle(task.title);
      setDesc(task.description || '');
      setPriority(task.priority);
      setAssignedToId(task.assignedToId || '');
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
    } else {
      setEditingTask(null);
      setTitle('');
      setDesc('');
      setPriority('MEDIUM');
      setAssignedToId('');
      setDueDate('');
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Error', 'Title is required'); return; }
    setSaving(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: desc.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
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
      Alert.alert('Error', err?.response?.data?.error || 'Failed to save task');
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (task: any, newStatus: string) => {
    try {
      await offlineTasksAPI.update(task.id, { status: newStatus });
      await loadTasks();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to update');
    }
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
            Alert.alert('Error', err?.response?.data?.error || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const filteredTasks = tasks;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{canManageTasks ? 'Tasks' : 'My Tasks'}</Text>
        {canManageTasks && (
          <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
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
          <View style={styles.filterRow}>
            {['all', 'pending', 'in_progress', 'completed'].map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
                accessibilityLabel={`Filter by ${f === 'all' ? 'all tasks' : f.replace('_', ' ')}`}
              >
                <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
                  {f === 'all' ? 'All' : f.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyText}>No tasks</Text>
              <Text style={styles.emptySubtext}>
                {canManageTasks ? 'Tap + to create a task' : 'No tasks assigned to you yet'}
              </Text>
            </View>
          )
        }
        renderItem={({ item: task }) => (
          <Card style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <View style={[styles.badge, { backgroundColor: PRIORITY_COLORS[task.priority] || '#9CA3AF' }]}>
                <Text style={styles.badgeText}>{task.priority}</Text>
              </View>
            </View>
            <View style={[styles.badge, { backgroundColor: STATUS_COLORS[task.status] || '#9CA3AF', alignSelf: 'flex-start', marginBottom: 8 }]}>
              <Text style={styles.badgeText}>{task.status.replace('_', ' ')}</Text>
            </View>
            {task.description ? <Text style={styles.taskDesc}>{task.description}</Text> : null}
            <View style={styles.taskMeta}>
              {task.assignedToName && <Text style={styles.taskMetaText}>To: {task.assignedToName}</Text>}
              {task.dueDate && <Text style={styles.taskMetaText}>Due: {new Date(task.dueDate).toLocaleDateString()}</Text>}
              {task.completedAt && <Text style={styles.taskMetaText}>Done: {new Date(task.completedAt).toLocaleDateString()}</Text>}
            </View>

            <View style={styles.taskActions}>
              {!canManageTasks && task.assignedToId === user?.id && task.status !== 'COMPLETED' && (
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
              {canManageTasks && (
                <>
                  <TouchableOpacity onPress={() => openModal(task)} style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]} accessibilityLabel="Edit task">
                    <Text style={[styles.actionBtnText, { color: '#059669' }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(task)} style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]} accessibilityLabel="Delete task">
                    <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Delete</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Card>
        )}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingTask ? 'Edit Task' : 'New Task'}</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Task title" style={styles.input} />
            <TextInput value={desc} onChangeText={setDesc} placeholder="Description (optional)" style={styles.input} multiline />
            <Text style={styles.label}>Priority</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[styles.filterBtn, priority === p && { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] }]}
                >
                  <Text style={[styles.filterBtnText, priority === p && { color: '#FFFFFF' }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {canManageTasks && workers.length > 0 && (
              <>
                <Text style={styles.label}>Assign To</Text>
                <View style={styles.select}>
                  <TouchableOpacity onPress={() => {}}>
                    <Text style={{ color: assignedToId ? colors.text : colors.textLight }}>
                      {assignedToId ? workers.find((w) => w.id === assignedToId) ? `${workers.find((w) => w.id === assignedToId)?.firstName} ${workers.find((w) => w.id === assignedToId)?.lastName}` : 'Select worker' : 'Select worker'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <TouchableOpacity
                    onPress={() => setAssignedToId('')}
                    style={[styles.filterBtn, !assignedToId && styles.filterBtnActive, { marginRight: 8 }]}
                  >
                    <Text style={[styles.filterBtnText, !assignedToId && styles.filterBtnTextActive]}>None</Text>
                  </TouchableOpacity>
                  {workers.map((w) => (
                    <TouchableOpacity
                      key={w.id}
                      onPress={() => setAssignedToId(w.id)}
                      style={[styles.filterBtn, assignedToId === w.id && styles.filterBtnActive, { marginRight: 8 }]}
                    >
                      <Text style={[styles.filterBtnText, assignedToId === w.id && styles.filterBtnTextActive]}>
                        {w.firstName} {w.lastName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            <TextInput value={dueDate} onChangeText={setDueDate} placeholder="Due date (YYYY-MM-DD)" style={styles.input} />
            <View style={styles.modalActions}>
              <Button title="Cancel" onPress={() => setShowModal(false)} variant="secondary" style={{ flex: 1 }} />
              <Button title={saving ? 'Saving...' : editingTask ? 'Update' : 'Create'} onPress={handleSave} disabled={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
