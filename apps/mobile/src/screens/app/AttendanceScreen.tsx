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
import { useRouter } from 'expo-router';
import { Card, Button, colors } from '../../components/common/UIComponents';
import { attendanceAPI, workersAPI } from '../../services/api';

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
  content: { paddingHorizontal: 16, paddingVertical: 12 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryCount: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  summaryLabel: { fontSize: 11, fontWeight: '600', color: colors.textLight, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12 },
  workerCard: { marginBottom: 10 },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workerInfo: { flex: 1 },
  workerName: { fontSize: 15, fontWeight: '600', color: colors.text },
  workerStatus: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  workerTime: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  clockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  clockBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: colors.textLight, textAlign: 'center' },
});

const ATTENDANCE_COLORS = {
  present: '#10B981',
  absent: '#EF4444',
  late: '#F59E0B',
};

export default function AttendanceScreen() {
  const router = useRouter();
  const [workers, setWorkers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clockingId, setClockingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [workersRes, attendanceRes] = await Promise.all([
        workersAPI.list(),
        attendanceAPI.getToday(),
      ]);
      setWorkers(workersRes.data || []);
      setAttendance(attendanceRes.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getWorkerAttendance = (workerId: string) =>
    attendance.find((a: any) => a.workerId === workerId);

  const presentCount = attendance.filter((a: any) => a.status === 'PRESENT').length;
  const absentCount = workers.length - attendance.length;
  const lateCount = attendance.filter((a: any) => a.status === 'LATE').length;

  const handleClockIn = (worker: any) => {
    const name = `${worker.firstName} ${worker.lastName}`;
    Alert.alert('Clock In', `Clock in ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clock In',
        onPress: async () => {
          setClockingId(worker.id);
          try {
            await attendanceAPI.clockIn({
              workerId: worker.id,
              workerName: name,
            });
            await loadData();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error || 'Failed to clock in');
          } finally {
            setClockingId(null);
          }
        },
      },
    ]);
  };

  const handleClockOut = (worker: any) => {
    const name = `${worker.firstName} ${worker.lastName}`;
    Alert.alert('Clock Out', `Clock out ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clock Out',
        onPress: async () => {
          setClockingId(worker.id);
          try {
            await attendanceAPI.clockOut({ workerId: worker.id });
            await loadData();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error || 'Failed to clock out');
          } finally {
            setClockingId(null);
          }
        },
      },
    ]);
  };

  const navigateToHistory = (worker: any) => {
    router.push({
      pathname: '/attendance/history',
      params: { workerId: worker.id, workerName: `${worker.firstName} ${worker.lastName}` },
    } as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryCount, { color: ATTENDANCE_COLORS.present }]}>{presentCount}</Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryCount, { color: ATTENDANCE_COLORS.absent }]}>{absentCount > 0 ? absentCount : 0}</Text>
            <Text style={styles.summaryLabel}>Absent</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryCount, { color: ATTENDANCE_COLORS.late }]}>{lateCount}</Text>
            <Text style={styles.summaryLabel}>Late</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Workers Today</Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : workers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No workers</Text>
            <Text style={styles.emptySubtext}>No workers found in the system.</Text>
          </View>
        ) : (
          workers.map((worker) => {
            const record = getWorkerAttendance(worker.id);
            const clockedIn = !!record;
            const clockedOut = !!record?.clockOut;
            const isClocking = clockingId === worker.id;

            return (
              <TouchableOpacity key={worker.id} onPress={() => navigateToHistory(worker)} activeOpacity={0.7}>
                <Card style={styles.workerCard}>
                  <View style={styles.workerRow}>
                    <View style={styles.workerInfo}>
                      <Text style={styles.workerName}>{worker.firstName} {worker.lastName}</Text>
                      {record ? (
                        <>
                          <Text style={styles.workerStatus}>
                            {record.status === 'LATE' ? '⏰ Late' : record.status === 'PRESENT' ? '✅ Present' : `📋 ${record.status}`}
                          </Text>
                          {record.clockIn && (
                            <Text style={styles.workerTime}>
                              In: {new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {record.clockOut
                                ? `  |  Out: ${new Date(record.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                : ''}
                            </Text>
                          )}
                        </>
                      ) : (
                        <Text style={styles.workerStatus}>❌ No record</Text>
                      )}
                    </View>

                    <View>
                      {!clockedIn && (
                        <TouchableOpacity
                          onPress={() => handleClockIn(worker)}
                          disabled={isClocking}
                          style={[styles.clockBtn, { backgroundColor: ATTENDANCE_COLORS.present }]}
                        >
                          <Text style={styles.clockBtnText}>{isClocking ? '...' : 'Clock In'}</Text>
                        </TouchableOpacity>
                      )}
                      {clockedIn && !clockedOut && (
                        <TouchableOpacity
                          onPress={() => handleClockOut(worker)}
                          disabled={isClocking}
                          style={[styles.clockBtn, { backgroundColor: ATTENDANCE_COLORS.absent }]}
                        >
                          <Text style={styles.clockBtnText}>{isClocking ? '...' : 'Clock Out'}</Text>
                        </TouchableOpacity>
                      )}
                      {clockedOut && (
                        <View style={[styles.clockBtn, { backgroundColor: '#D1D5DB' }]}>
                          <Text style={[styles.clockBtnText, { color: '#6B7280' }]}>Done</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
