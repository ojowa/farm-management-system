import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { attendanceAPI, workersAPI } from '@/modules/hr';
import { Button, Card, colors } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
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
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', flex: 1, textAlign: 'center' },
  backButton: { padding: 8 },
  backButtonText: { color: '#FFFFFF', fontSize: 16 },
  headerAction: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  headerActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  content: { paddingHorizontal: 16, paddingVertical: 12 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statCard: { flexGrow: 1, minWidth: '30%', padding: 12, marginBottom: 0 },
  statLabel: { fontSize: 11, color: colors.textLight, marginBottom: 2 },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  controlsRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  dateInput: {
    flex: 1,
    minWidth: 130,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
  },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
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
  rowCard: { marginBottom: 10, padding: 12 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  workerName: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#FFFFFF' },
  rowMeta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  rowMetaText: { fontSize: 12, color: colors.textLight },
  rowActions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 8,
  },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  monthNavBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthNavBtnText: { fontSize: 14, color: colors.text, fontWeight: '600' },
  monthLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
});

const STATUS_BADGES: Record<string, { color: string; label: string }> = {
  PRESENT: { color: '#10B981', label: 'Present' },
  ABSENT: { color: '#EF4444', label: 'Absent' },
  LATE: { color: '#F59E0B', label: 'Late' },
  HALF_DAY: { color: '#6366F1', label: 'Half Day' },
  ON_LEAVE: { color: '#6B7280', label: 'On Leave' },
};

const STATUS_FILTERS = ['', 'PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE'];

const formatDateParam = (d: Date) => d.toISOString().split('T')[0];

