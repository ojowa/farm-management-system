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
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { cropsAPI, farmsAPI } from '../../services/api';
import { offlineCropsAPI } from '../../services/offlineApi';
import { Card, Button, colors } from '../../components/common/UIComponents';
import { ScreenLoading, StateView } from '../../components/feedback';
import { useAppDispatch, useAppSelector } from '../../hooks/useAuth';
import { useToasts } from '../../hooks/useToasts';
import { describeApiError } from '../../utils/apiError';
import { extractArray, extractTotal } from '../../utils/responseParser';
import { transformCrop, RawCrop } from '../../utils/entityTransformers';
import { setCropsFilter, setSelectedCropId } from '../../store/slices/uiSlice';

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
  filterArea: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  filterRow: { flexDirection: 'row', marginBottom: 8, gap: 8 },
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
  farmFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  farmFilterActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  farmFilterText: { fontSize: 12, color: colors.textLight },
  farmFilterTextActive: { color: '#FFFFFF' },
  clearFilter: { paddingHorizontal: 8, paddingVertical: 6 },
  clearFilterText: { fontSize: 12, color: colors.error, fontWeight: '600' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  cropCard: { marginBottom: 12 },
  cropName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  statusBadgeGrowing: { backgroundColor: '#E8F5E9' },
  statusBadgeHarvesting: { backgroundColor: '#FFF3E0' },
  statusBadgeCompleted: { backgroundColor: '#E3F2FD' },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  statusTextGrowing: { color: colors.success },
  statusTextHarvesting: { color: colors.warning },
  statusTextCompleted: { color: colors.info },
  cropInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cropInfoItem: { flex: 1 },
  cropLabel: { fontSize: 11, color: colors.textLight, marginBottom: 2 },
  cropValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  healthBar: {
    height: 8,
    backgroundColor: colors.light,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  healthFill: { height: '100%', borderRadius: 4 },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 6,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 4,
  },
  actionButtonText: { textAlign: 'center', color: colors.primary, fontSize: 12, fontWeight: '500' },
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
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  footerText: { fontSize: 12, color: colors.textLight },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '50%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16, textAlign: 'center' },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  modalItemText: { fontSize: 16, color: colors.text },
  modalItemActive: { color: colors.primary, fontWeight: '600' },
  modalCloseButton: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  modalCloseText: { fontSize: 16, color: colors.primary, fontWeight: '600' },
});

interface Crop {
  id: string;
  name: string;
  farm: string;
  farmId?: string;
  type: string;
  area: number;
  plantedDate: string;
  health: number;
  status: 'growing' | 'harvesting' | 'completed';
}

type StatusFilter = 'all' | 'growing' | 'harvesting' | 'completed';

interface FarmOption {
  id: string;
  name: string;
}

const PAGE_SIZE = 20;

const keyExtractor = (item: Crop) => item.id;

function getHealthColor(v: number) {
  if (v >= 70) return colors.success;
  if (v >= 40) return colors.warning;
  return colors.error;
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'growing':
      return { badge: styles.statusBadgeGrowing, text: styles.statusTextGrowing };
    case 'harvesting':
      return { badge: styles.statusBadgeHarvesting, text: styles.statusTextHarvesting };
    case 'completed':
      return { badge: styles.statusBadgeCompleted, text: styles.statusTextCompleted };
    default:
      return { badge: styles.statusBadgeGrowing, text: styles.statusTextGrowing };
  }
}

