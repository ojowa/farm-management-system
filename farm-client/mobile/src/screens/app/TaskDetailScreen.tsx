import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card, Button, colors } from '../../components/common/UIComponents';
import { offlineTasksAPI } from '../../services/offlineApi';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  content: { paddingHorizontal: 16, paddingVertical: 16 },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: colors.textLight, textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  titleText: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 },
  descText: { fontSize: 15, color: colors.textLight, lineHeight: 22 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  metaIcon: { fontSize: 14, width: 20, textAlign: 'center' },
  metaLabel: { fontSize: 13, color: colors.textLight, width: 80 },
  metaValue: { fontSize: 14, color: colors.text, fontWeight: '500', flex: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  statusTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 12 },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  statusBtnActive: { borderColor: 'transparent' },
  statusBtnText: { fontSize: 12, fontWeight: '600', color: colors.text },
  statusBtnTextActive: { color: '#FFFFFF' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text },
  emptySubtext: { fontSize: 14, color: colors.textLight },
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

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const loadTask = useCallback(async () => {
    if (!id) return;
    try {
      const res = await offlineTasksAPI.list({ id });
      const found = res.data?.find?.((t: any) => t.id === id) || res.data;
      setTask(found);
    } catch {
      Alert.alert('Error', 'Failed to load task');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;
    setUpdating(true);
    try {
      await offlineTasksAPI.update(task.id, { status: newStatus });
      setTask({ ...task, status: newStatus });
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleEdit = () => {
    router.push('/tasks');
  };

  const handleDelete = () => {
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await offlineTasksAPI.delete(task.id);
            router.back();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error || 'Failed to delete');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{"<"}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Details</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{"<"}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Details</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Task not found</Text>
          <Text style={styles.emptySubtext}>This task may have been deleted</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.titleText}>{task.title}</Text>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: PRIORITY_COLORS[task.priority] || '#9CA3AF' }]}>
            <Text style={styles.badgeText}>{task.priority}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[task.status] || '#9CA3AF' }]}>
            <Text style={styles.badgeText}>{task.status.replace('_', ' ')}</Text>
          </View>
        </View>

        {task.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.descText}>{task.description}</Text>
          </View>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Details</Text>
          {task.assignedToName && (
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>👤</Text>
              <Text style={styles.metaLabel}>Assigned</Text>
              <Text style={styles.metaValue}>{task.assignedToName}</Text>
            </View>
          )}
          {task.dueDate && (
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>📅</Text>
              <Text style={styles.metaLabel}>Due Date</Text>
              <Text style={styles.metaValue}>{new Date(task.dueDate).toLocaleDateString()}</Text>
            </View>
          )}
          {task.createdAt && (
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>🕐</Text>
              <Text style={styles.metaLabel}>Created</Text>
              <Text style={styles.metaValue}>{new Date(task.createdAt).toLocaleString()}</Text>
            </View>
          )}
          {task.completedAt && (
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>✅</Text>
              <Text style={styles.metaLabel}>Completed</Text>
              <Text style={styles.metaValue}>{new Date(task.completedAt).toLocaleString()}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.statusTitle}>Update Status</Text>
          <View style={styles.statusRow}>
            {['PENDING', 'IN_PROGRESS', 'COMPLETED'].map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => handleStatusChange(s)}
                disabled={updating || task.status === s}
                style={[
                  styles.statusBtn,
                  task.status === s && styles.statusBtnActive,
                  task.status === s && { backgroundColor: STATUS_COLORS[s] },
                ]}
              >
                <Text
                  style={[
                    styles.statusBtnText,
                    task.status === s && styles.statusBtnTextActive,
                  ]}
                >
                  {s.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity onPress={handleEdit} style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]}>
            <Text style={[styles.actionBtnText, { color: '#059669' }]}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>🗑️ Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
