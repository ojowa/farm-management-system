import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { rosterAPI, workersAPI, departmentsAPI } from '@/modules/hr';
import type { Shift, ShiftAssignment } from '@/modules/hr';
import { Card, Button, TextInputField, Modal, colors } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
import { MenuButton } from '@/core/ui/MenuButton';
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
  shiftNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  shiftName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  shiftTime: { fontSize: 13, color: colors.textLight },
  shiftDays: { fontSize: 12, color: colors.textLight, marginTop: 2 },
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
  assignmentActions: { flexDirection: 'row', gap: 8 },
  assignmentText: { fontSize: 13, color: colors.text },
  outlineButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 6,
    borderColor: colors.border,
  },
  outlineButtonText: { fontSize: 12, fontWeight: '600', color: colors.text },
  deleteButton: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.error, borderRadius: 6 },
  deleteButtonText: { color: colors.error, fontSize: 12, fontWeight: '600' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalActionButton: { flex: 1 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: 4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.text },
  chipTextActive: { color: '#FFFFFF' },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: 8,
  },
  colorSwatchActive: { borderColor: colors.text },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.light,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  assigneeName: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  assigneeDate: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  emptyNote: { fontSize: 13, color: colors.textLight, fontStyle: 'italic', marginBottom: 8 },
});

const TIME_RE = /^\d{2}:\d{2}$/;

/** Admin parity: shift day tokens are MON…SUN (3 chars max). */
const DAY_TOKENS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
const DAY_LABELS: Record<string, string> = {
  MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun',
};

/** Admin parity colour swatches. */
const SHIFT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

function unwrapList<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

/** "Mon, Tue" — or "Every day" when daysOfWeek is empty/absent (all week). */
function describeDays(days?: string[] | null): string {
  if (!days || days.length === 0 || days.length === 7) return 'Every day';
  return days.map((d) => DAY_LABELS[d] ?? d).join(', ');
}

interface ShiftForm {
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: string[];
  color: string;
  /** Owning Department row id ('' = none). */
  departmentId: string;
}

const EMPTY_FORM: ShiftForm = {
  name: '',
  startTime: '',
  endTime: '',
  daysOfWeek: [],
  color: SHIFT_COLORS[0],
  departmentId: '',
};

