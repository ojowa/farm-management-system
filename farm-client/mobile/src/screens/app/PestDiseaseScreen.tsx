import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, colors } from '../../components/common/UIComponents';
import { apiClient } from '../../services/api';

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
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#FFFFFF' },
  metaText: { fontSize: 12, color: colors.textLight, marginTop: 4 },
  emptyText: { fontSize: 14, color: colors.textLight, textAlign: 'center' },
});

const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#10B981',
  MEDIUM: '#F59E0B',
  HIGH: '#F97316',
  CRITICAL: '#EF4444',
};

export default function PestDiseaseScreen() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.axiosInstance.get('/crops/pest-disease');
      setRecords(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pest & Disease</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pest & Disease</Text>
        <Text style={styles.headerSubtitle}>Track crop pest and disease incidents</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {records.length === 0 ? (
          <Card>
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={styles.emptyText}>No pest or disease records yet.</Text>
            </View>
          </Card>
        ) : (
          records.map((r: any) => (
            <Card key={r.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{r.name}</Text>
                  <Text style={styles.metaText}>{r.cropName} — {r.type}</Text>
                  {r.treatment && <Text style={styles.metaText}>Treatment: {r.treatment}</Text>}
                  <Text style={styles.metaText}>Detected: {r.dateDetected ? new Date(r.dateDetected).toLocaleDateString() : '—'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[styles.badge, { backgroundColor: SEVERITY_COLORS[r.severity] || '#9CA3AF' }]}>
                    <Text style={styles.badgeText}>{r.severity}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: r.status === 'RESOLVED' ? '#10B981' : '#3B82F6' }]}>
                    <Text style={styles.badgeText}>{r.status}</Text>
                  </View>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
