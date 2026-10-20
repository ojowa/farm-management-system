import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { offlinePoultryAPI } from '@/modules/poultry';
import type { Flock } from '@/modules/poultry';
import { farmsAPI } from '@/modules/farm';
import { Card, Button, TextInputField, colors } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { MenuButton } from '@/core/ui/MenuButton';

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
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', flex: 1 },
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
  filterContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 8 },
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
  flockCard: { marginBottom: 12, overflow: 'hidden' },
  flockCardContent: { paddingBottom: 0 },
  flockCode: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  flockBreed: { fontSize: 13, color: colors.textLight, marginBottom: 12 },
  flockStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  flockStat: { alignItems: 'center', flex: 1 },
  flockStatLabel: { fontSize: 11, color: colors.textLight, marginBottom: 4 },
  flockStatValue: { fontSize: 16, fontWeight: '700', color: colors.primary },
  flockActions: {
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

// Local badge palette for flock status, mirroring the POND_STATUS_COLORS
// pattern from aquaculture/index.tsx.
const FLOCK_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: '#DCFCE7', text: '#166534' },
  DECEASED: { bg: '#FEE2E2', text: '#991B1B' },
  SOLD: { bg: '#DBEAFE', text: '#1E40AF' },
  COMPLETED: { bg: '#F3F4F6', text: '#6B7280' },
};

const STATUS_FILTERS = ['all', 'ACTIVE', 'DECEASED', 'SOLD', 'COMPLETED'] as const;
type FlockStatusFilter = (typeof STATUS_FILTERS)[number];

/**
 * The backend returns flocks either as a bare array or wrapped in a
 * `{ data: [...] }` page envelope depending on the caller (the dashboard reads
 * a bare array; paginated endpoints wrap). Unwrap both so a shape change can
 * never blank the list into a false "empty" state.
 */
function unwrapList<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

const keyExtractor = (item: Flock) => item.id;

function formatArrivalDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

