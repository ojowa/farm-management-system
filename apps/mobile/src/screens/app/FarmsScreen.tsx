import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { farmsAPI } from '../../services/api';
import { Card, Button, colors } from '../../components/common/UIComponents';
import { ScreenLoading, StateView } from '../../components/feedback';
import { useAppDispatch, useAppSelector } from '../../hooks/useAuth';
import { useToasts } from '../../hooks/useToasts';
import { describeApiError } from '../../utils/apiError';
import { extractArray, extractTotal } from '../../utils/responseParser';
import { transformFarm, RawFarm } from '../../utils/entityTransformers';
import { setFarmsFilter, setFarmTypeFilter, setSelectedFarmId } from '../../store/slices/uiSlice';

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
  filterContainer: { flexDirection: 'row', marginBottom: 16, gap: 8 },
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
  farmCard: { marginBottom: 12, overflow: 'hidden' },
  farmCardContent: { paddingBottom: 0 },
  farmName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  farmLocation: { fontSize: 13, color: colors.textLight, marginBottom: 12 },
  farmStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  farmStat: { alignItems: 'center', flex: 1 },
  farmStatLabel: { fontSize: 11, color: colors.textLight, marginBottom: 4 },
  farmStatValue: { fontSize: 16, fontWeight: '700', color: colors.primary },
  farmActions: {
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
  actionButtonText: { color: colors.primary, fontSize: 12 },
  deleteButtonText: { color: colors.error },
  deleteBorderColor: { borderColor: colors.error },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  footerText: { fontSize: 12, color: colors.textLight },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
});

interface Farm {
  id: string;
  name: string;
  farmType: string;
  location: string;
  size: number;
  crops: number;
  animals: number;
  status: 'active' | 'inactive';
}

type FarmFilter = 'all' | 'active' | 'inactive';

const FARM_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  CROP: { bg: '#DCFCE7', text: '#166534' },
  LIVESTOCK: { bg: '#FEF3C7', text: '#92400E' },
  POULTRY: { bg: '#FFEDD5', text: '#9A3412' },
  DAIRY: { bg: '#DBEAFE', text: '#1E40AF' },
  AQUACULTURE: { bg: '#CFFAFE', text: '#155E75' },
};

const FARM_TYPE_LABELS: Record<string, string> = {
  CROP: 'Crop',
  LIVESTOCK: 'Livestock',
  POULTRY: 'Poultry',
  DAIRY: 'Dairy',
  AQUACULTURE: 'Aquaculture',
};

const keyExtractor = (item: Farm) => item.id;

