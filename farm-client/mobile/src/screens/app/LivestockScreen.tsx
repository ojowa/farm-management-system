import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { farmsAPI } from '../../services/api';
import { offlineLivestockAPI, offlinePoultryAPI } from '../../services/offlineApi';
import { Card, Button, colors } from '../../components/common/UIComponents';
import { ScreenLoading, StateView } from '../../components/feedback';
import { useAppDispatch, useAppSelector } from '../../hooks/useAuth';
import { useToasts } from '../../hooks/useToasts';
import { describeApiError } from '../../utils/apiError';
import { extractArray, extractTotal } from '../../utils/responseParser';
import { transformLivestock, transformFlock, RawLivestock, RawFlock } from '../../utils/entityTransformers';
import { setLivestockFilter, setSelectedLivestockId } from '../../store/slices/uiSlice';

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
  animalCard: { marginBottom: 12 },
  animalName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  animalType: { fontSize: 13, color: colors.textLight, marginBottom: 4 },
  healthStatus: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  healthDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  healthText: { fontSize: 13 },
  animalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  animalInfoItem: { flex: 1, alignItems: 'center' },
  animalLabel: { fontSize: 11, color: colors.textLight, marginBottom: 2 },
  animalValue: { fontSize: 14, fontWeight: '600', color: colors.primary },
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

interface Animal {
  id: string;
  name: string;
  type: 'livestock' | 'poultry';
  breed: string;
  quantity: number;
  health: 'healthy' | 'sick' | 'treatment';
  farm: string;
  farmId?: string;
  lastCheckup: string;
}

type TypeFilter = 'all' | 'livestock' | 'poultry';

interface FarmOption {
  id: string;
  name: string;
}

const PAGE_SIZE = 20;

const keyExtractor = (item: Animal) => item.id;

const getHealthColor = (health: string) => {
  if (health === 'healthy') return colors.success;
  if (health === 'treatment') return colors.warning;
  return colors.error;
};

