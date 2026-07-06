import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Card, colors } from '../../components/common/UIComponents';
import { reportsAPI } from '../../services/api';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  headerSubtext: { fontSize: 14, color: '#FFFFFF', opacity: 0.8, marginTop: 4 },
  content: { paddingHorizontal: 16, paddingVertical: 12 },
  reportCard: { marginBottom: 12 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  reportName: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  reportLabel: { fontSize: 13, color: colors.textLight },
  reportValue: { fontSize: 13, fontWeight: '500', color: colors.text },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: colors.textLight, textAlign: 'center' },
  scheduleButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  scheduleButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});

const STATUS_COLORS: Record<string, string> = {
  active: '#4CAF50',
  paused: '#FF9800',
  completed: '#2196F3',
  failed: '#F44336',
  pending: '#9E9E9E',
};

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

export default function ScheduledReportsScreen() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const res = await reportsAPI.list();
      const list = res.data.reports || res.data || [];
      const scheduled = list.filter((r: any) =>
        r.frequency || r.status === 'active' || r.status === 'paused' || r.scheduled
      );
      setReports(scheduled.length > 0 ? scheduled : list);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const onRefresh = () => { setRefreshing(true); loadReports(); };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Scheduled Reports</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scheduled Reports</Text>
        <Text style={styles.headerSubtext}>Automated reports scheduled for generation</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {reports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No scheduled reports</Text>
            <Text style={styles.emptySubtext}>Schedule a report to receive automatic updates</Text>
          </View>
        ) : (
          reports.map((report) => (
            <Card key={report.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportName}>{report.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[report.status] || '#9E9E9E' }]}>
                  <Text style={styles.statusText}>{report.status}</Text>
                </View>
              </View>
              {report.type && (
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>Type</Text>
                  <Text style={styles.reportValue}>{report.type}</Text>
                </View>
              )}
              {report.frequency && (
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>Frequency</Text>
                  <Text style={styles.reportValue}>
                    {FREQUENCY_LABELS[report.frequency] || report.frequency}
                  </Text>
                </View>
              )}
              {report.nextRun && (
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>Next Run</Text>
                  <Text style={styles.reportValue}>
                    {new Date(report.nextRun).toLocaleDateString()}
                  </Text>
                </View>
              )}
              {report.lastRun && (
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>Last Run</Text>
                  <Text style={styles.reportValue}>
                    {new Date(report.lastRun).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </Card>
          ))
        )}

        <TouchableOpacity style={styles.scheduleButton} onPress={() => {}}>
          <Text style={styles.scheduleButtonText}>+ Schedule Report</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
