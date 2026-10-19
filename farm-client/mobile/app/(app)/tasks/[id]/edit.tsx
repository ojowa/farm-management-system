import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { tasksAPI } from '@/modules/worker';
import { workersAPI } from '@/modules/hr';
import { Button, colors } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';

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
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', flex: 1, textAlign: 'center' },
  backButton: { padding: 8 },
  backButtonText: { color: '#FFFFFF', fontSize: 16 },
  content: { paddingHorizontal: 20, paddingVertical: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    fontSize: 14,
    color: colors.text,
    backgroundColor: '#FFFFFF',
  },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 14 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.text },
  chipTextActive: { color: '#FFFFFF' },
  actions: { gap: 12, marginTop: 8 },
});

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#9CA3AF',
  MEDIUM: '#F59E0B',
  HIGH: '#F97316',
  URGENT: '#EF4444',
};

const RECURRENCE_RULES = ['DAILY', 'WEEKLY', 'MONTHLY'];

function unwrapOne<T>(payload: any): T | null {
  if (payload?.id) return payload as T;
  if (payload?.data?.id) return payload.data as T;
  return null;
}

export default function TaskEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const { canCreate } = usePermission();
  const canManage = canCreate('hr');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [assignedToId, setAssignedToId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState('WEEKLY');
  const [workers, setWorkers] = useState<any[]>([]);

  const load = async () => {
    if (!id) {
      setLoadError('Missing task id.');
      setLoading(false);
      return;
    }
    try {
      setLoadError(null);
      const res = await tasksAPI.get(id);
      const task = unwrapOne<any>(res.data);
      if (!task) {
        setLoadError('Task not found.');
        return;
      }
      setTitle(task.title || '');
      setDesc(task.description || '');
      setPriority(task.priority || 'MEDIUM');
      setAssignedToId(task.assignedToId || '');
      setDueDate(task.dueDate ? String(task.dueDate).split('T')[0] : '');
      setIsRecurring(!!task.isRecurring);
      setRecurrenceRule(task.recurrenceRule || 'WEEKLY');
    } catch (err: any) {
      setLoadError(describeApiError(err, "Couldn't load this task"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    workersAPI
      .list()
      .then((res) => setWorkers(res.data || []))
      .catch(() => {
        if (__DEV__) console.warn('[TaskEdit] Failed to load workers');
      });
  }, []);

  const handleSave = async () => {
    if (!title.trim()) {
      showError('Title is required.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: desc.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        isRecurring,
        recurrenceRule: isRecurring ? recurrenceRule : null,
      };
      if (assignedToId) {
        payload.assignedToId = assignedToId;
        const w = workers.find((x) => x.id === assignedToId);
        payload.assignedToName = w ? `${w.firstName} ${w.lastName}` : '';
      } else {
        payload.assignedToId = null;
        payload.assignedToName = null;
      }
      await tasksAPI.update(id, payload);
      success('Task updated');
      router.back();
    } catch (err: any) {
      showError(describeApiError(err, 'Failed to save the task.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Task</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScreenLoading message="Loading…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Task</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load this task"
          message={loadError}
          onRetry={() => { setLoading(true); load(); }}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  if (!canManage) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Task</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView variant="error" title="Not allowed" message="You don't have permission to edit tasks." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Task</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>Title *</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="Task title" style={styles.input} />

          <Text style={styles.label}>Description</Text>
          <TextInput value={desc} onChangeText={setDesc} placeholder="Description (optional)" style={[styles.input, { minHeight: 90 }]} multiline />

          <Text style={styles.label}>Priority</Text>
          <View style={styles.chipRow}>
            {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setPriority(p)}
                style={[
                  styles.chip,
                  priority === p && { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] },
                ]}
                accessibilityLabel={`Priority ${p}`}
              >
                <Text style={[styles.chipText, priority === p && { color: '#FFFFFF' }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {workers.length > 0 && (
            <>
              <Text style={styles.label}>Assign To</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <TouchableOpacity
                  onPress={() => setAssignedToId('')}
                  style={[styles.chip, !assignedToId && styles.chipActive, { marginRight: 8 }]}
                >
                  <Text style={[styles.chipText, !assignedToId && styles.chipTextActive]}>None</Text>
                </TouchableOpacity>
                {workers.map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    onPress={() => setAssignedToId(w.id)}
                    style={[styles.chip, assignedToId === w.id && styles.chipActive, { marginRight: 8 }]}
                  >
                    <Text style={[styles.chipText, assignedToId === w.id && styles.chipTextActive]}>
                      {w.firstName} {w.lastName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <Text style={styles.label}>Due Date</Text>
          <TextInput value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" style={styles.input} />

          <Text style={styles.label}>Repeats</Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              onPress={() => setIsRecurring(false)}
              style={[styles.chip, !isRecurring && styles.chipActive]}
              accessibilityLabel="Does not repeat"
            >
              <Text style={[styles.chipText, !isRecurring && styles.chipTextActive]}>Never</Text>
            </TouchableOpacity>
            {RECURRENCE_RULES.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => { setIsRecurring(true); setRecurrenceRule(r); }}
                style={[styles.chip, isRecurring && recurrenceRule === r && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }]}
                accessibilityLabel={`Repeat ${r.toLowerCase()}`}
              >
                <Text style={[styles.chipText, isRecurring && recurrenceRule === r && { color: '#FFFFFF' }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actions}>
            <Button title={saving ? 'Saving…' : 'Save Changes'} onPress={handleSave} disabled={saving} />
            <Button title="Cancel" variant="secondary" onPress={() => router.back()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
