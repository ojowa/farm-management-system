import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
import { workersAPI } from '@/modules/hr';
import type { Worker } from '@/modules/hr';
import { farmsAPI } from '@/modules/farm';
import { Card, Button, TextInputField, colors } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
import { MenuButton } from '@/core/ui/MenuButton';
import { useAppTheme } from '@/core/theme/ThemeContext';

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
  workerCard: { marginBottom: 12, overflow: 'hidden' },
  workerCardContent: { paddingBottom: 0 },
  workerName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  workerMeta: { fontSize: 13, color: colors.textLight, marginBottom: 12 },
  workerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  workerStat: { alignItems: 'center', flex: 1 },
  workerStatLabel: { fontSize: 11, color: colors.textLight, marginBottom: 4 },
  workerStatValue: { fontSize: 13, fontWeight: '700', color: colors.primary },
  workerActions: {
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

const WORKER_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: '#DCFCE7', text: '#166534' },
  INACTIVE: { bg: '#F3F4F6', text: '#6B7280' },
  PROBATION: { bg: '#FEF3C7', text: '#92400E' },
  TERMINATED: { bg: '#FEE2E2', text: '#991B1B' },
};

// WorkerStatus is ACTIVE | INACTIVE | PROBATION | TERMINATED — there is no
// ON_LEAVE member (leave lives on LeaveRequest), so never filter on it.
const STATUS_FILTERS = ['all', 'ACTIVE', 'INACTIVE', 'PROBATION', 'TERMINATED'] as const;
type WorkerStatusFilter = (typeof STATUS_FILTERS)[number];

// The server caps `limit` at 100 — asking for 200 silently returned only the
// first 100 workers. Page through at 50 instead and offer load-more.
const PAGE_SIZE = 50;

/** The workers endpoint returns either a bare array or a `{ data: [...] }` page
 * envelope depending on the caller; unwrap both so a shape change can never
 * blank the list into a false "empty" state. */
function unwrapList<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

const fullName = (w: Worker) => [w.firstName, w.middleName, w.lastName].filter(Boolean).join(' ');

