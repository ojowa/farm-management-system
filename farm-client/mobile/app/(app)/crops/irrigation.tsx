import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { irrigationAPI } from '@/modules/crop';
import { unwrapList } from '@/core/utils/listPayload';
import { Card } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { MenuButton } from '@/core/ui/MenuButton';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';

interface IrrigationSchedule {
  id: string;
  name?: string;
  cropName?: string;
  frequency?: string;
  duration?: number;
  waterAmount?: number;
  unit?: string;
  startTime?: string;
  startDate?: string;
  isActive?: boolean;
  status?: string;
  lastRun?: string;
}

interface IrrigationLog {
  id: string;
  scheduleName?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  volumeUsed?: number;
  notes?: string;
}

function formatDate(value?: string): string {
  if (!value) return 'Date not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function CropIrrigationScreen() {
  const router = useRouter();
  const { farmId } = useLocalSearchParams<{ farmId?: string }>();
  const { colors: themeColors } = useAppTheme();
  const [schedules, setSchedules] = useState<IrrigationSchedule[]>([]);
  const [logs, setLogs] = useState<IrrigationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadIrrigation = useCallback(async () => {
    try {
      setLoadError(null);
      const params = farmId ? { farmId } : undefined;
      const [scheduleResponse, logResponse] = await Promise.all([
        irrigationAPI.listSchedules(params),
        irrigationAPI.listLogs(params),
      ]);
      setSchedules(unwrapList<IrrigationSchedule>(scheduleResponse.data));
      setLogs(unwrapList<IrrigationLog>(logResponse.data));
    } catch (error) {
      setLoadError(describeApiError(error, 'Failed to load irrigation schedules and logs.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [farmId]);

  useEffect(() => {
    void loadIrrigation();
  }, [loadIrrigation]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header />
        <ScreenLoading message="Loading irrigation…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header />
        <StateView
          variant="error"
          title="Couldn't load irrigation"
          message={loadError}
          onRetry={() => void loadIrrigation()}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Header />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadIrrigation();
            }}
            tintColor={themeColors.primary}
          />
        }
      >
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Schedules</Text>
        {schedules.length === 0 ? (
          <Text style={[styles.empty, { color: themeColors.textSecondary }]}>No irrigation schedules found.</Text>
        ) : (
          schedules.map((schedule) => (
            <Card key={schedule.id} style={[styles.card, { backgroundColor: themeColors.card }]}>
              <View style={styles.heading}>
                <Text style={[styles.recordTitle, { color: themeColors.text }]}>
                  {schedule.name || schedule.cropName || 'Irrigation schedule'}
                </Text>
                <Text style={[styles.status, { color: schedule.isActive === false ? themeColors.textSecondary : themeColors.primary }]}>
                  {schedule.isActive === false ? 'Inactive' : schedule.status || 'Active'}
                </Text>
              </View>
              {!!schedule.cropName && schedule.name && (
                <Text style={[styles.meta, { color: themeColors.textSecondary }]}>Crop: {schedule.cropName}</Text>
              )}
              {!!schedule.frequency && (
                <Text style={[styles.meta, { color: themeColors.textSecondary }]}>Frequency: {schedule.frequency}</Text>
              )}
              {schedule.duration != null && (
                <Text style={[styles.meta, { color: themeColors.textSecondary }]}>Duration: {schedule.duration} min</Text>
              )}
              {schedule.waterAmount != null && (
                <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
                  Water: {schedule.waterAmount} {schedule.unit || 'L'}
                </Text>
              )}
              {!!(schedule.lastRun || schedule.startTime || schedule.startDate) && (
                <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
                  {schedule.lastRun ? 'Last run' : 'Starts'}: {formatDate(schedule.lastRun || schedule.startTime || schedule.startDate)}
                </Text>
              )}
            </Card>
          ))
        )}

        <Text style={[styles.sectionTitle, styles.logsTitle, { color: themeColors.text }]}>Recent irrigation logs</Text>
        {logs.length === 0 ? (
          <Text style={[styles.empty, { color: themeColors.textSecondary }]}>No irrigation logs found.</Text>
        ) : (
          logs.map((log) => (
            <Card key={log.id} style={[styles.card, { backgroundColor: themeColors.card }]}>
              <View style={styles.heading}>
                <Text style={[styles.recordTitle, { color: themeColors.text }]}>
                  {log.scheduleName || 'Irrigation run'}
                </Text>
                {!!log.status && <Text style={[styles.status, { color: themeColors.primary }]}>{log.status}</Text>}
              </View>
              <Text style={[styles.meta, { color: themeColors.textSecondary }]}>{formatDate(log.startTime)}</Text>
              {log.volumeUsed != null && (
                <Text style={[styles.meta, { color: themeColors.textSecondary }]}>Water used: {log.volumeUsed} L</Text>
              )}
              {!!log.notes && <Text style={[styles.meta, { color: themeColors.textSecondary }]}>{log.notes}</Text>}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header() {
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
      <Text style={styles.headerTitle}>Irrigation</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  back: { color: '#FFFFFF', fontSize: 32, lineHeight: 34 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', flex: 1 },
  content: { padding: 16, paddingBottom: 28, flexGrow: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10 },
  logsTitle: { marginTop: 22 },
  card: { padding: 15, marginBottom: 10 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  recordTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  status: { fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 5 },
  empty: { textAlign: 'center', paddingVertical: 20 },
});
