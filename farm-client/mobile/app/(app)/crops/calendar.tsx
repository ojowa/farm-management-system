import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { cropStagesAPI } from '@/modules/crop';
import type { CropStage } from '@/modules/crop';
import { unwrapList } from '@/core/utils/listPayload';
import { Card } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { MenuButton } from '@/core/ui/MenuButton';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';

interface CalendarStage extends CropStage {
  crop?: { name?: string } | null;
  cropName?: string;
  stageName?: string;
  farmName?: string;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatDate(value?: string): string {
  if (!value) return 'Date not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export default function CropCalendarScreen() {
  const router = useRouter();
  const { farmId } = useLocalSearchParams<{ farmId?: string }>();
  const { colors: themeColors } = useAppTheme();
  const [month, setMonth] = useState(() => new Date());
  const [stages, setStages] = useState<CalendarStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadStages = useCallback(async () => {
    try {
      setLoadError(null);
      const response = await cropStagesAPI.calendar({
        month: monthKey(month),
        ...(farmId ? { farmId } : {}),
      });
      setStages(unwrapList<CalendarStage>(response.data));
    } catch (error) {
      setLoadError(describeApiError(error, 'Failed to load the crop calendar.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [farmId, month]);

  useEffect(() => {
    void loadStages();
  }, [loadStages]);

  const monthTitle = useMemo(
    () => month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    [month]
  );

  const changeMonth = (offset: number) => {
    setLoading(true);
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header title="Calendar" />
        <ScreenLoading message="Loading crop calendar…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header title="Calendar" />
        <StateView
          variant="error"
          title="Couldn't load the crop calendar"
          message={loadError}
          onRetry={() => void loadStages()}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  const orderedStages = [...stages].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Header title="Calendar" />
      <View style={styles.monthBar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => changeMonth(-1)}
          style={styles.monthButton}
        >
          <Text style={[styles.monthArrow, { color: themeColors.primary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: themeColors.text }]}>{monthTitle}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => changeMonth(1)}
          style={styles.monthButton}
        >
          <Text style={[styles.monthArrow, { color: themeColors.primary }]}>›</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={orderedStages}
        keyExtractor={(stage) => stage.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadStages();
            }}
            tintColor={themeColors.primary}
          />
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: themeColors.textSecondary }]}>
            No crop stages scheduled for this month.
          </Text>
        }
        renderItem={({ item }) => (
          <Card style={[styles.card, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.stageTitle, { color: themeColors.text }]}>
              {item.cropName || item.crop?.name || 'Crop'} · {item.stageName || item.name}
            </Text>
            <Text style={[styles.details, { color: themeColors.textSecondary }]}>
              {formatDate(item.startDate)} – {formatDate(item.endDate)}
            </Text>
            {!!item.farmName && (
              <Text style={[styles.details, { color: themeColors.textSecondary }]}>{item.farmName}</Text>
            )}
            {!!item.notes && <Text style={[styles.notes, { color: themeColors.text }]}>{item.notes}</Text>}
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

function Header({ title }: { title: string }) {
  const router = useRouter();
  const { farmId } = useLocalSearchParams<{ farmId?: string }>();
  const { colors: themeColors } = useAppTheme();
  return (
    <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Back to crops"
        onPress={() =>
          router.push(farmId ? (`/crops?farmId=${encodeURIComponent(farmId)}` as never) : '/crops')
        }
      >
        <Text style={styles.back}>‹</Text>
      </TouchableOpacity>
      <MenuButton />
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  back: { color: '#FFFFFF', fontSize: 32, lineHeight: 34 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', flex: 1 },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  monthButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  monthArrow: { fontSize: 34, lineHeight: 38 },
  monthTitle: { fontSize: 17, fontWeight: '700' },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  card: { padding: 15 },
  stageTitle: { fontSize: 16, fontWeight: '700' },
  details: { fontSize: 13, marginTop: 5 },
  notes: { fontSize: 14, marginTop: 8 },
  empty: { textAlign: 'center', paddingVertical: 40 },
});