export default function CropsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const cropsFilter = useAppSelector((s) => s.ui.filters.crops);
  const { error: showError } = useToasts();

  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [showFarmModal, setShowFarmModal] = useState(false);
  const orgId = useAppSelector((state) => state.auth.user?.organizationId);

  const fetchFarms = async () => {
    try {
      const filter: any = {};
      if (orgId) filter.organizationId = orgId;
      const response = await farmsAPI.list(filter);
      const farms = extractArray<{ id: string; name: string }>(response);
      setFarms(farms.map((f) => ({ id: f.id, name: f.name })));
    } catch {
      console.warn('[CropsScreen] Failed to load farms for filter');
    }
  };

  const fetchCrops = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        setLoadError(null);
        // Fetch crops + crop-cycles in parallel; merge to enrich crop data
        const [cropsRes, cyclesRes] = await Promise.all([
        offlineCropsAPI.list({ page: pageNum, limit: PAGE_SIZE }),
        offlineCropsAPI.listCycles().catch(() => ({ data: [] })),
        ]);

        const farmNameMap = new Map(farms.map((f) => [f.id, f.name]));
        const rawCrops = extractArray<RawCrop>(cropsRes);
        const cycles = extractArray<any>(cyclesRes);

        // Index cycles by cropId for quick lookup
        const cycleByCropId = new Map<string, any>();
        for (const c of cycles) {
          if (c.cropId) cycleByCropId.set(c.cropId, c);
        }

        const items: Crop[] = rawCrops.map((raw) => {
          const cycle = cycleByCropId.get(raw.id);
          const farmName = cycle?.field ? farmNameMap.get(cycle.farmId) : undefined;
          return transformCrop(raw, farmName, cycle);
        });

        if (append) {
          setCrops((prev) => [...prev, ...items]);
        } else {
          setCrops(items);
        }

        const total = extractTotal(cropsRes, items.length);
        setHasMore(items.length === PAGE_SIZE && (pageNum * PAGE_SIZE) < total);
      } catch (error: any) {
        const message = describeApiError(error, 'Failed to load crops. Please try again.');
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
    fetchFarms();
  }, []);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchCrops(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropsFilter.status, cropsFilter.farmId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await fetchCrops(1, false);
  }, [fetchCrops]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCrops(nextPage, true);
  }, [page, loadingMore, hasMore, loading, fetchCrops]);

  const filteredCrops = useMemo(() => {
    return crops.filter((crop) => {
      if (cropsFilter.status !== 'all' && crop.status !== cropsFilter.status) return false;
      if (cropsFilter.farmId && crop.farmId !== cropsFilter.farmId) return false;
      return true;
    });
  }, [crops, cropsFilter.status, cropsFilter.farmId]);

  const selectedFarm = farms.find((f) => f.id === cropsFilter.farmId);

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
      <Text style={styles.emptyIcon}>🌱</Text>
      <Text style={styles.emptyText}>No Crops Yet</Text>
      <Text style={styles.emptySubtext}>
        Add your first crop to start tracking growth and health
      </Text>
      <Button title="Add Crop" onPress={() => router.push('/crops/add')} />
    </View>
  );

  const renderItem = useCallback(({ item: crop }: { item: Crop }) => {
    const statusStyle = getStatusBadgeStyle(crop.status);
    const hColor = getHealthColor(crop.health);
    return (
      <Card style={styles.cropCard}>
        <Text style={styles.cropName}>{crop.name}</Text>
        <View style={[styles.statusBadge, statusStyle.badge]}>
          <Text style={[styles.statusBadgeText, statusStyle.text]}>
            {crop.status.charAt(0).toUpperCase() + crop.status.slice(1)}
          </Text>
        </View>
        <View style={styles.cropInfo}>
          <View style={styles.cropInfoItem}>
            <Text style={styles.cropLabel}>Type</Text>
            <Text style={styles.cropValue}>{crop.type}</Text>
          </View>
          <View style={styles.cropInfoItem}>
            <Text style={styles.cropLabel}>Area</Text>
            <Text style={styles.cropValue}>{crop.area} ha</Text>
          </View>
          <View style={styles.cropInfoItem}>
            <Text style={styles.cropLabel}>Farm</Text>
            <Text style={styles.cropValue}>{crop.farm}</Text>
          </View>
        </View>
        <Text style={styles.cropLabel}>Health: {crop.health}%</Text>
        <View style={styles.healthBar}>
          <View style={[styles.healthFill, { width: `${crop.health}%` as any, backgroundColor: hColor }]} />
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              dispatch(setSelectedCropId(crop.id));
              router.push(`/crops/${crop.id}`);
            }}
            accessibilityRole="button"
            accessibilityLabel={`View ${crop.name}`}
          >
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/crops/${crop.id}/edit`)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${crop.name}`}
          >
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  }, [dispatch, router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Crops</Text>
        </View>
        <ScreenLoading message="Loading your crops…" />
      </SafeAreaView>
    );
  }

  if (loadError && crops.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Crops</Text>
        </View>
        <StateView
          variant="error"
          title="Couldn't load your crops"
          message={loadError}
          onRetry={() => { setPage(1); fetchCrops(1, false); }}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Crops</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/crops/add')}
          accessibilityRole="button"
          accessibilityLabel="Add new crop"
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterArea}>
        <View style={styles.filterRow}>
          {(['all', 'growing', 'harvesting', 'completed'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, cropsFilter.status === f && styles.filterButtonActive]}
              onPress={() => dispatch(setCropsFilter({ status: f }))}
              accessibilityRole="button"
              accessibilityLabel={f}
              accessibilityState={{ selected: cropsFilter.status === f }}
            >
              <Text
                style={[styles.filterButtonText, cropsFilter.status === f && styles.filterButtonTextActive]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.farmFilterButton, cropsFilter.farmId && styles.farmFilterActive]}
            onPress={() => setShowFarmModal(true)}
            accessibilityRole="button"
            accessibilityLabel={selectedFarm ? `Filter by ${selectedFarm.name}` : 'Filter by farm'}
          >
            <Text style={[styles.farmFilterText, cropsFilter.farmId && styles.farmFilterTextActive]}>
              {selectedFarm ? selectedFarm.name : 'Filter by farm'}
            </Text>
            <Text style={[styles.farmFilterText, cropsFilter.farmId && styles.farmFilterTextActive]}>▼</Text>
          </TouchableOpacity>
          {cropsFilter.farmId && (
            <TouchableOpacity
              style={styles.clearFilter}
              onPress={() => dispatch(setCropsFilter({ farmId: null }))}
            >
              <Text style={styles.clearFilterText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal
        visible={showFarmModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFarmModal(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFarmModal(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Filter by Farm</Text>
              <ScrollView>
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    dispatch(setCropsFilter({ farmId: null }));
                    setShowFarmModal(false);
                  }}
                  accessibilityRole="button"
                >
                  <Text style={[styles.modalItemText, !cropsFilter.farmId && styles.modalItemActive]}>
                    All Farms
                  </Text>
                </TouchableOpacity>
                {farms.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={styles.modalItem}
                    onPress={() => {
                      dispatch(setCropsFilter({ farmId: f.id }));
                      setShowFarmModal(false);
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.modalItemText, cropsFilter.farmId === f.id && styles.modalItemActive]}>
                      {f.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowFarmModal(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <FlatList
        data={filteredCrops}
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