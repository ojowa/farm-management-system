import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Card, colors } from '../../components/common/UIComponents';
import { ScreenLoading, StateView } from '../../components/feedback';
import { equipmentAPI } from '../../services/api';
import { describeApiError } from '../../utils/apiError';
import { extractArray } from '../../utils/responseParser';

interface Equipment {
  id: string;
  name: string;
  type: string;
  status: string;
  purchaseDate?: string;
  lastMaintenance?: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#DCFCE7', text: '#166534' },
  maintenance: { bg: '#FEF9C3', text: '#854D0E' },
  retired: { bg: '#FEE2E2', text: '#991B1B' },
  available: { bg: '#DBEAFE', text: '#1E40AF' },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 20 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 },
  card: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: colors.textLight, marginBottom: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: colors.textLight },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  footerText: { fontSize: 12, color: colors.textLight },
});

const keyExtractor = (item: Equipment) => item.id;

export default function EquipmentScreen() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await equipmentAPI.list();
      setEquipment(extractArray<Equipment>(res));
    } catch (error: any) {
      setLoadError(describeApiError(error, 'Failed to load equipment.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
  }, [fetchData]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🚜</Text>
      <Text style={styles.emptyText}>No Equipment</Text>
      <Text style={styles.emptySubtext}>Add your first piece of equipment</Text>
    </View>
  );

  const renderItem = useCallback(({ item }: { item: Equipment }) => {
    const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.available;
    return (
      <Card style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>{item.type}</Text>
            {item.lastMaintenance && (
              <Text style={styles.cardSubtitle}>Last maintenance: {new Date(item.lastMaintenance).toLocaleDateString()}</Text>
            )}
          </View>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
        </View>
      </Card>
    );
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Equipment</Text>
        </View>
        <ScreenLoading message="Loading equipment..." />
      </SafeAreaView>
    );
  }

  if (loadError && equipment.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Equipment</Text>
        </View>
        <StateView
          variant="error"
          title="Couldn't load equipment"
          message={loadError}
          onRetry={fetchData}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Equipment</Text>
      </View>
      <FlatList
        data={equipment}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </SafeAreaView>
  );
}
