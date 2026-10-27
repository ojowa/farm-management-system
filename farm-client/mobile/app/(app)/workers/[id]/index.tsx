import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { workersAPI, departmentsAPI } from '@/modules/hr';
import type { Worker } from '@/modules/hr';
import { farmsAPI } from '@/modules/farm';
import { Button, colors } from '@/core/ui/UIComponents';
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
  content: { paddingHorizontal: 20, paddingVertical: 16 },
  card: { marginBottom: 16 },
  workerName: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.light,
    marginTop: 8,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 12, color: colors.textLight, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: colors.primary },
  detailSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.light },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  detailValue: { fontSize: 14, color: colors.text, flexShrink: 1, textAlign: 'right' },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  skillChip: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  skillChipText: { fontSize: 11, color: '#1D4ED8', fontWeight: '600' },
  actions: { marginTop: 20, gap: 12 },
});

const WORKER_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: '#DCFCE7', text: '#166534' },
  INACTIVE: { bg: '#F3F4F6', text: '#6B7280' },
  PROBATION: { bg: '#FEF3C7', text: '#92400E' },
  TERMINATED: { bg: '#FEE2E2', text: '#991B1B' },
};

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function unwrapOne<T>(payload: any): T | null {
  if (payload?.id) return payload as T;
  if (payload?.data?.id) return payload.data as T;
  return null;
}

const fullName = (w: Worker) => [w.firstName, w.middleName, w.lastName].filter(Boolean).join(' ');

