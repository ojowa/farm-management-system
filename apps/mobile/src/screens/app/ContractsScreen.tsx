import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Card, colors } from '../../components/common/UIComponents';
import { ScreenLoading, StateView } from '../../components/feedback';
import { contractsAPI } from '../../services/api';
import { describeApiError } from '../../utils/apiError';
import { extractArray } from '../../utils/responseParser';

interface Contract {
  id: string;
  title: string;
  counterparty: string;
  type: string;
  status: string;
  startDate?: string;
  endDate?: string;
  value?: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#DCFCE7', text: '#166534' },
  pending: { bg: '#FEF9C3', text: '#854D0E' },
  expired: { bg: '#F3F4F6', text: '#6B7280' },
  terminated: { bg: '#FEE2E2', text: '#991B1B' },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 20 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 },
  card: { marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginLeft: 8 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  cardDetail: { fontSize: 13, color: colors.textLight, marginBottom: 2 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: colors.textLight },
});

const keyExtractor = (item: Contract) => item.id;

export default function ContractsScreen() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await contractsAPI.list();
      setContracts(extractArray<Contract>(res));
    } catch (error: any) {
      setLoadError(describeApiError(error, 'Failed to load contracts.'));
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
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyText}>No Contracts</Text>
      <Text style={styles.emptySubtext}>Add your first contract</Text>
    </View>
  );

  const renderItem = useCallback(({ item }: { item: Contract }) => {
    const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
    return (
      <Card style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.cardDetail}>{item.counterparty} - {item.type}</Text>
        {item.startDate && (
          <Text style={styles.cardDetail}>
            {new Date(item.startDate).toLocaleDateString()} - {item.endDate ? new Date(item.endDate).toLocaleDateString() : 'Ongoing'}
          </Text>
        )}
        {item.value !== undefined && (
          <Text style={styles.cardDetail}>Value: ${item.value.toLocaleString()}</Text>
        )}
      </Card>
    );
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Contracts</Text>
        </View>
        <ScreenLoading message="Loading contracts..." />
      </SafeAreaView>
    );
  }

  if (loadError && contracts.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Contracts</Text>
        </View>
        <StateView
          variant="error"
          title="Couldn't load contracts"
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
        <Text style={styles.headerTitle}>Contracts</Text>
      </View>
      <FlatList
        data={contracts}
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
