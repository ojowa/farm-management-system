import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { aquacultureAPI } from '@/modules/aquaculture';
import type { Pond } from '@/modules/aquaculture';
import { farmsAPI } from '@/modules/farm';
import { Card, Button, TextInputField, colors } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { useAppSelector } from '@/modules/auth/hooks/useAuth';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';

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
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  content: { paddingHorizontal: 20, paddingVertical: 16 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    minHeight: 300,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: colors.textLight, marginBottom: 20, textAlign: 'center' },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterButtonText: { fontSize: 12, color: colors.textLight },
  filterButtonTextActive: { color: '#FFFFFF' },
  pondCard: { marginBottom: 12, overflow: 'hidden' },
  pondCardContent: { paddingBottom: 0 },
  pondName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  pondFarm: { fontSize: 13, color: colors.textLight, marginBottom: 12 },
  pondStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  pondStat: { alignItems: 'center', flex: 1 },
  pondStatLabel: { fontSize: 11, color: colors.textLight, marginBottom: 4 },
  pondStatValue: { fontSize: 16, fontWeight: '700', color: colors.primary },
  pondActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonText: { color: colors.primary, fontSize: 12, textAlign: 'center' },
  deleteButtonText: { color: colors.error },
  deleteBorderColor: { borderColor: colors.error },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
});

// Local badge palette, mirroring the FARM_TYPE_COLORS pattern from farms.tsx
// (kept local to the aquaculture module rather than the shared farmTypes file).
const POND_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  FISH: { bg: '#CFFAFE', text: '#155E75' },
  SHRIMP: { bg: '#FFE4E6', text: '#9F1239' },
  CRAB: { bg: '#FFEDD5', text: '#9A3412' },
  MIXED: { bg: '#EDE9FE', text: '#5B21B6' },
};

const POND_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#DCFCE7', text: '#166534' },
  draining: { bg: '#DBEAFE', text: '#1E40AF' },
  maintenance: { bg: '#FEF3C7', text: '#92400E' },
  retired: { bg: '#F3F4F6', text: '#6B7280' },
};

type PondStatusFilter = 'all' | 'active' | 'draining' | 'maintenance' | 'retired';

const keyExtractor = (item: any) => item.id;