export default function PoultryScreen() {
  const router = useRouter();
  const { success, error: showError } = useToasts();
  const { hasPermission } = usePermission();
  const { colors: tc, isDark } = useAppTheme();

  // Flock actions mirror the server's FlocksController checks: poultry.read
  // sees the list, poultry.write adds, poultry.delete deletes. Missing
  // permissions default to hidden — the API would 403 regardless.
  const canWrite = hasPermission('poultry.write');
  const canDelete = hasPermission('poultry.delete');

  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [farmNames, setFarmNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FlockStatusFilter>('all');

  useEffect(() => {
    fetchFlocks();
    fetchFarms();
  }, []);

  const fetchFlocks = async () => {
    try {
      setLoadError(null);
      // offlinePoultryAPI queues while disconnected; the online path hits GET /flocks.
      const response = await offlinePoultryAPI.list({ page: 1, limit: 100 });
      setFlocks(unwrapList<Flock>(response.data));
    } catch (error: any) {
      setLoadError(describeApiError(error, 'Failed to load flocks.'));
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
    } catch {
      /* ignore — cards fall back to the farm id */
    }
  };

  const filteredFlocks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return flocks.filter((flock) => {
      const status = flock.status?.toUpperCase();
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (query) {
        const haystack =
          `${flock.batchCode} ${flock.breed?.name ?? ''} ${farmNames[flock.farmId] ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [flocks, statusFilter, search, farmNames]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFlocks();
  }, []);

  const handleDeleteFlock = useCallback(
    (flockId: string, batchCode: string) => {
      Alert.alert(
        'Delete Flock',
        `Are you sure you want to delete flock "${batchCode}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await offlinePoultryAPI.delete(flockId);
                success('Flock deleted successfully');
                fetchFlocks();
              } catch (error: any) {
                showError(describeApiError(error, 'Failed to delete flock.'));
              }
            },
          },
        ]
      );
    },
    [success, showError]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🥚</Text>
        <Text style={[styles.emptyText, { color: tc.text }]}>No Flocks Yet</Text>
        <Text style={[styles.emptySubtext, { color: tc.textSecondary }]}>
          Create your first flock to start tracking birds, feeding, vaccination, mortality and egg
          production
        </Text>
        {canWrite && (
          <Button
            title="Add Flock"
            onPress={() => router.push('/poultry/add')}
            accessibilityLabel="Add your first flock"
          />
        )}
      </View>
    ),
    [router, canWrite, tc]
  );

  const renderItem = useCallback(
    ({ item: flock }: { item: Flock }) => (
      <Card style={[styles.flockCard, { backgroundColor: tc.card }]}>
        <TouchableOpacity onPress={() => router.push(`/poultry/${flock.id}`)} activeOpacity={0.7}>
          <View style={styles.flockCardContent}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 4,
              }}
            >
              <Text style={[styles.flockCode, { color: tc.text }]}>{flock.batchCode}</Text>
              <View
                style={{
                  backgroundColor: FLOCK_STATUS_COLORS[flock.status?.toUpperCase()]?.bg || '#F3F4F6',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '600',
                    color: FLOCK_STATUS_COLORS[flock.status?.toUpperCase()]?.text || '#6B7280',
                  }}
                >
                  {flock.status || '—'}
                </Text>
              </View>
            </View>
            <Text style={[styles.flockBreed, { color: tc.textSecondary }]}>
              🐔 {flock.breed?.name || 'Breed'} · {farmNames[flock.farmId] || 'Farm'}
            </Text>
            <View style={[styles.flockStats, { borderTopColor: isDark ? tc.surface : '#F5F5F5' }]}>
              <View style={styles.flockStat}>
                <Text style={[styles.flockStatLabel, { color: tc.textSecondary }]}>Birds</Text>
                <Text style={styles.flockStatValue}>
                  {flock.currentCount ?? '—'}/{flock.birdCount ?? '—'}
                </Text>
              </View>
              <View style={styles.flockStat}>
                <Text style={[styles.flockStatLabel, { color: tc.textSecondary }]}>Age</Text>
                <Text style={styles.flockStatValue}>{flock.currentAgeDays ?? '—'} d</Text>
              </View>
              <View style={styles.flockStat}>
                <Text style={[styles.flockStatLabel, { color: tc.textSecondary }]}>Arrived</Text>
                <Text style={styles.flockStatValue}>
                  {formatArrivalDate(flock.arrivalDate)}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
        <View style={[styles.flockActions, { borderTopColor: isDark ? tc.surface : '#F5F5F5' }]}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/poultry/${flock.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`View details of ${flock.batchCode}`}
          >
            <Text style={[styles.actionButtonText, { color: tc.primary }]}>View Details</Text>
          </TouchableOpacity>
          {canDelete && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteBorderColor]}
              onPress={() => handleDeleteFlock(flock.id, flock.batchCode)}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${flock.batchCode}`}
            >
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    ),
    [farmNames, router, handleDeleteFlock, canDelete, tc, isDark]
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <MenuButton />
          <Text style={styles.headerTitle}>Poultry</Text>
        </View>
        <ScreenLoading message="Loading flocks…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <MenuButton />
          <Text style={styles.headerTitle}>Poultry</Text>
        </View>
        <StateView
          variant="error"
          title="Couldn't load flocks"
          message={loadError}
          onRetry={fetchFlocks}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <MenuButton />
        <Text style={styles.headerTitle}>Poultry</Text>
        {canWrite && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/poultry/add')}
            accessibilityRole="button"
            accessibilityLabel="Add new flock"
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <TextInputField
          placeholder="Search flocks…"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          containerStyle={{ marginBottom: 12 }}
          accessibilityLabel="Search flocks"
        />
        <View style={styles.filterContainer}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, statusFilter === f && styles.filterButtonActive, statusFilter === f ? undefined : { backgroundColor: tc.card, borderColor: tc.border }]}
              onPress={() => setStatusFilter(f)}
              accessibilityRole="button"
              accessibilityLabel={f === 'all' ? 'Filter all flocks' : `Filter ${f.toLowerCase()} flocks`}
              accessibilityState={{ selected: statusFilter === f }}
            >
              <Text
                style={[styles.filterButtonText, statusFilter === f && styles.filterButtonTextActive, statusFilter === f ? undefined : { color: tc.textSecondary }]}
              >
                {f === 'all' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredFlocks}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </SafeAreaView>
  );
}