export default function LivestockScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const livestockFilter = useAppSelector((s) => s.ui.filters.livestock);
  const { error: showError } = useToasts();

  const [animals, setAnimals] = useState<Animal[]>([]);
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
      console.warn('[LivestockScreen] Failed to load farms for filter');
    }
  };

  const fetchAnimals = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        setLoadError(null);
        const params = { page: pageNum, limit: PAGE_SIZE };

        const [livestockRes, poultryRes] = await Promise.all([
        offlineLivestockAPI.list(params),
        offlinePoultryAPI.list(params),
        ]);

        // Build a farm name lookup from the farms already loaded
        const farmNameMap = new Map(farms.map((f) => [f.id, f.name]));

        const livestockData = extractArray<RawLivestock>(livestockRes).map((item) =>
          transformLivestock(item, farmNameMap.get(item.farmId))
        );

        const poultryData = extractArray<RawFlock>(poultryRes).map(transformFlock);

        const items = [...livestockData, ...poultryData];

        if (append) {
          setAnimals((prev) => [...prev, ...items]);
        } else {
          setAnimals(items);
        }

        const totalLivestock = extractTotal(livestockRes, livestockData.length);
        const totalPoultry = extractTotal(poultryRes, poultryData.length);
        const total = totalLivestock + totalPoultry;
        setHasMore(items.length === PAGE_SIZE * 2 && (pageNum * PAGE_SIZE * 2) < total);
      } catch (error: any) {
        const message = describeApiError(error, 'Failed to load animals. Please try again.');
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
    fetchAnimals(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livestockFilter.type, livestockFilter.farmId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await fetchAnimals(1, false);
  }, [fetchAnimals]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchAnimals(nextPage, true);
  }, [page, loadingMore, hasMore, loading, fetchAnimals]);

  const filteredAnimals = useMemo(
    () =>
      animals.filter((animal) => {
        if (livestockFilter.type !== 'all' && animal.type !== livestockFilter.type) return false;
        if (livestockFilter.farmId && animal.farmId !== livestockFilter.farmId) return false;
        return true;
      }),
    [animals, livestockFilter.type, livestockFilter.farmId]
  );

  const selectedFarm = farms.find((f) => f.id === livestockFilter.farmId);

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
      <Text style={styles.emptyIcon}>🐄</Text>
      <Text style={styles.emptyText}>No Animals Yet</Text>
      <Text style={styles.emptySubtext}>
        Add livestock or poultry to track their health and productivity
      </Text>
      <Button title="Add Animals" onPress={() => router.push('/livestock/add')} />
    </View>
  );

  const renderItem = useCallback(({ item: animal }: { item: Animal }) => {
    const hColor = getHealthColor(animal.health);
    return (
      <Card style={styles.animalCard}>
        <Text style={styles.animalName}>{animal.name}</Text>
        <Text style={styles.animalType}>
          {animal.type === 'livestock' ? '🐄' : '🐔'} {animal.breed}
        </Text>
        <View style={styles.healthStatus}>
          <View style={[styles.healthDot, { backgroundColor: hColor }]} />
          <Text style={[styles.healthText, { color: hColor }]}>
            {animal.health.charAt(0).toUpperCase() + animal.health.slice(1)}
          </Text>
        </View>
        <View style={styles.animalInfo}>
          <View style={styles.animalInfoItem}>
            <Text style={styles.animalLabel}>Quantity</Text>
            <Text style={styles.animalValue}>{animal.quantity}</Text>
          </View>
          <View style={styles.animalInfoItem}>
            <Text style={styles.animalLabel}>Farm</Text>
            <Text style={styles.animalValue}>{animal.farm}</Text>
          </View>
          <View style={styles.animalInfoItem}>
            <Text style={styles.animalLabel}>Last Checkup</Text>
            <Text style={styles.animalValue}>{animal.lastCheckup}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              dispatch(setSelectedLivestockId(animal.id));
              router.push(`/livestock/${animal.id}`);
            }}
            accessibilityRole="button"
            accessibilityLabel={`View ${animal.name}`}
          >
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/livestock/${animal.id}/edit`)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${animal.name}`}
          >
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/livestock/${animal.id}/health`)}
            accessibilityRole="button"
            accessibilityLabel={`Health for ${animal.name}`}
          >
            <Text style={styles.actionButtonText}>Health</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Livestock & Poultry</Text>
        </View>
        <ScreenLoading message="Loading your animals…" />
      </SafeAreaView>
    );
  }

  if (loadError && animals.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Livestock & Poultry</Text>
        </View>
        <StateView
          variant="error"
          title="Couldn't load your animals"
          message={loadError}
          onRetry={() => { setPage(1); fetchAnimals(1, false); }}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Livestock & Poultry</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/livestock/add')}
          accessibilityRole="button"
          accessibilityLabel="Add new animal"
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterArea}>
        <View style={styles.filterRow}>
          {(['all', 'livestock', 'poultry'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, livestockFilter.type === f && styles.filterButtonActive]}
              onPress={() => dispatch(setLivestockFilter({ type: f }))}
              accessibilityRole="button"
              accessibilityLabel={f}
              accessibilityState={{ selected: livestockFilter.type === f }}
            >
              <Text
                style={[styles.filterButtonText, livestockFilter.type === f && styles.filterButtonTextActive]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.farmFilterButton, livestockFilter.farmId && styles.farmFilterActive]}
            onPress={() => setShowFarmModal(true)}
            accessibilityRole="button"
            accessibilityLabel={`Filter by farm${selectedFarm ? `: ${selectedFarm.name}` : ''}`}
          >
            <Text style={[styles.farmFilterText, livestockFilter.farmId && styles.farmFilterTextActive]}>
              {selectedFarm ? selectedFarm.name : 'Filter by farm'}
            </Text>
            <Text style={[styles.farmFilterText, livestockFilter.farmId && styles.farmFilterTextActive]}>▼</Text>
          </TouchableOpacity>
          {livestockFilter.farmId && (
            <TouchableOpacity
              style={styles.clearFilter}
              onPress={() => dispatch(setLivestockFilter({ farmId: null }))}
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
                    dispatch(setLivestockFilter({ farmId: null }));
                    setShowFarmModal(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="All Farms"
                >
                  <Text style={[styles.modalItemText, !livestockFilter.farmId && styles.modalItemActive]}>
                    All Farms
                  </Text>
                </TouchableOpacity>
                {farms.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={styles.modalItem}
                    onPress={() => {
                      dispatch(setLivestockFilter({ farmId: f.id }));
                      setShowFarmModal(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={f.name}
                  >
                    <Text style={[styles.modalItemText, livestockFilter.farmId === f.id && styles.modalItemActive]}>
                      {f.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowFarmModal(false)} accessibilityRole="button" accessibilityLabel="Close farm filter">
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <FlatList
        data={filteredAnimals}
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