export default function AquacultureScreen() {
  const router = useRouter();
  const { success, error: showError } = useToasts();
  const user = useAppSelector((state) => state.auth.user);

  // Pond actions mirror the server's permission checks: everyone with
  // aquaculture.read sees the list; only aquaculture.write may add/edit,
  // aquaculture.delete may delete. Missing permissions default to hidden
  // (same pattern as farms.tsx) — the API would 403 regardless.
  const canWrite = user?.permissions?.includes('aquaculture.write') ?? false;
  const canDelete = user?.permissions?.includes('aquaculture.delete') ?? false;

  const [ponds, setPonds] = useState<Pond[]>([]);
  const [farmNames, setFarmNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PondStatusFilter>('all');

  useEffect(() => {
    fetchPonds();
    fetchFarms();
  }, []);

  const fetchPonds = async () => {
    try {
      setLoadError(null);
      const response = await aquacultureAPI.listPonds({ page: 1, limit: 100 });
      const data = response.data;
      setPonds(Array.isArray(data?.data) ? data.data : []);
    } catch (error: any) {
      setLoadError(describeApiError(error, 'Failed to load ponds.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFarms = async () => {
    try {
      const response = await farmsAPI.list();
      const farmsData = response.data;
      if (Array.isArray(farmsData)) {
        setFarmNames(
          farmsData.reduce((acc: Record<string, string>, f: any) => {
            acc[f.id] = f.name;
            return acc;
          }, {})
        );
      }
    } catch { /* ignore — cards fall back to the farm id */ }
  };

  const filteredPonds = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ponds.filter((pond) => {
      if (statusFilter !== 'all' && pond.status !== statusFilter) return false;
      if (query && !pond.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [ponds, statusFilter, search]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPonds();
  }, []);

  const handleDeletePond = useCallback((pondId: string, pondName: string) => {
    Alert.alert(
      'Delete Pond',
      `Are you sure you want to delete "${pondName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await aquacultureAPI.deletePond(pondId);
              success('Pond deleted successfully');
              fetchPonds();
            } catch (error: any) {
              showError(describeApiError(error, 'Failed to delete pond.'));
            }
          },
        },
      ]
    );
  }, [success, showError]);

  const renderFooter = useCallback(() => {
    if (!refreshing) return null;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={{ fontSize: 12, color: colors.textLight }}>Loading more…</Text>
      </View>
    );
  }, [refreshing]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🐟</Text>
      <Text style={styles.emptyText}>No Ponds Yet</Text>
      <Text style={styles.emptySubtext}>
        Create your first pond to start tracking stocking, feeding, water quality and harvests
      </Text>
      {canWrite && (
        <Button title="Add Pond" onPress={() => router.push('/aquaculture/add')} accessibilityLabel="Add your first pond" />
      )}
    </View>
  ), [router, canWrite]);

  const renderItem = useCallback(({ item: pond }: { item: Pond }) => (
    <Card style={styles.pondCard}>
      <TouchableOpacity
        onPress={() => router.push(`/aquaculture/${pond.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.pondCardContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
            <Text style={styles.pondName}>{pond.name}</Text>
            <View style={{ backgroundColor: POND_TYPE_COLORS[pond.pondType]?.bg || '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: POND_TYPE_COLORS[pond.pondType]?.text || '#6B7280' }}>
                {pond.pondType || 'FISH'}
              </Text>
            </View>
            <View style={{ backgroundColor: POND_STATUS_COLORS[pond.status]?.bg || '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: POND_STATUS_COLORS[pond.status]?.text || '#6B7280' }}>
                {pond.status ? pond.status.charAt(0).toUpperCase() + pond.status.slice(1) : '—'}
              </Text>
            </View>
          </View>
          <Text style={styles.pondFarm}>🐟 {farmNames[pond.farmId] || 'Farm'}</Text>
          <View style={styles.pondStats}>
            <View style={styles.pondStat}>
              <Text style={styles.pondStatLabel}>Area</Text>
              <Text style={styles.pondStatValue}>{pond.area ?? '—'} ha</Text>
            </View>
            <View style={styles.pondStat}>
              <Text style={styles.pondStatLabel}>Capacity</Text>
              <Text style={styles.pondStatValue}>{pond.capacity ?? '—'}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.pondActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/aquaculture/${pond.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`View details of ${pond.name}`}
        >
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
        {canWrite && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/aquaculture/${pond.id}/edit`)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${pond.name}`}
          >
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
        {canDelete && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteBorderColor]}
            onPress={() => handleDeletePond(pond.id, pond.name)}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${pond.name}`}
          >
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  ), [farmNames, router, handleDeletePond, canWrite, canDelete]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Aquaculture</Text>
        </View>
        <ScreenLoading message="Loading ponds…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Aquaculture</Text>
        </View>
        <StateView
          variant="error"
          title="Couldn't load ponds"
          message={loadError}
          onRetry={fetchPonds}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Aquaculture</Text>
        {canWrite && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/aquaculture/add')}
            accessibilityRole="button"
            accessibilityLabel="Add new pond"
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <TextInputField
          placeholder="Search ponds…"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          containerStyle={{ marginBottom: 12 }}
          accessibilityLabel="Search ponds"
        />
        <View style={styles.filterContainer}>
          {(['all', 'active', 'draining', 'maintenance', 'retired'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, statusFilter === f && styles.filterButtonActive]}
              onPress={() => setStatusFilter(f)}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${f}`}
              accessibilityState={{ selected: statusFilter === f }}
            >
              <Text
                style={[styles.filterButtonText, statusFilter === f && styles.filterButtonTextActive]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredPonds}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </SafeAreaView>
  );
}
