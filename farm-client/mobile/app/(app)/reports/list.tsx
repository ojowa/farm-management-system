import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { reportsAPI } from '@/modules/reporting';
import type { Report } from '@/modules/reporting';
import { unwrapList } from '@/core/utils/listPayload';
import { Card } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { MenuButton } from '@/core/ui/MenuButton';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';

function formatDate(value?: string): string {
  if (!value) return 'Date not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export default function ReportsListScreen() {
  const router = useRouter();
  const { colors: themeColors } = useAppTheme();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    try {
      setLoadError(null);
      const response = await reportsAPI.list({ limit: 50 });
      setReports(unwrapList<Report>(response.data));
    } catch (error) {
      setLoadError(describeApiError(error, 'Failed to load reports.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header />
        <ScreenLoading message="Loading reports…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header />
        <StateView
          variant="error"
          title="Couldn't load reports"
          message={loadError}
          onRetry={() => void loadReports()}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Header />
      <FlatList
        data={reports}
        keyExtractor={(report) => report.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadReports();
            }}
            tintColor={themeColors.primary}
          />
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: themeColors.textSecondary }]}>No reports have been generated yet.</Text>
        }
        renderItem={({ item }) => (
          <Card style={[styles.card, { backgroundColor: themeColors.card }]}>
            <View style={styles.row}>
              <Text style={[styles.reportName, { color: themeColors.text }]}>{item.name || 'Untitled report'}</Text>
              {!!item.status && <Text style={[styles.status, { color: themeColors.primary }]}>{item.status}</Text>}
            </View>
            <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
              {item.type || 'Report'} · {formatDate(item.generatedAt || item.createdAt)}
            </Text>
          </Card>
        )}
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
        accessibilityLabel="Back to reports"
        onPress={() => router.push('/reports')}
      >
        <Text style={styles.back}>‹</Text>
      </TouchableOpacity>
      <MenuButton />
      <Text style={styles.headerTitle}>Reports</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  back: { color: '#FFFFFF', fontSize: 32, lineHeight: 34 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', flex: 1 },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  card: { padding: 15 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  reportName: { fontSize: 16, fontWeight: '700', flex: 1 },
  status: { fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 6 },
  empty: { textAlign: 'center', paddingVertical: 40 },
});
