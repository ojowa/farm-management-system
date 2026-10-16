import React, { useMemo, useState, useCallback, useEffect } from 'react';
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
import { useListFarmsQuery, useDeleteFarmMutation } from '@/store/api';
import { Card, Button } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { useAppDispatch, useAppSelector } from '@/modules/auth/hooks/useAuth';
import { setSelectedFarmId, setFarmsFilter } from '@/store/slices/uiSlice';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
import { usePermission } from '@/core/hooks/usePermission';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { FARM_TYPE_COLORS, FARM_TYPE_LABELS } from '@/core/farmTypes';

const PAGE_SIZE = 20;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
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
  emptyText: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptySubtext: { fontSize: 14, marginBottom: 20, textAlign: 'center' },
  filterContainer: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterButtonText: { fontSize: 12 },
  filterButtonTextActive: { color: '#FFFFFF' },
  farmCard: { marginBottom: 12, overflow: 'hidden' },
  farmCardContent: { paddingBottom: 0 },
  farmName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  farmLocation: { fontSize: 13, marginBottom: 12 },
  farmStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  farmStat: { alignItems: 'center', flex: 1 },
  farmStatLabel: { fontSize: 11, marginBottom: 4 },
  farmStatValue: { fontSize: 16, fontWeight: '700' },
  farmActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionButtonText: { fontSize: 12, textAlign: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
});

type FarmFilter = 'all' | 'active' | 'inactive';

const keyExtractor = (item: any) => item.id;

