import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useListLivestockQuery } from '@/store/api';
import { Card, Button } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { describeApiError } from '@/core/utils/apiError';
import { usePermission } from '@/core/hooks/usePermission';
import { useAppTheme } from '@/core/theme/ThemeContext';

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
  backButton: { padding: 8 },
  backButtonText: { color: '#FFFFFF', fontSize: 16 },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  chipRow: { paddingHorizontal: 20, paddingBottom: 4 },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  animalCard: { marginBottom: 12, overflow: 'hidden' },
  animalRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  animalEmoji: { fontSize: 24 },
  animalText: { flex: 1 },
  animalName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  animalMeta: { fontSize: 13 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600' },
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
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
});

// Local badge palette, mirroring the pond-status pattern from
// aquaculture/index.tsx (kept local rather than in the shared farmTypes file).
const LIVESTOCK_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  HEALTHY: { bg: '#DCFCE7', text: '#166534' },
  SICK: { bg: '#FEF3C7', text: '#92400E' },
  SOLD: { bg: '#DBEAFE', text: '#1E40AF' },
  DECEASED: { bg: '#F3F4F6', text: '#6B7280' },
};

const keyExtractor = (item: any) => item.id;

const formatBirthDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
};

export default function LivestockScreen() {
  const router = useRouter();
  // Land here from a LIVESTOCK/DAIRY farm's "Related" card as
  // /livestock?farmId=<id> — GET /livestock filters by farmId server-side.
  const { farmId } = useLocalSearchParams<{ farmId?: string }>();
  const { colors: themeColors, isDark } = useAppTheme();
  const { canCreate } = usePermission();
  const canWrite = canCreate('livestock');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isFetching, error, refetch } = useListLivestockQuery({
    limit: 100,
    ...(farmId ? { farmId } : {}),
  });

  const animals = useMemo(() => {
    if (!data) return [];
    // `livestock` is the server's legacy key, `data` the current one; plain
    // arrays pass through untouched.
    const items = Array.isArray(data) ? data : data.livestock || data.data || data.items || [];
    return Array.isArray(items) ? items : [];
  }, [data]);

  useEffect(() => {
    if (refreshing && !isFetching) setRefreshing(false);
  }, [refreshing, isFetching]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
  }, [refetch]);

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
    chip: {
      backgroundColor: isDark ? themeColors.surface : '#FEF3C7',
      borderColor: isDark ? themeColors.border : '#FCD34D',
    },
    chipText: {
      color: isDark ? themeColors.textSecondary : '#92400E',
    },
    animalName: {
      color: themeColors.text,
    },
    animalMeta: {
      color: themeColors.textSecondary,
    },
    emptyText: {
      color: themeColors.text,
    },
    emptySubtext: {
      color: themeColors.textSecondary,
    },
  }), [themeColors, isDark]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🐄</Text>
      <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No livestock yet</Text>
      <Text style={[styles.emptySubtext, dynamicStyles.emptySubtext]}>
        Add your first animal to start tracking health, weight and vaccinations
      </Text>
      {canWrite && (
        <Button
          title="Add Animal"
          onPress={() => router.push('/livestock/add')}
          accessibilityLabel="Add your first animal"
        />
      )}
    </View>
  ), [router, canWrite, dynamicStyles]);

  const renderItem = useCallback(({ item: animal }: { item: any }) => {
    const status = String(animal?.status || '').toUpperCase();
    const statusColors = LIVESTOCK_STATUS_COLORS[status];
    const meta = [
      animal?.breed,
      animal?.gender ? String(animal.gender).toLowerCase() : null,
      formatBirthDate(animal?.birthDate),
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <Card
        style={[styles.animalCard, dynamicStyles.cardBackground]}
        onPress={() => router.push(`/livestock/${animal.id}`)}
        accessibilityLabel={`Animal: ${animal.species}`}
      >
        <View style={styles.animalRow}>
          <Text style={styles.animalEmoji}>🐄</Text>
          <View style={styles.animalText}>
            <Text style={[styles.animalName, dynamicStyles.animalName]} numberOfLines={1}>
              {animal.species}
            </Text>
            {meta ? (
              <Text style={[styles.animalMeta, dynamicStyles.animalMeta]} numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
          </View>
          {statusColors && (
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>{status}</Text>
            </View>
          )}
        </View>
      </Card>
    );
  }, [router, dynamicStyles]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Livestock</Text>
      {canWrite ? (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/livestock/add')}
          accessibilityRole="button"
          accessibilityLabel="Add new animal"
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 60 }} />
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        {renderHeader()}
        <ScreenLoading message="Loading livestock…" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        {renderHeader()}
        <StateView
          variant="error"
          title="Couldn't load livestock"
          message={describeApiError(error, 'Failed to load livestock. Please try again.')}
          onRetry={refetch}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      {renderHeader()}

      {!!farmId && (
        <View style={styles.chipRow}>
          <View style={[styles.chip, dynamicStyles.chip]}>
            <Text style={[styles.chipText, dynamicStyles.chipText]}>Filtered to farm</Text>
          </View>
        </View>
      )}

      <FlatList
        data={animals}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        renderItem={renderItem}
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
