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
import { equipmentAPI } from '@/modules/inventory';
import type { Equipment } from '@/modules/inventory';
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
  equipCard: { marginBottom: 12, overflow: 'hidden' },
  equipCardContent: { paddingBottom: 0 },
  equipName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  equipMeta: { fontSize: 13, color: colors.textLight, marginBottom: 12 },
  equipStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  equipStat: { alignItems: 'center', flex: 1 },
  equipStatLabel: { fontSize: 11, color: colors.textLight, marginBottom: 4 },
  equipStatValue: { fontSize: 13, fontWeight: '700', color: colors.primary },
  equipActions: {
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

const EQUIP_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: '#DCFCE7', text: '#166534' },
  MAINTENANCE: { bg: '#FEF3C7', text: '#92400E' },
  INACTIVE: { bg: '#F3F4F6', text: '#6B7280' },
  RETIRED: { bg: '#FEE2E2', text: '#991B1B' },
};

const STATUS_FILTERS = ['all', 'ACTIVE', 'MAINTENANCE', 'INACTIVE', 'RETIRED'] as const;
type EquipStatusFilter = (typeof STATUS_FILTERS)[number];

/** The equipment endpoint returns a `{ data: [...] }` page envelope (or a bare
 * array); unwrap both so a shape change can never blank the list into a false
 * "empty" state. */
function unwrapList<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function formatCost(value?: number | null) {
  if (value == null || isNaN(Number(value))) return '—';
  return Number(value).toLocaleString();
}

export default function EquipmentScreen() {
  const router = useRouter();
  const { success, error: showError } = useToasts();
  const { hasPermission } = usePermission();
  const { colors: tc, isDark } = useAppTheme();

  // Equipment actions mirror the server's EquipmentController: farm.write
  // creates/edits, farm.delete removes. Missing permissions default to hidden.
  const canWrite = hasPermission('farm.write');
  const canDelete = hasPermission('farm.delete');

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [farmNames, setFarmNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EquipStatusFilter>('all');

  useEffect(() => {
    fetchEquipment();
    fetchFarms();
  }, []);

  const fetchEquipment = async () => {
    try {
      setLoadError(null);
      const response = await equipmentAPI.list({ page: 1, limit: 200 });
      setEquipment(unwrapList<Equipment>(response.data));
    } catch (error: any) {
      setLoadError(describeApiError(error, 'Failed to load equipment.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFarms = async () => {
    try {
      const response = await farmsAPI.list();
      const farmsData = unwrapList<any>(response.data);
      setFarmNames(
        farmsData.reduce((acc: Record<string, string>, f: any) => {
          acc[f.id] = f.name;
          return acc;
        }, {})
      );
    } catch {
      /* ignore — cards fall back to the farm id */
    }
  };

  const filteredEquipment = useMemo(() => {
    const query = search.trim().toLowerCase();
    return equipment.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (query) {
        const haystack = `${item.name} ${item.type ?? ''} ${item.model ?? ''} ${
          item.serialNumber ?? ''
        }`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [equipment, statusFilter, search]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEquipment();
  }, []);

  const handleDelete = useCallback(
    (itemId: string, name: string) => {
      Alert.alert(
        'Delete Equipment',
        `Are you sure you want to delete "${name}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await equipmentAPI.delete(itemId);
                success('Equipment deleted successfully');
                fetchEquipment();
              } catch (error: any) {
                showError(describeApiError(error, 'Failed to delete equipment.'));
              }
            },
          },
        ]
      );
    },
    [success, showError]
  );

  const renderFooter = useCallback(
    () =>
      refreshing ? (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={{ fontSize: 12, color: tc.textSecondary }}>Loading more…</Text>
        </View>
      ) : null,
    [refreshing, tc]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🚜</Text>
        <Text style={[styles.emptyText, { color: tc.text }]}>No Equipment Yet</Text>
        <Text style={[styles.emptySubtext, { color: tc.textSecondary }]}>
          Add your first asset to start tracking machinery, tools and their maintenance
        </Text>
        {canWrite && (
          <Button
            title="Add Equipment"
            onPress={() => router.push('/equipment/add')}
            accessibilityLabel="Add your first equipment"
          />
        )}
      </View>
    ),
    [router, canWrite, tc]
  );

  const renderItem = useCallback(
    ({ item }: { item: Equipment }) => {
      const statusColors = EQUIP_STATUS_COLORS[item.status] || { bg: '#F3F4F6', text: '#6B7280' };
      return (
        <Card style={[styles.equipCard, { backgroundColor: tc.card }]}>
          <TouchableOpacity onPress={() => router.push(`/equipment/${item.id}`)} activeOpacity={0.7}>
            <View style={styles.equipCardContent}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 2,
                }}
              >
                <Text style={[styles.equipName, { color: tc.text }]}>{item.name}</Text>
                <View
                  style={{
                    backgroundColor: statusColors.bg,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '600', color: statusColors.text }}>
                    {item.status || '—'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.equipMeta, { color: tc.textSecondary }]}>
                {item.type || 'Equipment'}
                {item.model ? ` · ${item.model}` : ''} ·{' '}
                {item.farmId ? farmNames[item.farmId] || 'Farm' : 'Unassigned'}
              </Text>
              <View style={[styles.equipStats, { borderTopColor: isDark ? tc.surface : '#F5F5F5' }]}>
                <View style={styles.equipStat}>
                  <Text style={[styles.equipStatLabel, { color: tc.textSecondary }]}>Serial</Text>
                  <Text style={styles.equipStatValue}>{item.serialNumber || '—'}</Text>
                </View>
                <View style={styles.equipStat}>
                  <Text style={[styles.equipStatLabel, { color: tc.textSecondary }]}>Cost</Text>
                  <Text style={styles.equipStatValue}>{formatCost(item.purchaseCost)}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
          <View style={[styles.equipActions, { borderTopColor: isDark ? tc.surface : '#F5F5F5' }]}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/equipment/${item.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`View details of ${item.name}`}
            >
              <Text style={[styles.actionButtonText, { color: tc.primary }]}>View Details</Text>
            </TouchableOpacity>
            {canDelete && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteBorderColor]}
                onPress={() => handleDelete(item.id, item.name)}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${item.name}`}
              >
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
      );
    },
    [farmNames, router, handleDelete, canDelete, tc, isDark]
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <MenuButton />
          <Text style={styles.headerTitle}>Equipment</Text>
        </View>
        <ScreenLoading message="Loading equipment…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <MenuButton />
          <Text style={styles.headerTitle}>Equipment</Text>
        </View>
        <StateView
          variant="error"
          title="Couldn't load equipment"
          message={loadError}
          onRetry={fetchEquipment}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <MenuButton />
        <Text style={styles.headerTitle}>Equipment</Text>
        {canWrite && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/equipment/add')}
            accessibilityRole="button"
            accessibilityLabel="Add new equipment"
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <TextInputField
          placeholder="Search equipment…"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          containerStyle={{ marginBottom: 12 }}
          accessibilityLabel="Search equipment"
        />
        <View style={styles.filterContainer}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, statusFilter === f && styles.filterButtonActive, statusFilter === f ? undefined : { backgroundColor: tc.card, borderColor: tc.border }]}
              onPress={() => setStatusFilter(f)}
              accessibilityRole="button"
              accessibilityLabel={
                f === 'all' ? 'Filter all equipment' : `Filter ${f.toLowerCase()} equipment`
              }
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
        data={filteredEquipment}
        keyExtractor={(item) => item.id}
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