// Server rows carry lowercase statuses ("active"); display copy is Title
// case ("Active"/"Inactive") in both the list and the detail screen.
const formatStatus = (status?: string) => {
  const value = String(status || '').trim();
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

export default function FarmsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const filter = useAppSelector((s) => s.ui.filters.farms);
  const { success, error: showError } = useToasts();
  const { colors: themeColors, isDark } = useAppTheme();

  // Farm actions mirror the server's permission checks: everyone with
  // farm.read sees the list; only farm.write may add/edit, farm.delete may
  // delete. usePermission is wildcard-aware ("*" and "farm.*" both grant
  // farm.write) where a raw permissions.includes() was not.
  const { canCreate, canDelete } = usePermission();
  const canWrite = canCreate('farm');
  const canRemove = canDelete('farm');

  // Infinite scroll: the list keeps `limit` honest instead of re-fetching a
  // frozen page 1 — onEndReached grows the window by PAGE_SIZE while more
  // rows exist server-side.
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isFetching, error, refetch } = useListFarmsQuery({ limit });

  const [deleteFarm] = useDeleteFarmMutation();

  const farms = useMemo(() => {
    if (!data) return [];
    // `farms` is the server's legacy key, `data` the current one; plain
    // arrays pass through untouched.
    const items = Array.isArray(data) ? data : data.farms || data.data || data.items || [];
    return Array.isArray(items) ? items : [];
  }, [data]);

  const total = useMemo(() => {
    if (!data || Array.isArray(data)) return farms.length;
    return typeof data.total === 'number' ? data.total : farms.length;
  }, [data, farms]);

  const hasMore = farms.length < total;

  const filteredFarms = useMemo(() => {
    return farms.filter((farm: any) => {
      const status = String(farm?.status || '').toLowerCase();
      if (filter === 'active' && status !== 'active') return false;
      if (filter === 'inactive' && status !== 'inactive') return false;
      return true;
    });
  }, [farms, filter]);

  useEffect(() => {
    if (refreshing && !isFetching) setRefreshing(false);
  }, [refreshing, isFetching]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
  }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (!hasMore || isFetching) return;
    setLimit((prev) => prev + PAGE_SIZE);
  }, [hasMore, isFetching]);

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
              success('Farm deleted successfully');
              dispatch(setSelectedFarmId(null));
            } catch (error) {
              // The server explains why (e.g. 409 "Farm has dependent
              // records…") — surface that verbatim instead of swallowing it.
              showError(describeApiError(error, 'Failed to delete farm. Please try again.'));
            }
          },
        },
      ]
    );
  }, [deleteFarm, dispatch, success, showError]);

  const handleFilterChange = useCallback((next: FarmFilter) => {
    dispatch(setFarmsFilter(next));
  }, [dispatch]);

  const dynamicStyles = useMemo(() => ({
    container: {
      backgroundColor: themeColors.background,
    },
    header: {
      backgroundColor: themeColors.headerBg || themeColors.primary,
    },
    cardBackground: {
      backgroundColor: themeColors.card,
      borderColor: isDark ? themeColors.border : 'transparent',
      borderWidth: isDark ? 1 : 0,
    },
    emptyText: {
      color: themeColors.text,
    },
    emptySubtext: {
      color: themeColors.textSecondary,
    },
    filterButton: {
      backgroundColor: themeColors.card,
      borderColor: isDark ? themeColors.border : themeColors.borderLight,
    },
    filterButtonActive: {
      backgroundColor: themeColors.primary,
      borderColor: themeColors.primary,
    },
    filterButtonText: {
      color: themeColors.textSecondary,
    },
    farmName: {
      color: themeColors.text,
    },
    farmLocation: {
      color: themeColors.textSecondary,
    },
    divider: {
      borderTopColor: isDark ? themeColors.border : themeColors.borderLight,
    },
    farmStatLabel: {
      color: themeColors.textSecondary,
    },
    farmStatValue: {
      color: themeColors.primary,
    },
    actionButton: {
      borderColor: themeColors.primary,
    },
    actionButtonText: {
      color: themeColors.primary,
    },
    deleteButtonText: {
      color: themeColors.error,
    },
    deleteBorderColor: {
      borderColor: themeColors.error,
    },
    footerText: {
      color: themeColors.textSecondary,
    },
  }), [themeColors, isDark]);

  const renderFooter = useCallback(() => {
    // Only the "load more" growth fetch shows here — pull-to-refresh drives
    // its own spinner in the RefreshControl.
    if (isLoading || !isFetching || refreshing) return null;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={themeColors.primary} />
        <Text style={[{ fontSize: 12 }, dynamicStyles.footerText]}>Loading more…</Text>
      </View>
    );
  }, [isFetching, isLoading, refreshing, themeColors.primary, dynamicStyles]);

  const renderEmpty = useCallback(() => {
    if (filter !== 'all') {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No {filter} farms</Text>
          <Text style={[styles.emptySubtext, dynamicStyles.emptySubtext]}>
            No farms match this filter. Try a different one.
          </Text>
          <Button
            title="Show All Farms"
            onPress={() => handleFilterChange('all')}
            accessibilityLabel="Clear the farm filter"
          />
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🌾</Text>
        <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No Farms Yet</Text>
        <Text style={[styles.emptySubtext, dynamicStyles.emptySubtext]}>
          Create your first farm to get started managing your agricultural operations
        </Text>
        {canWrite && (
          <Button title="Add Farm" onPress={() => router.push('/farms/add')} accessibilityLabel="Add your first farm" />
        )}
      </View>
    );
  }, [router, canWrite, filter, handleFilterChange, dynamicStyles]);

  const renderItem = useCallback(({ item: farm }: { item: any }) => (
    <Card style={[styles.farmCard, dynamicStyles.cardBackground]}>
      <TouchableOpacity
        onPress={() => {
          dispatch(setSelectedFarmId(farm.id));
          router.push(`/farms/${farm.id}`);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.farmCardContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={[styles.farmName, dynamicStyles.farmName]}>{farm.name}</Text>
            <View style={{ backgroundColor: FARM_TYPE_COLORS[farm.farmType]?.bg || '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: FARM_TYPE_COLORS[farm.farmType]?.text || '#6B7280' }}>
                {FARM_TYPE_LABELS[farm.farmType] || farm.farmType}
              </Text>
            </View>
          </View>
          <Text style={[styles.farmLocation, dynamicStyles.farmLocation]}>📍 {farm.location}</Text>
          <View style={[styles.farmStats, dynamicStyles.divider]}>
            <View style={styles.farmStat}>
              <Text style={[styles.farmStatLabel, dynamicStyles.farmStatLabel]}>Size</Text>
              <Text style={[styles.farmStatValue, dynamicStyles.farmStatValue]}>{farm.size} ha</Text>
            </View>
            <View style={styles.farmStat}>
              <Text style={[styles.farmStatLabel, dynamicStyles.farmStatLabel]}>Status</Text>
              <Text style={[styles.farmStatValue, dynamicStyles.farmStatValue]}>
                {formatStatus(farm.status)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      <View style={[styles.farmActions, dynamicStyles.divider]}>
        <TouchableOpacity
          style={[styles.actionButton, dynamicStyles.actionButton]}
          onPress={() => router.push(`/farms/${farm.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`View details of ${farm.name}`}
        >
          <Text style={[styles.actionButtonText, dynamicStyles.actionButtonText]}>View Details</Text>
        </TouchableOpacity>
        {canWrite && (
          <TouchableOpacity
            style={[styles.actionButton, dynamicStyles.actionButton]}
            onPress={() => router.push(`/farms/${farm.id}/edit`)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${farm.name}`}
          >
            <Text style={[styles.actionButtonText, dynamicStyles.actionButtonText]}>Edit</Text>
          </TouchableOpacity>
        )}
        {canRemove && (
          <TouchableOpacity
            style={[styles.actionButton, dynamicStyles.deleteBorderColor]}
            onPress={() => handleDeleteFarm(farm.id, farm.name)}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${farm.name}`}
          >
            <Text style={[styles.actionButtonText, dynamicStyles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  ), [dispatch, router, handleDeleteFarm, canWrite, canRemove, dynamicStyles]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, dynamicStyles.header]}>
          <Text style={styles.headerTitle}>My Farms</Text>
        </View>
        <ScreenLoading message="Loading your farms…" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, dynamicStyles.header]}>
          <Text style={styles.headerTitle}>My Farms</Text>
        </View>
        <StateView
          variant="error"
          title="Couldn't load your farms"
          message={describeApiError(error, 'Failed to load farms. Please try again.')}
          onRetry={refetch}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <Text style={styles.headerTitle}>My Farms</Text>
        {canWrite && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/farms/add')}
            accessibilityRole="button"
            accessibilityLabel="Add new farm"
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.filterContainer}>
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterButton,
                filter === f ? dynamicStyles.filterButtonActive : dynamicStyles.filterButton,
              ]}
              onPress={() => handleFilterChange(f)}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${f}`}
              accessibilityState={{ selected: filter === f }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  dynamicStyles.filterButtonText,
                  filter === f && styles.filterButtonTextActive,
                ]}
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
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[themeColors.primary]}
            tintColor={themeColors.primary}
          />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </SafeAreaView>
  );
}
