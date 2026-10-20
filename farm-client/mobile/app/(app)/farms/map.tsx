import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useListFarmsQuery } from '@/modules/farm';
import type { Farm } from '@/modules/farm';
import { Card } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { MenuButton } from '@/core/ui/MenuButton';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
import { FARM_TYPE_COLORS, FARM_TYPE_LABELS } from '@/core/farmTypes';
import { useAppTheme } from '@/core/theme/ThemeContext';

type LocatedFarm = Farm & { latitude: number; longitude: number };

function readCoordinate(value: number | undefined, min: number, max: number): number | null {
  if (value == null || !Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

export default function FarmsMapScreen() {
  const router = useRouter();
  const { colors: themeColors } = useAppTheme();
  const { error: showError } = useToasts();
  const { data, isLoading, error, refetch } = useListFarmsQuery({ limit: 200 });

  const farms = useMemo(() => {
    if (!data) return [];
    const rows = Array.isArray(data) ? data : data.farms || data.data || data.items || [];
    if (!Array.isArray(rows)) return [];
    return rows
      .map((farm: Farm) => {
        const latitude = readCoordinate(farm.latitude, -90, 90);
        const longitude = readCoordinate(farm.longitude, -180, 180);
        return latitude == null || longitude == null
          ? null
          : { ...farm, latitude, longitude };
      })
      .filter((farm: LocatedFarm | null): farm is LocatedFarm => farm != null);
  }, [data]);

  const openFarmMap = async (farm: LocatedFarm) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${farm.latitude},${farm.longitude}`;
    try {
      await Linking.openURL(url);
    } catch (openError) {
      showError(describeApiError(openError, `Could not open the map for ${farm.name}.`));
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header />
        <ScreenLoading message="Loading farm locations…" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header />
        <StateView
          variant="error"
          title="Couldn't load farm locations"
          message={describeApiError(error, 'Failed to load farm locations.')}
          onRetry={refetch}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Header />
      <View style={styles.intro}>
        <Text style={[styles.description, { color: themeColors.textSecondary }]}>
          {farms.length
            ? `${farms.length} ${farms.length === 1 ? 'farm has' : 'farms have'} map coordinates. Select a farm to open its location.`
            : 'No farms with map coordinates yet. Add latitude and longitude to a farm to see it here.'}
        </Text>
      </View>
      <FlatList
        data={farms}
        keyExtractor={(farm) => farm.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No mapped farms</Text>
            <Text style={[styles.description, { color: themeColors.textSecondary, textAlign: 'center' }]}>
              Farm locations appear here once their coordinates are saved.
            </Text>
          </View>
        }
        renderItem={({ item: farm }) => {
          const typeColors = FARM_TYPE_COLORS[farm.farmType];
          return (
            <Card style={[styles.card, { backgroundColor: themeColors.card }]}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`View ${farm.name} on map`}
                onPress={() => void openFarmMap(farm)}
              >
                <View style={styles.farmHeading}>
                  <View style={styles.farmCopy}>
                    <Text style={[styles.farmName, { color: themeColors.text }]}>{farm.name}</Text>
                    {!!farm.location && (
                      <Text style={[styles.description, { color: themeColors.textSecondary }]}>
                        {farm.location}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.badge, { backgroundColor: typeColors?.bg || '#F3F4F6' }]}>
                    <Text style={{ color: typeColors?.text || '#6B7280', fontSize: 11, fontWeight: '600' }}>
                      {FARM_TYPE_LABELS[farm.farmType] || farm.farmType}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.coordinates, { color: themeColors.textSecondary }]}>
                  {farm.latitude.toFixed(5)}, {farm.longitude.toFixed(5)}
                </Text>
                <Text style={[styles.openMap, { color: themeColors.primary }]}>Open in Maps ↗</Text>
              </TouchableOpacity>
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}

function Header() {
  const router = useRouter();
  const { colors: themeColors } = useAppTheme();
  return (
    <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Back to farms"
        onPress={() => router.push('/farms')}
      >
        <Text style={styles.back}>‹</Text>
      </TouchableOpacity>
      <MenuButton />
      <Text style={styles.headerTitle}>Farm Map</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  back: { color: '#FFFFFF', fontSize: 32, lineHeight: 34 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', flex: 1 },
  intro: { paddingHorizontal: 16, paddingTop: 16 },
  description: { fontSize: 13, lineHeight: 19 },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  card: { padding: 15 },
  farmHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  farmCopy: { flex: 1 },
  farmName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  coordinates: { fontSize: 12, marginTop: 10 },
  openMap: { fontSize: 14, fontWeight: '700', marginTop: 10 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 8 },
  emptyIcon: { fontSize: 42, marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
});
