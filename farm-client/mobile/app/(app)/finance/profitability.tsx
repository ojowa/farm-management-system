import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, colors } from '../../../src/core/ui/UIComponents';
import { financeAPI, farmsAPI } from '../../../src/services/api';
import { formatCurrencyValue } from '../../../src/core/utils/currency';

export default function ProfitabilityScreen() {
  const [farms, setFarms] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [farmsRes, expensesRes, salesRes] = await Promise.allSettled([
        farmsAPI.list(),
        financeAPI.listExpenses(),
        financeAPI.listSales(),
      ]);

      const farmsList = farmsRes.status === 'fulfilled' ? (farmsRes.value?.data || []) : [];
      const expensesList = expensesRes.status === 'fulfilled' ? (expensesRes.value?.data || []) : [];
      const salesList = salesRes.status === 'fulfilled' ? (salesRes.value?.data || []) : [];

      const farmMap: Record<string, { name: string; revenue: number; expenses: number }> = {};
      farmsList.forEach((f: any) => {
        farmMap[f.id] = { name: f.name, revenue: 0, expenses: 0 };
      });

      salesList.forEach((s: any) => {
        const farmId = s.farmId;
        if (farmId && farmMap[farmId]) {
          farmMap[farmId].revenue += Number(s.amount || s.totalPrice) || 0;
        }
      });

      expensesList.forEach((e: any) => {
        const farmId = e.farmId;
        if (farmId && farmMap[farmId]) {
          farmMap[farmId].expenses += Number(e.amount) || 0;
        }
      });

      const farmProfits = Object.entries(farmMap).map(([farmId, data]) => ({
        farmId,
        farmName: data.name,
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.revenue - data.expenses,
      }));

      const rev = farmProfits.reduce((s, f) => s + f.revenue, 0);
      const exp = farmProfits.reduce((s, f) => s + f.expenses, 0);

      setFarms(farmProfits);
      setTotalRevenue(rev);
      setTotalExpenses(exp);
      setTotalProfit(rev - exp);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const formatCurrency = (amount: number) => formatCurrencyValue(amount);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profitability</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profitability</Text>
        <Text style={styles.headerSubtext}>Revenue, expenses, and profit overview</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Revenue</Text>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>{formatCurrency(totalRevenue)}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Expenses</Text>
            <Text style={[styles.statValue, { color: '#F44336' }]}>{formatCurrency(totalExpenses)}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Profit</Text>
            <Text style={[styles.statValue, { color: totalProfit >= 0 ? '#4CAF50' : '#F44336' }]}>
              {formatCurrency(totalProfit)}
            </Text>
          </Card>
        </View>

        <Text style={styles.sectionTitle}>Farm Breakdown</Text>

        {farms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No farm data</Text>
            <Text style={styles.emptySubtext}>Add farms and transactions to see profitability</Text>
          </View>
        ) : (
          farms.map((farm) => (
            <Card key={farm.farmId} style={styles.farmCard}>
              <View style={styles.farmHeader}>
                <Text style={styles.farmName}>{farm.farmName}</Text>
                <View style={[styles.profitBadge, { backgroundColor: farm.profit >= 0 ? '#4CAF50' : '#F44336' }]}>
                  <Text style={styles.profitText}>{formatCurrency(farm.profit)}</Text>
                </View>
              </View>
              <View style={styles.farmRow}>
                <Text style={styles.farmLabel}>Revenue</Text>
                <Text style={[styles.farmValue, { color: '#4CAF50' }]}>{formatCurrency(farm.revenue)}</Text>
              </View>
              <View style={styles.farmRow}>
                <Text style={styles.farmLabel}>Expenses</Text>
                <Text style={[styles.farmValue, { color: '#F44336' }]}>{formatCurrency(farm.expenses)}</Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  headerSubtext: { fontSize: 14, color: '#FFFFFF', opacity: 0.8, marginTop: 4 },
  content: { paddingHorizontal: 16, paddingVertical: 12 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1 },
  statLabel: { fontSize: 12, color: colors.textLight, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12, marginTop: 8 },
  farmCard: { marginBottom: 12 },
  farmHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  farmName: { fontSize: 16, fontWeight: '600', color: colors.text },
  profitBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  profitText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  farmRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  farmLabel: { fontSize: 13, color: colors.textLight },
  farmValue: { fontSize: 13, fontWeight: '500', color: colors.text },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: colors.textLight, textAlign: 'center' },
});
