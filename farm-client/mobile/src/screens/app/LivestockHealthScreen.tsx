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
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: colors.textLight, textAlign: 'center' },
});

const VACCINATION_COLORS: Record<string, string> = {
  overdue: '#EF4444',
  due_soon: '#F59E0B',
  completed: '#10B981',
};

export default function LivestockHealthScreen() {
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [healthRecords, setHealthRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [vacRes, healthRes] = await Promise.all([
        fetch('/api/vaccinations?status=overdue').then((r) => r.json()).catch(() => []),
        fetch('/api/health-records?limit=10').then((r) => r.json()).catch(() => []),
      ]);
      setVaccinations(Array.isArray(vacRes) ? vacRes : vacRes?.data || []);
      setHealthRecords(Array.isArray(healthRes) ? healthRes : healthRes?.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Livestock Health</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Livestock Health</Text>
        <Text style={styles.headerSubtitle}>Monitor animal health and vaccinations</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.sectionTitle}>Overdue Vaccinations</Text>
        {vaccinations.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No overdue vaccinations.</Text>
          </Card>
        ) : (
          vaccinations.map((v: any) => (
            <Card key={v.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{v.animalName}</Text>
                  <Text style={styles.metaText}>{v.vaccine}</Text>
                  <Text style={styles.metaText}>Due: {new Date(v.dueDate).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: VACCINATION_COLORS.overdue }]}>
                  <Text style={styles.badgeText}>Overdue</Text>
                </View>
              </View>
            </Card>
          ))
        )}

        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Recent Health Records</Text>
        {healthRecords.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No health records yet.</Text>
          </Card>
        ) : (
          healthRecords.map((r: any) => (
            <Card key={r.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{r.animalName}</Text>
                  <Text style={styles.metaText}>{r.type} — {new Date(r.date).toLocaleDateString()}</Text>
                  {r.veterinarian && <Text style={styles.metaText}>Vet: {r.veterinarian}</Text>}
                </View>
                <View style={[styles.badge, { backgroundColor: colors.info }]}>
                  <Text style={styles.badgeText}>{r.type}</Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