export default function FarmsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const filter = useAppSelector((s) => s.ui.filters.farms);
  const { success, error: showError } = useToasts();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const PAGE_SIZE = 20;

  const fetchFarms = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        setLoadError(null);
        
        // Build filter object from current state
        const filter: any = {};
        
        // Add organization ID from auth state if available
        const orgId = useAppSelector((state) => state.auth.user?.organizationId);
        if (orgId) {
          filter.organizationId = orgId;
        }
        
        // Add search term if we implement search in the future
        // For now, we'll keep the status filter as client-side since it's simple
        
        const response = await farmsAPI.list({
          page: pageNum,
          limit: PAGE_SIZE,
          ...filter
        });
        const items = extractArray<RawFarm>(response).map(transformFarm);

        if (append) {
          setFarms((prev) => [...prev, ...items]);
        } else {
          setFarms(items);
        }

        const total = extractTotal(response, items.length);
        setHasMore(items.length === PAGE_SIZE && (pageNum * PAGE_SIZE) < total);
      } catch (error: any) {
        const message = describeApiError(error, 'Failed to load farms. Please try again.');
        setLoadError(message);
        if (!loading) showError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [loading, showError]
  );

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchFarms(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await fetchFarms(1, false);
  }, [fetchFarms]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFarms(nextPage, true);
  }, [page, loadingMore, hasMore, loading, fetchFarms]);

  const filteredFarms = useMemo(() => farms.filter((farm) => {
    if (filter === 'active' && farm.status !== 'active') return false;
    if (filter === 'inactive' && farm.status !== 'inactive') return false;
    const farmTypeFilter = useAppSelector((s) => s.ui.filters.farmType);
    if (farmTypeFilter && farmTypeFilter !== 'all' && farm.farmType !== farmTypeFilter) return false;
    return true;
  }), [farms, filter]);

  const handleDeleteFarm = (farmId: string, farmName: string) => {
    const { Alert } = require('react-native');
    Alert.alert(
      'Delete Farm',
      `Are you sure you want to delete "${farmName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteFarm(farmId) },
      ]
    );
  };

  const confirmDeleteFarm = async (farmId: string) => {
    try {
      await farmsAPI.delete(farmId);
      setFarms(farms.filter((f) => f.id !== farmId));
      dispatch(setSelectedFarmId(null));
      success('Farm deleted successfully');
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to delete farm.'));
    }
  };

  const handleFilterChange = (next: FarmFilter) => {
    dispatch(setFarmsFilter(next));
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerText}>Loading more…</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🌾</Text>
      <Text style={styles.emptyText}>No Farms Yet</Text>
      <Text style={styles.emptySubtext}>
        Create your first farm to get started managing your agricultural operations
      </Text>
      <Button title="Add Farm" onPress={() => router.push('/farms/add')} accessibilityLabel="Add your first farm" />
    </View>
  );

  const renderItem = React.useCallback(({ item: farm }: { item: Farm }) => (
    <Card style={styles.farmCard}>
      <TouchableOpacity
        onPress={() => {
          dispatch(setSelectedFarmId(farm.id));
          router.push(`/farms/${farm.id}`);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.farmCardContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={styles.farmName}>{farm.name}</Text>
            <View style={{ backgroundColor: FARM_TYPE_COLORS[farm.farmType]?.bg || '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: FARM_TYPE_COLORS[farm.farmType]?.text || '#6B7280' }}>
                {FARM_TYPE_LABELS[farm.farmType] || farm.farmType}
              </Text>
            </View>
          </View>
          <Text style={styles.farmLocation}>📍 {farm.location}</Text>
          <View style={styles.farmStats}>
            <View style={styles.farmStat}>
              <Text style={styles.farmStatLabel}>Size</Text>
              <Text style={styles.farmStatValue}>{farm.size} ha</Text>
            </View>
            <View style={styles.farmStat}>
              <Text style={styles.farmStatLabel}>Crops</Text>
              <Text style={styles.farmStatValue}>{farm.crops}</Text>
            </View>
            <View style={styles.farmStat}>
              <Text style={styles.farmStatLabel}>Animals</Text>
              <Text style={styles.farmStatValue}>{farm.animals}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.farmActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/farms/${farm.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`View details of ${farm.name}`}
        >
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/farms/${farm.id}/edit`)}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${farm.name}`}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteBorderColor]}
          onPress={() => handleDeleteFarm(farm.id, farm.name)}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${farm.name}`}
        >
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  ), [dispatch, router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Farms</Text>
        </View>
        <ScreenLoading message="Loading your farms…" />
      </SafeAreaView>
    );
  }

  if (loadError && farms.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Farms</Text>
        </View>
        <StateView
          variant="error"
          title="Couldn't load your farms"
          message={loadError}
          onRetry={() => { setPage(1); fetchFarms(1, false); }}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Farms</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/farms/add')}
          accessibilityRole="button"
          accessibilityLabel="Add new farm"
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.filterContainer}>
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, filter === f && styles.filterButtonActive]}
              onPress={() => handleFilterChange(f)}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${f}`}
              accessibilityState={{ selected: filter === f }}
            >
              <Text
                style={[styles.filterButtonText, filter === f && styles.filterButtonTextActive]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredFarms}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </SafeAreaView>
  );
}