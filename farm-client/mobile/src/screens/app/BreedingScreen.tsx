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
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: colors.textLight, textAlign: 'center' },
});

const STATUS_COLORS: Record<string, string> = {
  PLANNED: '#3B82F6',
  IN_PROGRESS: '#F59E0B',
  COMPLETED: '#10B981',
  FAILED: '#EF4444',
  CANCELLED: '#9CA3AF',
};

export default function BreedingScreen() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.axiosInstance.get('/livestock/breeding');
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
          <Text style={styles.headerTitle}>Breeding Records</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Breeding Records</Text>
        <Text style={styles.headerSubtitle}>Track livestock breeding activities</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {records.length === 0 ? (
          <Card>
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No breeding records yet.</Text>
            </View>
          </Card>
        ) : (
          records.map((r: any) => (
            <Card key={r.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
                    {r.maleName || 'Unknown'} × {r.femaleName || 'Unknown'}
                  </Text>
                  <Text style={styles.metaText}>Breed: {r.breedDate ? new Date(r.breedDate).toLocaleDateString() : '—'}</Text>
                  {r.expectedDueDate && (
                    <Text style={styles.metaText}>Due: {new Date(r.expectedDueDate).toLocaleDateString()}</Text>
                  )}
                  {r.offspringCount != null && (
                    <Text style={styles.metaText}>Offspring: {r.offspringCount}</Text>
                  )}
                </View>
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS[r.status] || '#9CA3AF' }]}>
                  <Text style={styles.badgeText}>{r.status.replace('_', ' ')}</Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