export default function RosterScreen() {
  const { success, error: showError } = useToasts();
  const { hasPermission } = usePermission();
  const { colors: tc, isDark } = useAppTheme();

  const dynamicStyles = {
    container: {
      backgroundColor: tc.background,
    },
    emptyText: {
      color: tc.text,
    },
    emptySubtext: {
      color: tc.textSecondary,
    },
    cardBackground: {
      backgroundColor: tc.card,
      borderColor: isDark ? tc.border : 'transparent',
      borderWidth: isDark ? 1 : 0,
    },
    shiftName: {
      color: tc.text,
    },
    shiftTime: {
      color: tc.textSecondary,
    },
    shiftDays: {
      color: tc.textSecondary,
    },
    divider: {
      borderTopColor: isDark ? tc.border : colors.light,
    },
    assignmentText: {
      color: tc.text,
    },
    outlineButton: {
      borderColor: tc.border,
    },
    outlineButtonText: {
      color: tc.text,
    },
    label: {
      color: tc.text,
    },
    chip: {
      backgroundColor: tc.card,
      borderColor: tc.border,
    },
    chipText: {
      color: tc.text,
    },
    colorSwatchActive: {
      borderColor: tc.text,
    },
    insetRow: {
      backgroundColor: isDark ? tc.surface : '#F5F5F5',
    },
    assigneeName: {
      color: tc.text,
    },
    assigneeDate: {
      color: tc.textSecondary,
    },
    emptyNote: {
      color: tc.textSecondary,
    },
  };

  // Server: GET /shifts is hr.read|worker.self, POST/PUT hr.write, DELETE
  // hr.delete; assignments create is hr.write and delete is hr.delete.
  const canWrite = hasPermission('hr.write');
  const canDelete = hasPermission('hr.delete');

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ShiftForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<{ name?: string; startTime?: string; endTime?: string }>({});

  // Per-shift assignment manager.
  const [manageShift, setManageShift] = useState<Shift | null>(null);
  const [availableWorkers, setAvailableWorkers] = useState<any[] | null>(null);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Department chips: source for the filter row and the shift form.
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  // loadAll runs from retries and after writes, so the active filter is read
  // through a ref instead of being captured by those callbacks.
  const departmentFilterRef = useRef('all');

  useEffect(() => {
    // Guarded: the hr barrel is mocked without departmentsAPI in tests.
    const list = (departmentsAPI as any)?.list;
    if (typeof list !== 'function') return;
    list()
      .then((res: any) => {
        const payload = res?.data;
        const rows = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
          ? payload.data
          : [];
        setDepartments(
          rows
            .filter((d: any) => d?.id && d?.name)
            .map((d: any) => ({ id: d.id, name: d.name }))
        );
      })
      .catch(() => {
        if (__DEV__) console.warn('[Roster] Failed to load departments');
      });
  }, []);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoadError(null);
      const [shiftsRes, assignmentsRes] = await Promise.allSettled([
        // Server-side department filter — GET /shifts?departmentId=.
        rosterAPI.listShifts(
          departmentFilterRef.current !== 'all'
            ? { departmentId: departmentFilterRef.current }
            : undefined
        ),
        rosterAPI.listAssignments(),
      ]);
      if (shiftsRes.status === 'fulfilled') {
        setShifts(unwrapList<Shift>(shiftsRes.value.data));
      } else {
        throw shiftsRes.reason;
      }
      // The assignments feed failing must not blank the shift list.
      if (assignmentsRes.status === 'fulfilled') {
        setAssignments(unwrapList<ShiftAssignment>(assignmentsRes.value.data));
      }
    } catch (error: any) {
      setLoadError(describeApiError(error, "Couldn't load the roster."));
    } finally {
      setLoading(false);
    }
  };

  const assignmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    assignments.forEach((a) => {
      const shiftId = (a as any)?.shiftId;
      if (shiftId) counts[shiftId] = (counts[shiftId] ?? 0) + 1;
    });
    return counts;
  }, [assignments]);

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

  const payloadFromForm = () => ({
    name: form.name.trim(),
    startTime: form.startTime.trim(),
    endTime: form.endTime.trim(),
    daysOfWeek: form.daysOfWeek,
    color: form.color,
    // Null, not undefined: clearing a department must reach the server, which
    // only writes a field it is actually given.
    departmentId: form.departmentId || null,
  });

  const submitForm = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingShift) {
        await rosterAPI.updateShift(editingShift.id, payloadFromForm());
        success('Shift updated successfully');
      } else {
        await rosterAPI.createShift(payloadFromForm());
        success('Shift created successfully');
      }
      closeForm();
      loadAll();
    } catch (error: any) {
      showError(
        describeApiError(
          error,
          editingShift ? 'Failed to update shift. Please try again.' : 'Failed to create shift. Please try again.'
        )
      );
    } finally {
      setSaving(false);
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

  const updateForm = (field: keyof ShiftForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const toggleDay = (token: string) => {
    setForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(token)
        ? prev.daysOfWeek.filter((d) => d !== token)
        : [...prev.daysOfWeek, token],
    }));
  };

  const openCreate = () => {
    setEditingShift(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setCreateOpen(true);
  };

  const openEdit = (shift: Shift) => {
    setEditingShift(shift);
    setForm({
      name: shift.name ?? '',
      startTime: shift.startTime ?? '',
      endTime: shift.endTime ?? '',
      daysOfWeek: (shift as any).daysOfWeek ?? (shift as any).days ?? [],
      color: (shift as any).color ?? SHIFT_COLORS[0],
      departmentId: (shift as any).departmentId ?? '',
    });
    setFormErrors({});
    setCreateOpen(true);
  };

  /** Server-side department filter — re-queries /shifts with departmentId. */
  const selectDepartment = (id: string) => {
    departmentFilterRef.current = id;
    setDepartmentFilter(id);
    loadAll();
  };

  const closeForm = () => {
    setCreateOpen(false);
    setEditingShift(null);
    setFormErrors({});
  };

  // ── Assignment manager ───────────────────────────────────────────────────────
  const openManage = (shift: Shift) => {
    setManageShift(shift);
    setAvailableWorkers(null);
  };

  /** Load the roster picker lazily — only when someone asks to add a worker.
   *  Uses the minimal names endpoint (hr.read/hr.write), not the worker
   *  directory, so a supervisor without worker.read can still staff a shift. */
  const loadWorkers = async () => {
    if (availableWorkers || workersLoading) return;
    setWorkersLoading(true);
    try {
      const res = await workersAPI.names({ limit: 500 });
      setAvailableWorkers(unwrapList<any>(res.data));
    } catch (error: any) {
      showError(describeApiError(error, "Couldn't load workers."));
      setAvailableWorkers([]);
    } finally {
      setWorkersLoading(false);
    }
  };

  const managedAssignments = useMemo(
    () => (manageShift ? assignments.filter((a: any) => a.shiftId === manageShift.id) : []),
    [assignments, manageShift]
  );

  const assignedUserIds = useMemo(
    () => new Set(managedAssignments.map((a: any) => a.userId).filter(Boolean)),
    [managedAssignments]
  );

  const handleAssign = async (worker: any) => {
    if (!manageShift) return;
    setAssigning(true);
    try {
      const workerName = (worker.name ?? `${worker.firstName ?? ''} ${worker.lastName ?? ''}`).trim();
      await rosterAPI.createAssignment({
        shiftId: manageShift.id,
        userId: worker.id,
        date: new Date().toISOString().split('T')[0],
        userName: workerName || undefined,
      });
      success(`${workerName || 'Worker'} assigned to ${manageShift.name}`);
      // Refresh just the assignments feed so the counts stay truthful.
      const res = await rosterAPI.listAssignments();
      setAssignments(unwrapList<ShiftAssignment>(res.data));
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to assign worker.'));
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = (assignment: any) => {
    Alert.alert('Remove Assignment', 'Remove this worker from the shift?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await rosterAPI.deleteAssignment(assignment.id);
            setAssignments((prev) => prev.filter((a: any) => a.id !== assignment.id));
          } catch (error: any) {
            showError(describeApiError(error, 'Failed to remove the assignment.'));
          }
        },
      },
    ]);
  };

  const renderItem = useCallback(
    ({ item }: { item: Shift }) => {
      const isActive = (item as any).isActive !== false;
      const days = (item as any).daysOfWeek ?? (item as any).days ?? [];
      const color = (item as any).color;
      const count = assignmentCounts[item.id] ?? 0;
      const departmentName = departments.find((d) => d.id === (item as any).departmentId)?.name;
      return (
        <Card style={[styles.shiftCard, dynamicStyles.cardBackground]}>
          <View style={styles.shiftRow}>
            <View style={styles.shiftInfo}>
              <View style={styles.shiftNameRow}>
                {color ? <View style={[styles.colorDot, { backgroundColor: color }]} /> : null}
                <Text style={[styles.shiftName, dynamicStyles.shiftName]}>{item.name}</Text>
              </View>
              <Text style={[styles.shiftTime, dynamicStyles.shiftTime]}>
                {item.startTime} – {item.endTime}
              </Text>
              <Text style={[styles.shiftDays, dynamicStyles.shiftDays]}>{describeDays(days)}</Text>
              {departmentName ? (
                <Text style={[styles.shiftDays, dynamicStyles.shiftDays]}>Department: {departmentName}</Text>
              ) : null}
            </View>
            <View style={isActive ? styles.activeBadge : styles.inactiveBadge}>
              <Text style={isActive ? styles.activeBadgeText : styles.inactiveBadgeText}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <View style={[styles.assignmentRow, dynamicStyles.divider]}>
            <Text style={[styles.assignmentText, dynamicStyles.assignmentText]}>
              {count} {count === 1 ? 'assignment' : 'assignments'}
            </Text>
            <View style={styles.assignmentActions}>
              {canWrite && (
                <TouchableOpacity
                  style={[styles.outlineButton, dynamicStyles.outlineButton]}
                  onPress={() => openManage(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Manage assignments for ${item.name}`}
                >
                  <Text style={[styles.outlineButtonText, dynamicStyles.outlineButtonText]}>Assign</Text>
                </TouchableOpacity>
              )}
              {canWrite && (
                <TouchableOpacity
                  style={[styles.outlineButton, dynamicStyles.outlineButton]}
                  onPress={() => openEdit(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${item.name}`}
                >
                  <Text style={[styles.outlineButtonText, dynamicStyles.outlineButtonText]}>Edit</Text>
                </TouchableOpacity>
              )}
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
          </View>
        </Card>
      );
    },
    [assignmentCounts, canWrite, canDelete, deleteShift, departments, dynamicStyles]
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <MenuButton />
          <Text style={styles.headerTitle}>Roster</Text>
        </View>
        <ScreenLoading message="Loading roster…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
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
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <MenuButton />
        <Text style={styles.headerTitle}>Roster</Text>
        {canWrite && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={openCreate}
            accessibilityRole="button"
            accessibilityLabel="Create new shift"
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Server-side department filter — GET /shifts?departmentId= */}
      {departments.length > 0 && (
        <View style={[styles.chipRow, { paddingHorizontal: 20, paddingTop: 16, marginBottom: 12 }]}>
          <TouchableOpacity
            onPress={() => selectDepartment('all')}
            style={[styles.chip, dynamicStyles.chip, departmentFilter === 'all' && styles.chipActive]}
            accessibilityRole="button"
            accessibilityLabel="All departments"
            accessibilityState={{ selected: departmentFilter === 'all' }}
          >
            <Text
              style={[
                styles.chipText,
                dynamicStyles.chipText,
                departmentFilter === 'all' && styles.chipTextActive,
              ]}
            >
              All depts
            </Text>
          </TouchableOpacity>
          {departments.map((dept) => {
            const active = departmentFilter === dept.id;
            return (
              <TouchableOpacity
                key={dept.id}
                onPress={() => selectDepartment(active ? 'all' : dept.id)}
                style={[styles.chip, dynamicStyles.chip, active && styles.chipActive]}
                accessibilityRole="button"
                accessibilityLabel={`Filter by department ${dept.name}`}
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, dynamicStyles.chipText, active && styles.chipTextActive]}>
                  {dept.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <FlatList
        data={shifts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No Shifts Yet</Text>
            <Text style={[styles.emptySubtext, dynamicStyles.emptySubtext]}>
              Create shifts like “Morning” or “Evening” to build your farm's work roster
            </Text>
            {canWrite && (
              <Button
                title="Create Shift"
                onPress={openCreate}
                accessibilityLabel="Create your first shift"
              />
            )}
          </View>
        }
      />

      {/* Create / Edit shift */}
      <Modal
        visible={createOpen}
        onClose={closeForm}
        title={editingShift ? 'Edit Shift' : 'Create Shift'}
      >
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
        {departments.length > 0 && (
          <>
            <Text style={[styles.label, dynamicStyles.label]}>Department</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                onPress={() => updateForm('departmentId', '')}
                style={[styles.chip, dynamicStyles.chip, !form.departmentId && styles.chipActive]}
                accessibilityRole="button"
                accessibilityLabel="No department"
                accessibilityState={{ selected: !form.departmentId }}
              >
                <Text
                  style={[
                    styles.chipText,
                    dynamicStyles.chipText,
                    !form.departmentId && styles.chipTextActive,
                  ]}
                >
                  None
                </Text>
              </TouchableOpacity>
              {departments.map((dept) => {
                const active = form.departmentId === dept.id;
                return (
                  <TouchableOpacity
                    key={dept.id}
                    onPress={() => updateForm('departmentId', dept.id)}
                    style={[styles.chip, dynamicStyles.chip, active && styles.chipActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Department ${dept.name}`}
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, dynamicStyles.chipText, active && styles.chipTextActive]}>
                      {dept.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
        <Text style={[styles.label, dynamicStyles.label]}>Repeating days (none = every day)</Text>
        <View style={styles.chipRow}>
          {DAY_TOKENS.map((token) => {
            const active = form.daysOfWeek.includes(token);
            return (
              <TouchableOpacity
                key={token}
                onPress={() => toggleDay(token)}
                style={[styles.chip, dynamicStyles.chip, active && styles.chipActive]}
                accessibilityRole="button"
                accessibilityLabel={`Day ${token}`}
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, dynamicStyles.chipText, active && styles.chipTextActive]}>
                  {DAY_LABELS[token]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.label, dynamicStyles.label]}>Colour</Text>
        <View style={styles.chipRow}>
          {SHIFT_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => updateForm('color', c)}
              style={[styles.colorSwatch, { backgroundColor: c }, form.color === c && styles.colorSwatchActive, form.color === c && dynamicStyles.colorSwatchActive]}
              accessibilityRole="button"
              accessibilityLabel={`Colour ${c}`}
              accessibilityState={{ selected: form.color === c }}
            />
          ))}
        </View>
        <View style={styles.modalActions}>
          <Button title="Cancel" variant="secondary" style={styles.modalActionButton} onPress={closeForm} />
          <Button
            title={editingShift ? 'Save Changes' : 'Create Shift'}
            style={styles.modalActionButton}
            loading={saving}
            disabled={saving}
            onPress={submitForm}
          />
        </View>
      </Modal>

      {/* Assignment manager */}
      <Modal
        visible={!!manageShift}
        onClose={() => setManageShift(null)}
        title={manageShift ? `Assignments — ${manageShift.name}` : 'Assignments'}
      >
        <ScrollView style={{ maxHeight: 360 }}>
          {managedAssignments.length === 0 ? (
            <Text style={[styles.emptyNote, dynamicStyles.emptyNote]}>No workers assigned to this shift yet.</Text>
          ) : (
            managedAssignments.map((a: any) => (
              <View key={a.id} style={[styles.assigneeRow, dynamicStyles.insetRow]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.assigneeName, dynamicStyles.assigneeName]}>{a.userName || a.userId || 'Worker'}</Text>
                  <Text style={[styles.assigneeDate, dynamicStyles.assigneeDate]}>{a.date ? String(a.date).slice(0, 10) : ''}</Text>
                </View>
                {canDelete && (
                  <TouchableOpacity
                    onPress={() => handleUnassign(a)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${a.userName || a.userId} from shift`}
                  >
                    <Text style={styles.deleteButtonText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}

          {canWrite && (
            <View style={{ marginTop: 8 }}>
              {availableWorkers === null ? (
                <Button
                  title={workersLoading ? 'Loading workers…' : 'Add Worker'}
                  variant="secondary"
                  loading={workersLoading}
                  disabled={workersLoading}
                  onPress={loadWorkers}
                  accessibilityLabel="Add worker to shift"
                />
              ) : (
                <>
                  <Text style={[styles.label, dynamicStyles.label]}>Pick a worker</Text>
                  {availableWorkers.length === 0 ? (
                    <Text style={[styles.emptyNote, dynamicStyles.emptyNote]}>No workers available.</Text>
                  ) : (
                    <View style={styles.chipRow}>
                      {availableWorkers.map((w) => {
                        const already = assignedUserIds.has(w.id);
                        const name = (w.name ?? `${w.firstName ?? ''} ${w.lastName ?? ''}`).trim() || w.email || 'Worker';
                        return (
                          <TouchableOpacity
                            key={w.id}
                            disabled={already || assigning}
                            onPress={() => handleAssign(w)}
                            style={[styles.chip, dynamicStyles.chip, already && { opacity: 0.4 }]}
                            accessibilityRole="button"
                            accessibilityLabel={`Assign ${name}`}
                          >
                            <Text style={[styles.chipText, dynamicStyles.chipText]}>{already ? `✓ ${name}` : name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </ScrollView>
        <View style={styles.modalActions}>
          <Button
            title="Close"
            variant="secondary"
            style={styles.modalActionButton}
            onPress={() => setManageShift(null)}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
