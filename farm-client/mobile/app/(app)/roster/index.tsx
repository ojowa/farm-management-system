import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { rosterAPI } from '@/modules/hr';
import type { Shift } from '@/modules/hr';
import { Card, Button, TextInputField, Modal, colors } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
import { MenuButton } from '@/core/ui/MenuButton';

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
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    minHeight: 300,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: colors.textLight, marginBottom: 20, textAlign: 'center' },
  shiftCard: { marginBottom: 12 },
  shiftRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shiftInfo: { flex: 1, paddingRight: 8 },
  shiftName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  shiftTime: { fontSize: 13, color: colors.textLight },
  activeBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeBadgeText: { fontSize: 11, fontWeight: '600', color: '#166534' },
  inactiveBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  inactiveBadgeText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  assignmentRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assignmentText: { fontSize: 13, color: colors.text },
  deleteButton: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.error, borderRadius: 6 },
  deleteButtonText: { color: colors.error, fontSize: 12, fontWeight: '600' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalActionButton: { flex: 1 },
});

const TIME_RE = /^\d{2}:\d{2}$/;

function unwrapList<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export default function RosterScreen() {
  const { success, error: showError } = useToasts();
  const { hasPermission } = usePermission();

  // Server: GET /shifts is hr.read, POST/PUT hr.write, DELETE hr.delete.
  const canWrite = hasPermission('hr.write');
  const canDelete = hasPermission('hr.delete');

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignmentCounts, setAssignmentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', startTime: '', endTime: '' });
  const [formErrors, setFormErrors] = useState<{ name?: string; startTime?: string; endTime?: string }>({});

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoadError(null);
      const [shiftsRes, assignmentsRes] = await Promise.allSettled([
        rosterAPI.listShifts(),
        rosterAPI.listAssignments(),
      ]);
      if (shiftsRes.status === 'fulfilled') {
        setShifts(unwrapList<Shift>(shiftsRes.value.data));
      } else {
        throw shiftsRes.reason;
      }
      if (assignmentsRes.status === 'fulfilled') {
        const counts: Record<string, number> = {};
        unwrapList<any>(assignmentsRes.value.data).forEach((a) => {
          if (a?.shiftId) counts[a.shiftId] = (counts[a.shiftId] ?? 0) + 1;
        });
        setAssignmentCounts(counts);
      }
    } catch (error: any) {
      setLoadError(describeApiError(error, "Couldn't load the roster."));
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const errors: typeof formErrors = {};
    if (!form.name.trim()) errors.name = 'Shift name is required';
    if (!form.startTime.trim() || !TIME_RE.test(form.startTime.trim()))
      errors.startTime = 'Use HH:MM (e.g. 08:00)';
    if (!form.endTime.trim() || !TIME_RE.test(form.endTime.trim()))
      errors.endTime = 'Use HH:MM (e.g. 16:00)';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitCreate = async () => {
    if (!validate()) return;
    setCreating(true);
    try {
      await rosterAPI.createShift({
        name: form.name.trim(),
        startTime: form.startTime.trim(),
        endTime: form.endTime.trim(),
      });
      success('Shift created successfully');
      setCreateOpen(false);
      setForm({ name: '', startTime: '', endTime: '' });
      loadAll();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to create shift. Please try again.'));
    } finally {
      setCreating(false);
    }
  };

  const deleteShift = useCallback(
    (shift: Shift) => {
      Alert.alert(
        'Delete Shift',
        `Delete the "${shift.name}" shift? Its assignments will be removed too.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await rosterAPI.deleteShift(shift.id);
                success('Shift deleted');
                loadAll();
              } catch (error: any) {
                showError(describeApiError(error, 'Failed to delete shift.'));
              }
            },
          },
        ]
      );
    },
    [success, showError]
  );

  const updateForm = (field: 'name' | 'startTime' | 'endTime', value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setFormErrors({});
  };

  const renderItem = useCallback(
    ({ item }: { item: Shift }) => {
      const isActive = (item as any).isActive !== false;
      const count = assignmentCounts[item.id] ?? 0;
      return (
        <Card style={styles.shiftCard}>
          <View style={styles.shiftRow}>
            <View style={styles.shiftInfo}>
              <Text style={styles.shiftName}>{item.name}</Text>
              <Text style={styles.shiftTime}>
                {item.startTime} – {item.endTime}
              </Text>
            </View>
            <View style={isActive ? styles.activeBadge : styles.inactiveBadge}>
              <Text style={isActive ? styles.activeBadgeText : styles.inactiveBadgeText}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <View style={styles.assignmentRow}>
            <Text style={styles.assignmentText}>
              {count} {count === 1 ? 'assignment' : 'assignments'}
            </Text>
            {canDelete && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteShift(item)}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${item.name}`}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
      );
    },
    [assignmentCounts, canDelete, deleteShift]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <MenuButton />
          <Text style={styles.headerTitle}>Roster</Text>
        </View>
        <ScreenLoading message="Loading roster…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <MenuButton />
          <Text style={styles.headerTitle}>Roster</Text>
        </View>
        <StateView
          variant="error"
          title="Couldn't load the roster"
          message={loadError}
          onRetry={loadAll}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MenuButton />
        <Text style={styles.headerTitle}>Roster</Text>
        {canWrite && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setCreateOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Create new shift"
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={shifts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>No Shifts Yet</Text>
            <Text style={styles.emptySubtext}>
              Create shifts like “Morning” or “Evening” to build your farm's work roster
            </Text>
            {canWrite && (
              <Button
                title="Create Shift"
                onPress={() => setCreateOpen(true)}
                accessibilityLabel="Create your first shift"
              />
            )}
          </View>
        }
      />

      <Modal visible={createOpen} onClose={closeCreate} title="Create Shift">
        <TextInputField
          label="Shift Name *"
          placeholder="e.g. Morning"
          value={form.name}
          onChangeText={(v) => updateForm('name', v)}
          error={formErrors.name}
        />
        <TextInputField
          label="Start Time *"
          placeholder="HH:MM (e.g. 08:00)"
          value={form.startTime}
          onChangeText={(v) => updateForm('startTime', v)}
          error={formErrors.startTime}
        />
        <TextInputField
          label="End Time *"
          placeholder="HH:MM (e.g. 16:00)"
          value={form.endTime}
          onChangeText={(v) => updateForm('endTime', v)}
          error={formErrors.endTime}
        />
        <View style={styles.modalActions}>
          <Button title="Cancel" variant="secondary" style={styles.modalActionButton} onPress={closeCreate} />
          <Button
            title="Create Shift"
            style={styles.modalActionButton}
            loading={creating}
            disabled={creating}
            onPress={submitCreate}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
