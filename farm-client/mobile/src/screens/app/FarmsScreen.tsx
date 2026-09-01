import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useListFarmsQuery, useDeleteFarmMutation } from '../../store/api';
import { Card, Button, colors } from '../../components/common/UIComponents';
import { ScreenLoading, StateView } from '../../components/feedback';
import { useAppDispatch, useAppSelector } from '../../hooks/useAuth';
import { setSelectedFarmId, setFarmsFilter } from '../../store/slices/uiSlice';

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
  actionButtonText: { color: colors.primary, fontSize: 12, textAlign: 'center' },
  deleteButtonText: { color: colors.error },
  deleteBorderColor: { borderColor: colors.error },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
});

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

const keyExtractor = (item: any) => item.id;

export default function FarmsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const filter = useAppSelector((s) => s.ui.filters.farms);
  const orgId = useAppSelector((state) => state.auth.user?.organizationId);

  const [page] = useState(1);

  const { data, isLoading, isFetching, error, refetch } = useListFarmsQuery({
    page,
    limit: 20,
    ...(orgId ? { organizationId: orgId } : {}),
  });

  const [deleteFarm] = useDeleteFarmMutation();

  const farms = useMemo(() => {
    if (!data) return [];
    const items = Array.isArray(data) ? data : data.farms || data.items || [];
    return items;
  }, [data]);

  const filteredFarms = useMemo(() => {
    return farms.filter((farm: any) => {
      if (filter === 'active' && farm.status !== 'active') return false;
      if (filter === 'inactive' && farm.status !== 'inactive') return false;
      return true;
    });
  }, [farms, filter]);

  const handleDeleteFarm = useCallback((farmId: string, farmName: string) => {
    Alert.alert(
      'Delete Farm',
      `Are you sure you want to delete "${farmName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFarm(farmId).unwrap();
              dispatch(setSelectedFarmId(null));
            } catch (error) {
              // Error handled by RTK Query
            }
          },
        },
      ]
    );
  }, [deleteFarm, dispatch]);

  const handleFilterChange = useCallback((next: FarmFilter) => {
    dispatch(setFarmsFilter(next));
  }, [dispatch]);

  const renderFooter = useCallback(() => {
    if (!isFetching) return null;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={{ fontSize: 12, color: colors.textLight }}>Loading more…</Text>
      </View>
    );
  }, [isFetching]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🌾</Text>
      <Text style={styles.emptyText}>No Farms Yet</Text>
      <Text style={styles.emptySubtext}>
        Create your first farm to get started managing your agricultural operations
      </Text>
      <Button title="Add Farm" onPress={() => router.push('/farms/add')} accessibilityLabel="Add your first farm" />
    </View>
  ), [router]);

  const renderItem = useCallback(({ item: farm }: { item: any }) => (
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
  ), [dispatch, router, handleDeleteFarm]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Farms</Text>
        </View>
        <ScreenLoading message="Loading your farms…" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Farms</Text>
        </View>
        <StateView
          variant="error"
          title="Couldn't load your farms"
          message="Failed to load farms. Please try again."
          onRetry={refetch}
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
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </SafeAreaView>
  );
}