export default function WorkerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const { hasPermission } = usePermission();
  const { colors: tc, isDark } = useAppTheme();

  // Same keys the server enforces on WorkerController (and the admin app
  // mirrors): worker.write to edit, worker.delete to remove.
  const canDelete = hasPermission('worker.delete');
  const canWrite = hasPermission('worker.write');

  const [loading, setLoading] = useState(true);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [farmName, setFarmName] = useState<string>('');
  const [departmentName, setDepartmentName] = useState<string>('');

  const dynamicStyles = {
    container: {
      backgroundColor: tc.background,
    },
    workerName: {
      color: tc.text,
    },
    statLabel: {
      color: tc.textSecondary,
    },
    divider: {
      borderTopColor: isDark ? tc.border : colors.light,
    },
    detailLabel: {
      color: tc.text,
    },
    detailValue: {
      color: tc.text,
    },
  };

  useEffect(() => {
    fetchWorker();
  }, [id]);

  // Rows written from the picker can carry departmentId without the
  // denormalised name — resolve it so the detail row is not a bare "—".
  useEffect(() => {
    const deptId = worker?.departmentId;
    setDepartmentName('');
    if (!deptId || worker?.department) return;
    // Guarded: the hr barrel is mocked without departmentsAPI in tests.
    const list = (departmentsAPI as any)?.list;
    if (typeof list !== 'function') return;
    list()
      .then((res: any) => {
        const body = res?.data;
        const rows = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
        const match = rows.find((d: any) => d?.id === deptId);
        if (match?.name) setDepartmentName(match.name);
      })
      .catch(() => {
        if (__DEV__) console.warn('[WorkerDetail] Failed to load departments');
      });
  }, [worker?.departmentId, worker?.department]);

  const fetchWorker = async () => {
    if (!id) {
      setLoadError('Missing worker id.');
      setLoading(false);
      return;
    }
    try {
      setLoadError(null);
      const response = await workersAPI.get(id);
      const record = unwrapOne<Worker>(response.data);
      if (!record) {
        setLoadError('Worker not found.');
        return;
      }
      setWorker(record);
      fetchFarmName(record.farmId);
    } catch (error: any) {
      setLoadError(describeApiError(error, 'Failed to load worker.'));
    } finally {
      setLoading(false);
    }
  };

  const fetchFarmName = async (farmId: string) => {
    if (!farmId) return;
    try {
      const response = await farmsAPI.get(farmId);
      const body: any = response.data;
      setFarmName(body?.name || body?.data?.name || '');
    } catch {
      /* ignore — falls back to "—" */
    }
  };

  const handleDelete = useCallback(() => {
    if (!worker) return;
    Alert.alert(
      'Delete Worker',
      `Are you sure you want to delete ${fullName(worker)}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await workersAPI.delete(worker.id);
              success('Worker deleted successfully');
              router.back();
            } catch (error: any) {
              showError(describeApiError(error, 'Failed to delete worker.'));
            }
          },
        },
      ]
    );
  }, [worker, success, showError, router]);

  // Rotate the linked login's password and resend the invitation email.
  const handleResendInvite = useCallback(() => {
    if (!worker) return;
    Alert.alert(
      'Resend Invitation',
      `Send a fresh invitation email to ${worker.email || fullName(worker)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              await workersAPI.reinvite(worker.id);
              success('Invitation sent');
            } catch (error: any) {
              showError(describeApiError(error, 'Failed to resend the invitation.'));
            }
          },
        },
      ]
    );
  }, [worker, success, showError]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Worker Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScreenLoading message="Loading worker…" />
      </SafeAreaView>
    );
  }

  if (loadError || !worker) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Worker Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load this worker"
          message={loadError || 'Worker not found.'}
          onRetry={fetchWorker}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  const statusColors = WORKER_STATUS_COLORS[worker.status] || { bg: '#F3F4F6', text: '#6B7280' };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Worker Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={[styles.workerName, dynamicStyles.workerName]}>{fullName(worker)}</Text>
          <View style={styles.badgeRow}>
            <View
              style={{
                backgroundColor: statusColors.bg,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 12,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: statusColors.text }}>
                {worker.status || '—'}
              </Text>
            </View>
          </View>

          <View style={[styles.statsContainer, dynamicStyles.divider]}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Position</Text>
              <Text style={[styles.statValue, { color: tc.primary }]}>{worker.position || '—'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Hired</Text>
              <Text style={[styles.statValue, { color: tc.primary }]}>{formatDate(worker.hireDate)}</Text>
            </View>
          </View>

          <View style={[styles.detailSection, dynamicStyles.divider]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>Department</Text>
              <Text style={[styles.detailValue, dynamicStyles.detailValue]}>
                {worker.department || departmentName || '—'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>Email</Text>
              <Text style={[styles.detailValue, dynamicStyles.detailValue]}>{worker.email || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>Phone</Text>
              <Text style={[styles.detailValue, dynamicStyles.detailValue]}>{worker.phone || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>Farm</Text>
              <Text style={[styles.detailValue, dynamicStyles.detailValue]}>{farmName || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>Hire Date</Text>
              <Text style={[styles.detailValue, dynamicStyles.detailValue]}>{formatDate(worker.hireDate)}</Text>
            </View>
          </View>

          {/* Employment / payroll */}
          <View style={[styles.detailSection, dynamicStyles.divider]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>Pay</Text>
              <Text style={[styles.detailValue, dynamicStyles.detailValue]}>
                {worker.payRate != null
                  ? `${worker.payRate}${worker.payType ? ` (${worker.payType})` : ''}`
                  : worker.payType || '—'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>Skills</Text>
              {worker.skills && worker.skills.length > 0 ? (
                <Text style={[styles.detailValue, dynamicStyles.detailValue]}>{worker.skills.length} listed</Text>
              ) : (
                <Text style={[styles.detailValue, dynamicStyles.detailValue]}>—</Text>
              )}
            </View>
            {worker.terminationDate && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>Termination Date</Text>
                <Text style={[styles.detailValue, { color: '#DC2626' }]}>{formatDate(worker.terminationDate)}</Text>
              </View>
            )}
            {worker.skills && worker.skills.length > 0 && (
              <View style={styles.skillsRow}>
                {worker.skills.map((skill) => (
                  <View key={skill} style={styles.skillChip}>
                    <Text style={styles.skillChipText}>{skill}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Emergency contact */}
          {(worker.emergencyContactName || worker.emergencyContactPhone || worker.emergencyContactRelation) && (
            <View style={[styles.detailSection, dynamicStyles.divider]}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>Emergency Contact</Text>
                <Text style={[styles.detailValue, dynamicStyles.detailValue]}>{worker.emergencyContactName || '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>Contact Phone</Text>
                <Text style={[styles.detailValue, dynamicStyles.detailValue]}>{worker.emergencyContactPhone || '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>Relationship</Text>
                <Text style={[styles.detailValue, dynamicStyles.detailValue]}>{worker.emergencyContactRelation || '—'}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Button
            title="View Attendance"
            variant="secondary"
            onPress={() => router.push(`/attendance?workerId=${id}`)}
            accessibilityLabel="View this worker's attendance history"
          />
          {canWrite && (
            <Button
              title="Edit Worker"
              onPress={() => router.push(`/workers/${id}/edit`)}
              accessibilityLabel="Edit this worker"
            />
          )}
          {canWrite && worker.email && (
            <Button
              title="Resend Invitation"
              variant="secondary"
              onPress={handleResendInvite}
              accessibilityLabel="Resend invitation email"
            />
          )}
          {canDelete && (
            <Button
              title="Delete Worker"
              variant="secondary"
              onPress={handleDelete}
              accessibilityLabel="Delete this worker"
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
