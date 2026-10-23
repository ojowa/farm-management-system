import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
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
  const [generating, setGenerating] = useState<string | null>(null);

  const templates = [
    { id: 'farm-summary', title: 'Farm Summary' },
    { id: 'crop-report', title: 'Crop Report' },
    { id: 'livestock-report', title: 'Livestock Report' },
    { id: 'poultry-report', title: 'Poultry Report' },
    { id: 'financial-report', title: 'Financial Report' },
    { id: 'inventory-report', title: 'Inventory Report' },
  ];

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

  const generateReport = async (templateId: string, title: string) => {
    setGenerating(templateId);
    try {
      await reportsAPI.generate(templateId);
      await loadReports();
      Alert.alert('Report generated', `${title} has been generated.`);
    } catch (error) {
      Alert.alert('Could not generate report', describeApiError(error, 'Please try again.'));
    } finally {
      setGenerating(null);
    }
  };

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
        ListHeaderComponent={
          <View style={styles.generateSection}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Generate report</Text>
            <View style={styles.templateGrid}>
              {templates.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  disabled={Boolean(generating)}
                  onPress={() => void generateReport(template.id, template.title)}
                  style={[styles.templateButton, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Generate ${template.title}`}
                >
                  {generating === template.id
                    ? <ActivityIndicator color={themeColors.primary} />
                    : <Text style={[styles.templateText, { color: themeColors.text }]}>{template.title}</Text>}
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Generated reports</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: themeColors.textSecondary }]}>No reports have been generated yet.</Text>
        }
        renderItem={({ item }) => (
          <Card style={[styles.card, { backgroundColor: themeColors.card }]}>
            <View style={styles.row}>
              <Text style={[styles.reportName, { color: themeColors.text }]}>{item.title || 'Untitled report'}</Text>
              {!!item.status && <Text style={[styles.status, { color: themeColors.primary }]}>{item.status}</Text>}
            </View>
            <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
              {String(item.parameters?.templateId || 'Report')} · {formatDate(item.createdAt)}
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
  generateSection: { gap: 10, paddingBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  templateButton: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  templateText: { fontSize: 13, fontWeight: '600' },
});
