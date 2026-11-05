import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MenuButton } from '@/core/ui/MenuButton';
import { profitabilityAPI } from '@/modules/finance';
import { Card } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { describeApiError } from '@/core/utils/apiError';
import { formatCurrencyFixedWithCode } from '@/core/utils/currency';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { useAppSelector } from '@/modules/auth/hooks/useAuth';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { colors: themeColors } = useAppTheme();
  const currency = useAppSelector((state) => state.auth.currency || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [byFarm, setByFarm] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [summaryRes, byFarmRes] = await Promise.all([
        profitabilityAPI.summary(),
        profitabilityAPI.byFarm(),
      ]);
      setSummary(summaryRes.data || summaryRes);
      setByFarm(Array.isArray(byFarmRes.data) ? byFarmRes.data : []);
    } catch (e: any) {
      setError(describeApiError(e, 'Could not load analytics.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading) return <ScreenLoading message="Loading analytics…" />;
  if (error) return <StateView variant="error" title="Couldn't load analytics" message={error} onRetry={load} />;

  const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 },
    headerCopy: { flex: 1 },
    title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
    subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 3 },
    content: { padding: 16, paddingBottom: 30, gap: 12 },
    card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, elevation: 2, shadowColor: '#000000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    description: { fontSize: 13 },
    summaryGrid: { flexDirection: 'row', gap: 8 },
    summaryCard: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: themeColors.border || '#E0E0E0' },
    summaryLabel: { fontSize: 11, fontWeight: '600', color: themeColors.textSecondary, marginBottom: 4 },
    summaryValue: { fontSize: 20, fontWeight: '700' },
    farmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 8 },
    farmInfo: { flex: 1 },
    farmName: { fontSize: 15, fontWeight: '600' },
    farmValue: { fontSize: 12, color: themeColors.textSecondary },
    farmAmount: { alignItems: 'flex-end' },
    farmAmountText: { fontSize: 16, fontWeight: '700' },
    farmAmountSub: { fontSize: 11, color: themeColors.textSecondary },
    emptyText: { fontSize: 16, color: themeColors.textSecondary, textAlign: 'center' },
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}>
        <MenuButton />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.subtitle}>Farm performance and profitability</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>Profitability Summary</Text>
            <Text style={[styles.description, { color: themeColors.textSecondary }]}>Revenue, expenses, and net profit</Text>
          </View>
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, { backgroundColor: themeColors.card }]}>
              <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>Total Revenue</Text>
              <Text style={[styles.summaryValue, { color: themeColors.text }]}>{formatCurrencyFixedWithCode(summary?.totalRevenue || 0, currency)}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: themeColors.card }]}>
              <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>Total Expenses</Text>
              <Text style={[styles.summaryValue, { color: themeColors.text }]}>{formatCurrencyFixedWithCode(summary?.totalExpenses || 0, currency)}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: themeColors.card }]}>
              <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>Net Profit</Text>
              <Text style={[styles.summaryValue, { color: summary?.netProfit && summary.netProfit >= 0 ? themeColors.success : themeColors.error }]}>{formatCurrencyFixedWithCode(summary?.netProfit || 0, currency)}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>Profitability by Farm</Text>
            <Text style={[styles.description, { color: themeColors.textSecondary }]}>Profit breakdown per farm</Text>
          </View>
          {byFarm.length === 0 ? (
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No farm data available</Text>
          ) : (
            byFarm.map((farm) => (
              <TouchableOpacity key={farm.id} style={[styles.farmRow, { backgroundColor: themeColors.card }]} accessibilityRole="button" accessibilityLabel={farm.farmName || farm.name || 'Farm'}>
                <View style={styles.farmInfo}>
                  <Text style={[styles.farmName, { color: themeColors.text }]}>{farm.farmName || farm.name || 'Unnamed Farm'}</Text>
                  <Text style={[styles.farmValue, { color: themeColors.textSecondary }]}>{farm.cropCount || 0} crops • {farm.animalCount || 0} animals</Text>
                </View>
                <View style={styles.farmAmount}>
                  <Text style={[styles.farmAmountText, { color: themeColors.text }]}>{formatCurrencyFixedWithCode(farm.netProfit || 0, currency)}</Text>
                  <Text style={[styles.farmAmountSub, { color: themeColors.textSecondary }]}>Net Profit</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
