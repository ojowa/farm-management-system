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
import { MenuButton } from '@/core/ui/MenuButton';
import { useListCropsQuery } from '@/modules/crop';
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
  seedButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  seedButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  chipRow: { paddingHorizontal: 20, paddingBottom: 4 },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  cropCard: { marginBottom: 12 },
  cropRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cropEmoji: { fontSize: 24 },
  cropName: { fontSize: 16, fontWeight: '700', flex: 1 },
  chevron: { fontSize: 16 },
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

const keyExtractor = (item: any) => item.id;

export default function CropsScreen() {
  const router = useRouter();
  // Land here from a CROP farm's "Related" card as /crops?farmId=<id>.
  const { farmId } = useLocalSearchParams<{ farmId?: string }>();
  const { colors: themeColors, isDark } = useAppTheme();
  const { canCreate } = usePermission();
  const canWrite = canCreate('crop');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isFetching, error, refetch } = useListCropsQuery({
    limit: 100,
    // Forward-compatible farm scoping: today's GET /crops ignores farmId
    // (the crop catalog is organization-wide with no per-farm association),
    // but rows that DO carry a farmId are filtered below.
    ...(farmId ? { farmId } : {}),
  });

  const crops = useMemo(() => {
    if (!data) return [];
    // `crops` is the server's legacy key, `data` the current one; plain
    // arrays pass through untouched.
    const items = Array.isArray(data) ? data : data.crops || data.data || data.items || [];
    return Array.isArray(items) ? items : [];
  }, [data]);

  const filteredCrops = useMemo(
    () => crops.filter((crop: any) => !farmId || !crop.farmId || crop.farmId === farmId),
    [crops, farmId]
  );

  // Only claim the filter when it actually narrowed the list — the current
  // server's crop rows carry no farmId, so the chip stays hidden there.
  const isFarmFiltered = !!farmId && filteredCrops.length < crops.length;

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (refreshing && !isFetching) setRefreshing(false);
  }, [refreshing, isFetching]);

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
      backgroundColor: isDark ? themeColors.surface : '#DCFCE7',
      borderColor: isDark ? themeColors.border : '#86EFAC',
    },
    chipText: {
      color: isDark ? themeColors.textSecondary : '#166534',
    },
    cropName: {
      color: themeColors.text,
    },
    chevron: {
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
      <Text style={styles.emptyIcon}>🌱</Text>
      <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No crops yet</Text>
      <Text style={[styles.emptySubtext, dynamicStyles.emptySubtext]}>
        Add your first crop to start tracking plantings and harvests
      </Text>
      {canWrite && (
        <Button
          title="Add Crop"
          onPress={() => router.push('/crops/add')}
          accessibilityLabel="Add your first crop"
        />
      )}
    </View>
  ), [router, canWrite, dynamicStyles]);

  const renderItem = useCallback(({ item: crop }: { item: any }) => (
    <Card
      style={[styles.cropCard, dynamicStyles.cardBackground]}
      onPress={() => router.push(`/crops/${crop.id}`)}
      accessibilityLabel={`Crop: ${crop.name}`}
    >
      <View style={styles.cropRow}>
        <Text style={styles.cropEmoji}>🌱</Text>
        <Text style={[styles.cropName, dynamicStyles.cropName]} numberOfLines={1}>
          {crop.name}
        </Text>
        <Text style={[styles.chevron, dynamicStyles.chevron]}>→</Text>
      </View>
    </Card>
  ), [router, dynamicStyles]);

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}>
      {/* Tab root: the hamburger opens the navigation sidebar (replaces the old
          "← Back" affordance, which made no sense on a top-level tab). */}
      <MenuButton />
      <Text style={[styles.headerTitle, { flex: 1 }]}>Crops</Text>
      {/* Mirror the admin cycle page: a shortcut to seed a field, since a
          cycle can't be planted without one. */}
      {canCreate('farm') && (
        <TouchableOpacity
          style={styles.seedButton}
          onPress={() => router.push('/farms/add-field')}
          accessibilityRole="button"
          accessibilityLabel="Add Field"
        >
          <Text style={styles.seedButtonText}>+ Field</Text>
        </TouchableOpacity>
      )}
      {canWrite ? (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/crops/add')}
          accessibilityRole="button"
          accessibilityLabel="Add new crop"
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
        <ScreenLoading message="Loading crops…" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        {renderHeader()}
        <StateView
          variant="error"
          title="Couldn't load crops"
          message={describeApiError(error, 'Failed to load crops. Please try again.')}
          onRetry={refetch}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      {renderHeader()}

      {isFarmFiltered && (
        <View style={styles.chipRow}>
          <View style={[styles.chip, dynamicStyles.chip]}>
            <Text style={[styles.chipText, dynamicStyles.chipText]}>Filtered to farm</Text>
          </View>
        </View>
      )}

      <FlatList
        data={filteredCrops}
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