function formatClock(value?: string | null) {
  if (!value) return '—';
  // The API serialises clock times as "HH:MM"; tolerate a full timestamp too.
  if (/^\d{2}:\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toTimeString().slice(0, 5);
}

function unwrapList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

interface DailyRow {
  workerId: string;
  workerName: string;
  recordId?: string;
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: number | null;
  status: string | null;
  notes: string | null;
  hasRecord: boolean;
}

export default function AttendanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ workerId?: string }>();
  const workerId = typeof params.workerId === 'string' ? params.workerId : undefined;
  const { success, error: showError } = useToasts();
  const { hasPermission, hasAnyPermission, canCreate } = usePermission();
  const { colors: tc, isDark } = useAppTheme();

  const dynamicStyles = {
    container: {
      backgroundColor: tc.background,
    },
    cardBackground: {
      backgroundColor: tc.card,
      borderColor: isDark ? tc.border : 'transparent',
      borderWidth: isDark ? 1 : 0,
    },
    statLabel: {
      color: tc.textSecondary,
    },
    statValue: {
      color: tc.text,
    },
    dateInput: {
      backgroundColor: tc.inputBg,
      borderColor: tc.inputBorder,
      color: tc.inputText,
    },
    chip: {
      backgroundColor: tc.card,
      borderColor: tc.border,
    },
    chipText: {
      color: tc.text,
    },
    workerName: {
      color: tc.text,
    },
    rowMetaText: {
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
    label: {
      color: tc.text,
    },
    input: {
      backgroundColor: tc.inputBg,
      borderColor: tc.inputBorder,
      color: tc.inputText,
    },
    sectionTitle: {
      color: tc.textSecondary,
    },
    monthNavBtn: {
      backgroundColor: tc.card,
      borderColor: tc.border,
    },
    monthNavBtnText: {
      color: tc.text,
    },
    monthLabel: {
      color: tc.text,
    },
  };

  // The worker directory (GET /workers) is worker.read — gate the roster
  // merge on it (records still carry names for everyone the API serves).
  const canReadWorkers = hasPermission('worker.read');
  // Manual record creation (POST /attendance) is hr.write only…
  const canWrite = canCreate('hr');
  // …but clock-in/out accept Any(hr.write, worker.self): the service pins a
  // worker.self caller to their own profile, so workers get the buttons too.
  const canClock = hasAnyPermission('hr.write', 'worker.self');

  const today = useMemo(() => formatDateParam(new Date()), []);
  const [dateInput, setDateInput] = useState(today);
  // Requests only run against a well-formed applied date — typing character by
  // character must not fire a partial "2026-1" request the API would 400 on.
  const [appliedDate, setAppliedDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [todaySummary, setTodaySummary] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);

  // Per-worker history mode (?workerId=…) — month navigation + monthly summary.
  const [historyWorker, setHistoryWorker] = useState<any>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [monthSummary, setMonthSummary] = useState<any>(null);

  // Dialogs: clock in a worker, record a new row, correct an existing row.
  const [clockInOpen, setClockInOpen] = useState(false);
  const [clockInWorkerId, setClockInWorkerId] = useState('');
  const [saving, setSaving] = useState(false);

  const [recordOpen, setRecordOpen] = useState(false);
  const [recordForm, setRecordForm] = useState({
    workerId: '',
    date: today,
    status: 'PRESENT',
    clockIn: '',
    clockOut: '',
    notes: '',
  });

  const [editRecord, setEditRecord] = useState<any>(null);
  const [editForm, setEditForm] = useState({ status: 'PRESENT', clockIn: '', clockOut: '', notes: '' });

  const loadDaily = useCallback(async () => {
    setLoadError(null);
    try {
      const [todayRes, listRes] = await Promise.all([
        attendanceAPI.getToday(),
        attendanceAPI.list({ date: appliedDate }),
      ]);
      setTodaySummary(todayRes.data?.summary ?? null);
      setRecords(unwrapList(listRes.data));
    } catch (err: any) {
      setLoadError(describeApiError(err, "Couldn't load attendance"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appliedDate]);

  const loadHistory = useCallback(async () => {
    setLoadError(null);
    try {
      const target = new Date();
      target.setDate(1);
      target.setMonth(target.getMonth() + monthOffset);
      const month = target.getMonth() + 1;
      const year = target.getFullYear();
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const [summaryRes, listRes] = await Promise.all([
        attendanceAPI.getSummary({ workerId, month, year }),
        attendanceAPI.list({ workerId, startDate, endDate }),
      ]);
      setMonthSummary(summaryRes.data?.summary ?? null);
      setRecords(unwrapList(listRes.data));
    } catch (err: any) {
      setLoadError(describeApiError(err, "Couldn't load attendance history"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workerId, monthOffset]);

  useEffect(() => {
    setLoading(true);
    if (workerId) {
      loadHistory();
      if (canReadWorkers) {
        workersAPI.get(workerId).then((res: any) => setHistoryWorker(res.data?.data ?? res.data ?? null)).catch(() => {});
      }
    } else {
      loadDaily();
      if (canReadWorkers) {
        workersAPI
          .list({ limit: 500 })
          .then((res: any) => setWorkers(unwrapList(res.data)))
          .catch(() => {
            if (__DEV__) console.warn('[Attendance] Failed to load workers');
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId, loadDaily, loadHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    workerId ? loadHistory() : loadDaily();
  };

  // ── Daily mode: merge the roster with the day's records ──────────────────────
  const dailyRows = useMemo<DailyRow[]>(() => {
    const recordMap = new Map<string, any>();
    records.forEach((r) => recordMap.set(r.workerId, r));

    const fromWorkers = workers.map((w) => {
      const record = recordMap.get(w.id);
      const fullName = `${w.firstName}${w.middleName ? ` ${w.middleName}` : ''} ${w.lastName}`;
      if (record) {
        return {
          workerId: w.id,
          workerName: record.workerName || fullName,
          recordId: record.id,
          clockIn: record.clockIn || null,
          clockOut: record.clockOut || null,
          hoursWorked: record.hoursWorked ?? null,
          status: record.status,
          notes: record.notes || null,
          hasRecord: true,
        };
      }
      // No row for this day is NOT the same as an absence — show it as such
      // and let an admin record the real status.
      return {
        workerId: w.id,
        workerName: fullName,
        clockIn: null,
        clockOut: null,
        hoursWorked: null,
        status: null,
        notes: null,
        hasRecord: false,
      };
    });

    // Self-service viewers have no roster read — fall back to their records.
    if (fromWorkers.length > 0) return fromWorkers;
    return records.map((r) => ({
      workerId: r.workerId,
      workerName: r.workerName || '—',
      recordId: r.id,
      clockIn: r.clockIn || null,
      clockOut: r.clockOut || null,
      hoursWorked: r.hoursWorked ?? null,
      status: r.status,
      notes: r.notes || null,
      hasRecord: true,
    }));
  }, [workers, records]);

  const filteredRows = useMemo(() => {
    if (!statusFilter) return dailyRows;
    return dailyRows.filter((r) => r.status === statusFilter);
  }, [dailyRows, statusFilter]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const refreshAll = () => (workerId ? loadHistory() : loadDaily());

  const handleClockIn = async () => {
    if (!clockInWorkerId) return;
    const worker = workers.find((w) => w.id === clockInWorkerId);
    if (!worker) return;
    const workerName = `${worker.firstName}${worker.middleName ? ` ${worker.middleName}` : ''} ${worker.lastName}`;
    setSaving(true);
    try {
      await attendanceAPI.clockIn({ workerId: clockInWorkerId, workerName });
      success(`${workerName} clocked in`);
      setClockInOpen(false);
      setClockInWorkerId('');
      refreshAll();
    } catch (err: any) {
      showError(describeApiError(err, 'Failed to clock in.'));
    } finally {
      setSaving(false);
    }
  };

  const handleClockOut = async (row: DailyRow) => {
    setSaving(true);
    try {
      await attendanceAPI.clockOut({ workerId: row.workerId });
      success(`${row.workerName} clocked out`);
      refreshAll();
    } catch (err: any) {
      showError(describeApiError(err, 'Failed to clock out.'));
    } finally {
      setSaving(false);
    }
  };

  const openRecordDialog = (id?: string) => {
    setRecordForm({
      workerId: id || '',
      date: appliedDate,
      status: 'PRESENT',
      clockIn: '',
      clockOut: '',
      notes: '',
    });
    setRecordOpen(true);
  };

  const handleRecordSubmit = async () => {
    if (!recordForm.workerId) {
      showError('Pick a worker first.');
      return;
    }
    const worker = workers.find((w) => w.id === recordForm.workerId);
    const workerName = worker
      ? `${worker.firstName}${worker.middleName ? ` ${worker.middleName}` : ''} ${worker.lastName}`
      : '';
    setSaving(true);
    try {
      await attendanceAPI.create({
        workerId: recordForm.workerId,
        workerName,
        date: recordForm.date,
        status: recordForm.status,
        clockIn: recordForm.clockIn || undefined,
        clockOut: recordForm.clockOut || undefined,
        notes: recordForm.notes || undefined,
      });
      success('Attendance recorded');
      setRecordOpen(false);
      refreshAll();
    } catch (err: any) {
      showError(describeApiError(err, 'Failed to record attendance.'));
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (row: DailyRow) => {
    setEditRecord({
      id: row.recordId,
      workerName: row.workerName,
    });
    setEditForm({
      status: row.status || 'PRESENT',
      clockIn: row.clockIn ? formatClock(row.clockIn) : '',
      clockOut: row.clockOut ? formatClock(row.clockOut) : '',
      notes: row.notes || '',
    });
  };

  const handleEditSubmit = async () => {
    if (!editRecord) return;
    setSaving(true);
    try {
      await attendanceAPI.update(editRecord.id, {
        status: editForm.status,
        clockIn: editForm.clockIn || null,
        clockOut: editForm.clockOut || null,
        notes: editForm.notes || null,
      });
      success('Attendance updated');
      setEditRecord(null);
      refreshAll();
    } catch (err: any) {
      showError(describeApiError(err, 'Failed to update attendance.'));
    } finally {
      setSaving(false);
    }
  };

  const title = workerId
    ? historyWorker
      ? `${historyWorker.firstName} ${historyWorker.lastName}`
      : 'My Attendance'
    : 'Attendance';

  const summary = workerId ? monthSummary : todaySummary;

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      {canWrite && !workerId ? (
        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => openRecordDialog()}
          accessibilityLabel="Record attendance"
        >
          <Text style={styles.headerActionText}>Record</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 60 }} />
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        {renderHeader()}
        <ScreenLoading message="Loading…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        {renderHeader()}
        <StateView
          variant="error"
          title="Couldn't load attendance"
          message={loadError}
          onRetry={() => { setLoading(true); refreshAll(); }}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      {renderHeader()}

      <FlatList
        data={workerId ? records : filteredRows}
        keyExtractor={(item: any, index) => item?.id || `${item?.workerId || 'row'}-${item?.date || index}`}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            {/* Summary */}
            {summary ? (
              <View style={styles.summaryRow}>
                <Card style={[styles.statCard, dynamicStyles.cardBackground]}>
                  <Text style={[styles.statLabel, dynamicStyles.statLabel]}>{workerId ? 'Days' : 'Present'}</Text>
                  <Text style={[styles.statValue, { color: '#16A34A' }]}>
                    {workerId ? (summary.totalDays ?? summary.total ?? 0) : (summary.present ?? 0)}
                  </Text>
                </Card>
                <Card style={[styles.statCard, dynamicStyles.cardBackground]}>
                  <Text style={[styles.statLabel, dynamicStyles.statLabel]}>{workerId ? 'Absent' : 'Absent'}</Text>
                  <Text style={[styles.statValue, { color: '#DC2626' }]}>{summary.absent ?? 0}</Text>
                </Card>
                <Card style={[styles.statCard, dynamicStyles.cardBackground]}>
                  <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Late</Text>
                  <Text style={[styles.statValue, { color: '#D97706' }]}>{summary.late ?? 0}</Text>
                </Card>
                {workerId && (
                  <>
                    <Card style={[styles.statCard, dynamicStyles.cardBackground]}>
                      <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Hours</Text>
                      <Text style={[styles.statValue, dynamicStyles.statValue]}>{(summary.totalHours ?? 0).toFixed(1)}h</Text>
                    </Card>
                    <Card style={[styles.statCard, dynamicStyles.cardBackground]}>
                      <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Rate</Text>
                      <Text style={[styles.statValue, { color: '#2563EB' }]}>{summary.attendanceRate ?? 0}%</Text>
                    </Card>
                  </>
                )}
                {!workerId && (
                  <>
                    <Card style={[styles.statCard, dynamicStyles.cardBackground]}>
                      <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Half Day</Text>
                      <Text style={[styles.statValue, dynamicStyles.statValue]}>{summary.halfDay ?? 0}</Text>
                    </Card>
                    <Card style={[styles.statCard, dynamicStyles.cardBackground]}>
                      <Text style={[styles.statLabel, dynamicStyles.statLabel]}>On Leave</Text>
                      <Text style={[styles.statValue, dynamicStyles.statValue]}>{summary.onLeave ?? 0}</Text>
                    </Card>
                  </>
                )}
              </View>
            ) : null}

            {/* Month navigation (history mode) */}
            {workerId && (
              <View style={styles.monthNav}>
                <TouchableOpacity
                  onPress={() => setMonthOffset((m) => m - 1)}
                  style={[styles.monthNavBtn, dynamicStyles.monthNavBtn]}
                  accessibilityLabel="Previous month"
                >
                  <Text style={[styles.monthNavBtnText, dynamicStyles.monthNavBtnText]}>‹ Prev</Text>
                </TouchableOpacity>
                <Text style={[styles.monthLabel, dynamicStyles.monthLabel]}>
                  {(() => {
                    const d = new Date();
                    d.setDate(1);
                    d.setMonth(d.getMonth() + monthOffset);
                    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
                  })()}
                </Text>
                <TouchableOpacity
                  onPress={() => setMonthOffset((m) => Math.min(0, m + 1))}
                  style={[styles.monthNavBtn, dynamicStyles.monthNavBtn]}
                  accessibilityLabel="Next month"
                >
                  <Text style={[styles.monthNavBtnText, dynamicStyles.monthNavBtnText]}>Next ›</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Date + status filters (daily mode) */}
            {!workerId && (
              <>
                <View style={styles.controlsRow}>
                  <TextInput
                    value={dateInput}
                    onChangeText={setDateInput}
                    onEndEditing={() => {
                      // Apply only a well-formed YYYY-MM-DD value.
                      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput) && !Number.isNaN(Date.parse(dateInput))) {
                        setAppliedDate(dateInput);
                      } else {
                        setDateInput(appliedDate);
                      }
                    }}
                    placeholder="YYYY-MM-DD"
                    style={[styles.dateInput, dynamicStyles.dateInput]}
                    placeholderTextColor={tc.placeholder}
                    keyboardType="numbers-and-punctuation"
                    returnKeyType="done"
                    accessibilityLabel="Attendance date"
                  />
                  <TouchableOpacity
                    onPress={() => { setDateInput(today); setAppliedDate(today); }}
                    style={[styles.chip, dynamicStyles.chip]}
                    accessibilityLabel="Jump to today"
                  >
                    <Text style={[styles.chipText, dynamicStyles.chipText]}>Today</Text>
                  </TouchableOpacity>
                  {canWrite && (
                    <TouchableOpacity
                      onPress={() => { setClockInWorkerId(''); setClockInOpen(true); }}
                      style={[styles.chip, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      accessibilityLabel="Clock in a worker"
                    >
                      <Text style={[styles.chipText, { color: '#FFFFFF' }]}>Clock In</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.chipRow}>
                  {STATUS_FILTERS.map((s) => (
                    <TouchableOpacity
                      key={s || 'all'}
                      onPress={() => setStatusFilter(s)}
                      style={[styles.chip, dynamicStyles.chip, statusFilter === s && styles.chipActive]}
                      accessibilityLabel={`Filter ${s ? s.replace('_', ' ').toLowerCase() : 'all statuses'}`}
                    >
                      <Text style={[styles.chipText, dynamicStyles.chipText, statusFilter === s && styles.chipTextActive]}>
                        {s ? s.replace('_', ' ') : 'All'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          <StateView
            variant="empty"
            title={workerId ? 'No attendance this month' : 'No attendance records'}
            message={
              statusFilter
                ? 'No rows match this status filter.'
                : 'Record attendance to see it here.'
            }
          />
        }
        renderItem={({ item: row }) => {
          // History mode rows are raw attendance records.
          if (workerId) {
            const badge = STATUS_BADGES[row.status];
            return (
              <Card style={[styles.rowCard, dynamicStyles.cardBackground]}>
                <View style={styles.rowTop}>
                  <Text style={[styles.workerName, dynamicStyles.workerName]}>
                    {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: badge?.color || '#9CA3AF' }]}>
                    <Text style={styles.badgeText}>{badge?.label || row.status}</Text>
                  </View>
                </View>
                <View style={styles.rowMeta}>
                  <Text style={[styles.rowMetaText, dynamicStyles.rowMetaText]}>In: {formatClock(row.clockIn)}</Text>
                  <Text style={[styles.rowMetaText, dynamicStyles.rowMetaText]}>Out: {formatClock(row.clockOut)}</Text>
                  {row.hoursWorked != null && (
                    <Text style={[styles.rowMetaText, dynamicStyles.rowMetaText]}>{Number(row.hoursWorked).toFixed(1)}h</Text>
                  )}
                </View>
                {row.notes ? <Text style={[styles.rowMetaText, dynamicStyles.rowMetaText, { marginTop: 6 }]}>{row.notes}</Text> : null}
              </Card>
            );
          }

          const badge = row.status ? STATUS_BADGES[row.status] : null;
          return (
            <Card style={[styles.rowCard, dynamicStyles.cardBackground]}>
              <View style={styles.rowTop}>
                <Text style={[styles.workerName, dynamicStyles.workerName]}>{row.workerName}</Text>
                <View style={[styles.badge, { backgroundColor: badge?.color || '#9CA3AF' }]}>
                  <Text style={styles.badgeText}>{badge ? badge.label : 'No record'}</Text>
                </View>
              </View>
              <View style={styles.rowMeta}>
                <Text style={[styles.rowMetaText, dynamicStyles.rowMetaText]}>In: {formatClock(row.clockIn)}</Text>
                <Text style={[styles.rowMetaText, dynamicStyles.rowMetaText]}>Out: {formatClock(row.clockOut)}</Text>
                {row.hoursWorked != null && (
                  <Text style={[styles.rowMetaText, dynamicStyles.rowMetaText]}>{Number(row.hoursWorked).toFixed(1)}h</Text>
                )}
              </View>
              {canClock && (
                <View style={styles.rowActions}>
                  {!row.clockIn && (
                    <TouchableOpacity
                      onPress={() => { setClockInWorkerId(row.workerId); setClockInOpen(true); }}
                      style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]}
                      accessibilityLabel={`Clock in ${row.workerName}`}
                    >
                      <Text style={[styles.actionBtnText, { color: '#059669' }]}>In</Text>
                    </TouchableOpacity>
                  )}
                  {row.clockIn && !row.clockOut && (
                    <TouchableOpacity
                      onPress={() => handleClockOut(row)}
                      style={[styles.actionBtn, { backgroundColor: '#DBEAFE' }]}
                      accessibilityLabel={`Clock out ${row.workerName}`}
                    >
                      <Text style={[styles.actionBtnText, { color: '#2563EB' }]}>Out</Text>
                    </TouchableOpacity>
                  )}
                  {row.recordId && (
                    <TouchableOpacity
                      onPress={() => openEditDialog(row)}
                      style={[styles.actionBtn, { backgroundColor: '#F3F4F6' }]}
                      accessibilityLabel={`Edit record for ${row.workerName}`}
                    >
                      <Text style={[styles.actionBtnText, { color: '#374151' }]}>Edit</Text>
                    </TouchableOpacity>
                  )}
                  {!row.hasRecord && (
                    <TouchableOpacity
                      onPress={() => openRecordDialog(row.workerId)}
                      style={[styles.actionBtn, { backgroundColor: '#FEF3C7' }]}
                      accessibilityLabel={`Record attendance for ${row.workerName}`}
                    >
                      <Text style={[styles.actionBtnText, { color: '#B45309' }]}>Record</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </Card>
          );
        }}
      />

      {/* Clock-in dialog */}
      <Modal visible={clockInOpen} animationType="slide" transparent>
        <View style={[styles.modalOverlay, dynamicStyles.modalOverlay]}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Clock In Worker</Text>
            <Text style={[styles.label, dynamicStyles.label]}>Worker</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {workers.length === 0 && <Text style={[styles.rowMetaText, dynamicStyles.rowMetaText]}>No workers found.</Text>}
              {workers.map((w) => {
                const name = `${w.firstName} ${w.lastName}`;
                return (
                  <TouchableOpacity
                    key={w.id}
                    onPress={() => setClockInWorkerId(w.id)}
                    style={[styles.chip, dynamicStyles.chip, clockInWorkerId === w.id && styles.chipActive, { marginRight: 8 }]}
                    accessibilityLabel={`Select ${name}`}
                  >
                    <Text style={[styles.chipText, dynamicStyles.chipText, clockInWorkerId === w.id && styles.chipTextActive]}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="secondary" onPress={() => setClockInOpen(false)} style={{ flex: 1 }} />
              <Button
                title={saving ? 'Clocking in…' : 'Clock In'}
                onPress={handleClockIn}
                disabled={saving || !clockInWorkerId}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Record attendance dialog */}
      <Modal visible={recordOpen} animationType="slide" transparent>
        <View style={[styles.modalOverlay, dynamicStyles.modalOverlay]}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Record Attendance</Text>
            <Text style={[styles.label, dynamicStyles.label]}>Worker</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {workers.map((w) => {
                const name = `${w.firstName} ${w.lastName}`;
                return (
                  <TouchableOpacity
                    key={w.id}
                    onPress={() => setRecordForm((f) => ({ ...f, workerId: w.id }))}
                    style={[styles.chip, dynamicStyles.chip, recordForm.workerId === w.id && styles.chipActive, { marginRight: 8 }]}
                    accessibilityLabel={`Select ${name}`}
                  >
                    <Text style={[styles.chipText, dynamicStyles.chipText, recordForm.workerId === w.id && styles.chipTextActive]}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={[styles.label, dynamicStyles.label]}>Date</Text>
            <TextInput
              value={recordForm.date}
              onChangeText={(v) => setRecordForm((f) => ({ ...f, date: v }))}
              placeholder="YYYY-MM-DD"
              style={[styles.input, dynamicStyles.input]}
              placeholderTextColor={tc.placeholder}
              accessibilityLabel="Record date"
            />
            <Text style={[styles.label, dynamicStyles.label]}>Status</Text>
            <View style={styles.chipRow}>
              {STATUS_FILTERS.filter(Boolean).map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setRecordForm((f) => ({ ...f, status: s }))}
                  style={[styles.chip, dynamicStyles.chip, recordForm.status === s && styles.chipActive]}
                  accessibilityLabel={`Status ${s.replace('_', ' ')}`}
                >
                  <Text style={[styles.chipText, dynamicStyles.chipText, recordForm.status === s && styles.chipTextActive]}>
                    {s.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, dynamicStyles.label]}>Clock In</Text>
                <TextInput
                  value={recordForm.clockIn}
                  onChangeText={(v) => setRecordForm((f) => ({ ...f, clockIn: v }))}
                  placeholder="HH:MM"
                  style={[styles.input, dynamicStyles.input]}
                  placeholderTextColor={tc.placeholder}
                  accessibilityLabel="Clock in time"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, dynamicStyles.label]}>Clock Out</Text>
                <TextInput
                  value={recordForm.clockOut}
                  onChangeText={(v) => setRecordForm((f) => ({ ...f, clockOut: v }))}
                  placeholder="HH:MM"
                  style={[styles.input, dynamicStyles.input]}
                  placeholderTextColor={tc.placeholder}
                  accessibilityLabel="Clock out time"
                />
              </View>
            </View>
            <Text style={[styles.label, dynamicStyles.label]}>Notes</Text>
            <TextInput
              value={recordForm.notes}
              onChangeText={(v) => setRecordForm((f) => ({ ...f, notes: v }))}
              placeholder="Optional note"
              style={[styles.input, dynamicStyles.input]}
              placeholderTextColor={tc.placeholder}
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="secondary" onPress={() => setRecordOpen(false)} style={{ flex: 1 }} />
              <Button
                title={saving ? 'Saving…' : 'Record'}
                onPress={handleRecordSubmit}
                disabled={saving || !recordForm.workerId}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit (correction) dialog */}
      <Modal visible={!!editRecord} animationType="slide" transparent>
        <View style={[styles.modalOverlay, dynamicStyles.modalOverlay]}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>
              Edit Attendance{editRecord ? ` — ${editRecord.workerName}` : ''}
            </Text>
            <Text style={[styles.label, dynamicStyles.label]}>Status</Text>
            <View style={styles.chipRow}>
              {STATUS_FILTERS.filter(Boolean).map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setEditForm((f) => ({ ...f, status: s }))}
                  style={[styles.chip, dynamicStyles.chip, editForm.status === s && styles.chipActive]}
                  accessibilityLabel={`Status ${s.replace('_', ' ')}`}
                >
                  <Text style={[styles.chipText, dynamicStyles.chipText, editForm.status === s && styles.chipTextActive]}>
                    {s.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, dynamicStyles.label]}>Clock In</Text>
                <TextInput
                  value={editForm.clockIn}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, clockIn: v }))}
                  placeholder="HH:MM"
                  style={[styles.input, dynamicStyles.input]}
                  placeholderTextColor={tc.placeholder}
                  accessibilityLabel="Edit clock in time"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, dynamicStyles.label]}>Clock Out</Text>
                <TextInput
                  value={editForm.clockOut}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, clockOut: v }))}
                  placeholder="HH:MM"
                  style={[styles.input, dynamicStyles.input]}
                  placeholderTextColor={tc.placeholder}
                  accessibilityLabel="Edit clock out time"
                />
              </View>
            </View>
            <Text style={[styles.label, dynamicStyles.label]}>Notes</Text>
            <TextInput
              value={editForm.notes}
              onChangeText={(v) => setEditForm((f) => ({ ...f, notes: v }))}
              placeholder="Optional note"
              style={[styles.input, dynamicStyles.input]}
              placeholderTextColor={tc.placeholder}
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="secondary" onPress={() => setEditRecord(null)} style={{ flex: 1 }} />
              <Button
                title={saving ? 'Saving…' : 'Save Changes'}
                onPress={handleEditSubmit}
                disabled={saving}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
