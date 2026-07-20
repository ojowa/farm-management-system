import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Card, colors } from '../../components/common/UIComponents';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  content: { paddingHorizontal: 16, paddingVertical: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#FFFFFF' },
  metaText: { fontSize: 12, color: colors.textLight, marginTop: 4 },
  emptyText: { fontSize: 14, color: colors.textLight, textAlign: 'center' },
});

export default function IrrigationScreen() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [sRes, lRes] = await Promise.all([
        fetch('/api/irrigation-schedules').then((r) => r.json()).catch(() => []),
        fetch('/api/irrigation-logs?limit=10').then((r) => r.json()).catch(() => []),
      ]);
      setSchedules(Array.isArray(sRes) ? sRes : sRes?.data || []);
      setLogs(Array.isArray(lRes) ? lRes : lRes?.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Irrigation</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Irrigation</Text>
        <Text style={styles.headerSubtitle}>Manage schedules and view logs</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.sectionTitle}>Active Schedules</Text>
        {schedules.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No irrigation schedules configured.</Text>
          </Card>
        ) : (
          schedules.map((s: any) => (
            <Card key={s.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{s.name}</Text>
                  <Text style={styles.metaText}>{s.field} — {s.frequency} at {s.startTime}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: s.active ? '#10B981' : '#9CA3AF' }]}>
                  <Text style={styles.badgeText}>{s.active ? 'Active' : 'Inactive'}</Text>
                </View>
              </View>
            </Card>
          ))
        )}

        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Recent Logs</Text>
        {logs.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No irrigation logs yet.</Text>
          </Card>
        ) : (
          logs.map((l: any) => (
            <Card key={l.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{l.scheduleName}</Text>
                  <Text style={styles.metaText}>Start: {new Date(l.startTime).toLocaleString()}</Text>
                  {l.endTime && <Text style={styles.metaText}>End: {new Date(l.endTime).toLocaleString()}</Text>}
                  {l.waterUsed && <Text style={styles.metaText}>Water: {l.waterUsed} L</Text>}
                </View>
                <View style={[styles.badge, { backgroundColor: l.status === 'COMPLETED' ? '#10B981' : l.status === 'FAILED' ? '#EF4444' : '#3B82F6' }]}>
                  <Text style={styles.badgeText}>{l.status}</Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