export default function WorkersScreen() {
  const router = useRouter();
  const { success, error: showError } = useToasts();
  const { hasPermission } = usePermission();
  const { colors: tc, isDark } = useAppTheme();

  // Worker actions mirror the server's HR controller: hr.write creates/edits,
  // hr.delete removes. Missing permissions default to hidden — the API would 403.
  const canWrite = hasPermission('hr.write');
  const canDelete = hasPermission('hr.delete');

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [farmsList, setFarmsList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkerStatusFilter>('all');
  const [farmFilter, setFarmFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Server-side filters the loader reads — a ref so callbacks captured by
  // earlier renders (pull-to-refresh, delete) never act on stale filter values.
  const filtersRef = useRef({ search: '', status: 'all', farmId: 'all', department: 'all' });
  filtersRef.current = {
    search: debouncedSearch,
    status: statusFilter,
    farmId: farmFilter,
    department: departmentFilter,
  };
  const hasLoadedRef = useRef(false);

  const farmNames = useMemo(
    () =>
      farmsList.reduce((acc: Record<string, string>, f) => {
        acc[f.id] = f.name;
        return acc;
      }, {}),
    [farmsList]
  );

  const dynamicStyles = {
    container: {
      backgroundColor: tc.background,
    },
    cardBackground: {
      backgroundColor: tc.card,
      borderColor: isDark ? tc.border : 'transparent',
      borderWidth: isDark ? 1 : 0,
    },
    emptyText: {
      color: tc.text,
    },
    emptySubtext: {
      color: tc.textSecondary,
    },
    filterButton: {
      backgroundColor: tc.card,
      borderColor: tc.border,
    },
    filterButtonText: {
      color: tc.textSecondary,
    },
    workerName: {
      color: tc.text,
    },
    workerMeta: {
      color: tc.textSecondary,
    },
    divider: {
      borderTopColor: isDark ? tc.border : colors.light,
    },
    workerStatLabel: {
      color: tc.textSecondary,
    },
    footerText: {
      color: tc.textSecondary,
    },
  };

  /**
   * Load a page of workers with the current server-side filters
   * (search/status/farmId/department — the endpoint supports all four).
   * `append` pages forward; everything else restarts at page 1.
   */
  const fetchWorkers = async (targetPage = 1, append = false) => {
    const filters = filtersRef.current;
    if (append) setLoadingMore(true);
    else if (!hasLoadedRef.current) setLoading(true);
    else setRefreshing(true);
    try {
      setLoadError(null);
      const response = await workersAPI.list({
        page: targetPage,
        limit: PAGE_SIZE,
        search: filters.search || undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        farmId: filters.farmId !== 'all' ? filters.farmId : undefined,
        department: filters.department !== 'all' ? filters.department : undefined,
      });
      const payload = response.data;
      const rows = unwrapList<Worker>(payload);
      const pages = Number(payload?.totalPages);
      setTotalPages(Number.isFinite(pages) && pages > 0 ? pages : 1);
      setPage(targetPage);
      setWorkers((prev) => (append ? [...prev, ...rows] : rows));
    } catch (error: any) {
      // A failed load-more must not wipe the rows already on screen.
      if (append) showError(describeApiError(error, 'Failed to load more workers.'));
      else setLoadError(describeApiError(error, 'Failed to load workers.'));
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const fetchFarms = async () => {
    try {
      const response = await farmsAPI.list();
      setFarmsList(unwrapList<{ id: string; name: string }>(response.data));
    } catch {
      /* ignore — cards fall back to the farm id */
    }
  };

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchFarms();
  }, []);

  // Any filter change restarts pagination from page 1.
  useEffect(() => {
    fetchWorkers(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, farmFilter, departmentFilter]);

  const filteredWorkers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workers.filter((worker) => {
      if (statusFilter !== 'all' && worker.status !== statusFilter) return false;
      if (query) {
        const haystack = `${fullName(worker)} ${worker.position} ${worker.department ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [workers, statusFilter, search]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWorkers(1, false);
  };

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    statusFilter !== 'all' ||
    farmFilter !== 'all' ||
    departmentFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setFarmFilter('all');
    setDepartmentFilter('all');
  };

  // Server-side department values seen so far (departments are free text on
  // the worker form — derive the chips from what the API has returned).
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    workers.forEach((w) => {
      if (w.department) set.add(w.department);
    });
    if (departmentFilter !== 'all') set.add(departmentFilter);
    return Array.from(set).sort();
  }, [workers, departmentFilter]);

  const handleDeleteWorker = useCallback(
    (workerId: string, name: string) => {
      Alert.alert(
        'Delete Worker',
        `Are you sure you want to delete ${name}? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await workersAPI.delete(workerId);
                success('Worker deleted successfully');
                fetchWorkers(1, false);
              } catch (error: any) {
                showError(describeApiError(error, 'Failed to delete worker.'));
              }
            },
          },
        ]
      );
    },
    [success, showError]
  );

  const hasMore = page < totalPages;

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchWorkers(page + 1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, hasMore, page]);

  // Only show the spinner for an actual page fetch — the old footer keyed off
  // `refreshing`, so pull-to-refresh displayed a bogus "Loading more…".
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={tc.primary} />
        <Text style={[{ fontSize: 12, color: colors.textLight }, dynamicStyles.footerText]}>Loading more…</Text>
      </View>
    );
  }, [loadingMore, tc.primary, dynamicStyles]);

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>{hasActiveFilters ? '🔍' : '👷'}</Text>
        <Text style={[styles.emptyText, dynamicStyles.emptyText]}>
          {hasActiveFilters ? 'No Workers Match' : 'No Workers Yet'}
        </Text>
        <Text style={[styles.emptySubtext, dynamicStyles.emptySubtext]}>
          {hasActiveFilters
            ? 'Try different search terms or clear the filters above'
            : 'Add your first worker to start tracking your farm team, roles and attendance'}
        </Text>
        {hasActiveFilters ? (
          <Button
            title="Clear Filters"
            variant="secondary"
            onPress={clearFilters}
            accessibilityLabel="Clear worker filters"
          />
        ) : (
          canWrite && (
            <Button
              title="Add Worker"
              onPress={() => router.push('/workers/add')}
              accessibilityLabel="Add your first worker"
            />
          )
        )}
      </View>
    ),
    [router, canWrite, hasActiveFilters, clearFilters, dynamicStyles]
  );

  const renderItem = useCallback(
    ({ item: worker }: { item: Worker }) => {
      const statusColors = WORKER_STATUS_COLORS[worker.status] || { bg: '#F3F4F6', text: '#6B7280' };
      return (
        <Card style={[styles.workerCard, dynamicStyles.cardBackground]}>
          <TouchableOpacity onPress={() => router.push(`/workers/${worker.id}`)} activeOpacity={0.7}>
            <View style={styles.workerCardContent}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 2,
                }}
              >
                <Text style={[styles.workerName, dynamicStyles.workerName]}>{fullName(worker)}</Text>
                <View
                  style={{
                    backgroundColor: statusColors.bg,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '600', color: statusColors.text }}>
                    {worker.status || '—'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.workerMeta, dynamicStyles.workerMeta]}>
                {worker.position || 'Worker'}
                {worker.department ? ` · ${worker.department}` : ''} ·{' '}
                {farmNames[worker.farmId] || 'Farm'}
              </Text>
              <View style={[styles.workerStats, dynamicStyles.divider]}>
                <View style={styles.workerStat}>
                  <Text style={[styles.workerStatLabel, dynamicStyles.workerStatLabel]}>Phone</Text>
                  <Text style={styles.workerStatValue}>{worker.phone || '—'}</Text>
                </View>
                <View style={styles.workerStat}>
                  <Text style={[styles.workerStatLabel, dynamicStyles.workerStatLabel]}>Hired</Text>
                  <Text style={styles.workerStatValue}>
                    {worker.hireDate ? new Date(worker.hireDate).toLocaleDateString() : '—'}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
          <View style={[styles.workerActions, dynamicStyles.divider]}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/workers/${worker.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`View details of ${fullName(worker)}`}
            >
              <Text style={[styles.actionButtonText, { color: tc.primary }]}>View Details</Text>
            </TouchableOpacity>
            {canDelete && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteBorderColor]}
                onPress={() => handleDeleteWorker(worker.id, fullName(worker))}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${fullName(worker)}`}
              >
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
      );
    },
    [farmNames, router, handleDeleteWorker, canDelete, dynamicStyles]
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <MenuButton />
          <Text style={styles.headerTitle}>Workers</Text>
        </View>
        <ScreenLoading message="Loading workers…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <MenuButton />
          <Text style={styles.headerTitle}>Workers</Text>
        </View>
        <StateView
          variant="error"
          title="Couldn't load workers"
          message={loadError}
          onRetry={() => fetchWorkers(1, false)}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <MenuButton />
        <Text style={styles.headerTitle}>Workers</Text>
        {canWrite && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/workers/add')}
            accessibilityRole="button"
            accessibilityLabel="Add new worker"
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <TextInputField
          placeholder="Search workers…"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          containerStyle={{ marginBottom: 12 }}
          accessibilityLabel="Search workers"
        />
        <View style={styles.filterContainer}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterButton,
                dynamicStyles.filterButton,
                statusFilter === f && styles.filterButtonActive,
              ]}
              onPress={() => setStatusFilter(f)}
              accessibilityRole="button"
              accessibilityLabel={f === 'all' ? 'Filter all workers' : `Filter ${f.toLowerCase()} workers`}
              accessibilityState={{ selected: statusFilter === f }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  dynamicStyles.filterButtonText,
                  statusFilter === f && styles.filterButtonTextActive,
                ]}
              >
                {f === 'all' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase().replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {farmsList.length > 0 && (
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                dynamicStyles.filterButton,
                farmFilter === 'all' && styles.filterButtonActive,
              ]}
              onPress={() => setFarmFilter('all')}
              accessibilityRole="button"
              accessibilityLabel="All farms"
              accessibilityState={{ selected: farmFilter === 'all' }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  dynamicStyles.filterButtonText,
                  farmFilter === 'all' && styles.filterButtonTextActive,
                ]}
              >
                All farms
              </Text>
            </TouchableOpacity>
            {farmsList.map((farm) => {
              const active = farmFilter === farm.id;
              return (
                <TouchableOpacity
                  key={farm.id}
                  style={[styles.filterButton, dynamicStyles.filterButton, active && styles.filterButtonActive]}
                  onPress={() => setFarmFilter(active ? 'all' : farm.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by farm ${farm.name}`}
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      dynamicStyles.filterButtonText,
                      active && styles.filterButtonTextActive,
                    ]}
                  >
                    {farm.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {departmentOptions.length > 0 && (
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                dynamicStyles.filterButton,
                departmentFilter === 'all' && styles.filterButtonActive,
              ]}
              onPress={() => setDepartmentFilter('all')}
              accessibilityRole="button"
              accessibilityLabel="All departments"
              accessibilityState={{ selected: departmentFilter === 'all' }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  dynamicStyles.filterButtonText,
                  departmentFilter === 'all' && styles.filterButtonTextActive,
                ]}
              >
                All depts
              </Text>
            </TouchableOpacity>
            {departmentOptions.map((dept) => {
              const active = departmentFilter === dept;
              return (
                <TouchableOpacity
                  key={dept}
                  style={[styles.filterButton, dynamicStyles.filterButton, active && styles.filterButtonActive]}
                  onPress={() => setDepartmentFilter(active ? 'all' : dept)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by department ${dept}`}
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      dynamicStyles.filterButtonText,
                      active && styles.filterButtonTextActive,
                    ]}
                  >
                    {dept}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <FlatList
        data={filteredWorkers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </SafeAreaView>
  );
}
