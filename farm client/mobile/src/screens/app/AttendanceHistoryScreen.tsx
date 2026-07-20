import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card, colors } from '../../components/common/UIComponents';
import { attendanceAPI } from '../../services/api';

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
  content: { paddingHorizontal: 16, paddingVertical: 12 },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthNavBtnText: { fontSize: 16, fontWeight: '700', color: colors.text },
  monthText: { fontSize: 16, fontWeight: '700', color: colors.text },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryCount: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  summaryLabel: { fontSize: 10, fontWeight: '600', color: colors.textLight, textTransform: 'uppercase' },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: colors.textLight, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  recordCard: { marginBottom: 8 },
  recordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recordDate: { fontSize: 14, fontWeight: '600', color: colors.text },
  recordTime: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  recordStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  recordStatusText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  recordHours: { fontSize: 12, fontWeight: '600', color: colors.text, marginTop: 4 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: colors.textLight, textAlign: 'center' },
});

const STATUS_COLORS: Record<string, string> = {
  PRESENT: '#10B981',
  ABSENT: '#EF4444',
  LATE: '#F59E0B',
  HALF_DAY: '#8B5CF6',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function AttendanceHistoryScreen() {
  const { workerId, workerName } = useLocalSearchParams<{ workerId: string; workerName: string }>();
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const loadData = useCallback(async () => {
    if (!workerId) return;
    try {
      const [summaryRes, listRes] = await Promise.all([
        attendanceAPI.getSummary({ workerId, month, year }),
        attendanceAPI.list({ workerId, month, year }),
      ]);
      setSummary(summaryRes.data);
      setRecords(Array.isArray(listRes.data) ? listRes.data : listRes.data?.data || []);
    } catch {
      Alert.alert('Error', 'Failed to load attendance history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workerId, month, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {workerName ? `${workerName}` : 'Attendance History'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={prevMonth} style={styles.monthNavBtn}>
            <Text style={styles.monthNavBtnText}>{"<"}</Text>
          </TouchableOpacity>
          <Text style={styles.monthText}>{MONTH_NAMES[month - 1]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.monthNavBtn}>
            <Text style={styles.monthNavBtnText}>{">"}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryCount, { color: '#10B981' }]}>{summary?.present ?? 0}</Text>
                <Text style={styles.summaryLabel}>Present</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryCount, { color: '#EF4444' }]}>{summary?.absent ?? 0}</Text>
                <Text style={styles.summaryLabel}>Absent</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryCount, { color: '#F59E0B' }]}>{summary?.late ?? 0}</Text>
                <Text style={styles.summaryLabel}>Late</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryCount, { color: '#3B82F6' }]}>{summary?.hoursWorked ?? 0}</Text>
                <Text style={styles.summaryLabel}>Hours</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Records</Text>

            {records.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>No records</Text>
                <Text style={styles.emptySubtext}>No attendance records for this month</Text>
              </View>
            ) : (
              records.map((record) => (
                <Card key={record.id} style={styles.recordCard}>
                  <View style={styles.recordRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recordDate}>
                        {new Date(record.date || record.createdAt).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                      {record.clockIn && (
                        <Text style={styles.recordTime}>
                          In: {new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {record.clockOut
                            ? `  ·  Out: ${new Date(record.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : ''}
                        </Text>
                      )}
                      {record.hoursWorked != null && (
                        <Text style={styles.recordHours}>{record.hoursWorked}h worked</Text>
                      )}
                    </View>
                    <View style={[styles.recordStatus, { backgroundColor: STATUS_COLORS[record.status] || '#9CA3AF' }]}>
                      <Text style={styles.recordStatusText}>{record.status}</Text>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
