import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSelector } from '../../hooks/useAuth';
import { farmsAPI, cropsAPI, livestockAPI, poultryAPI, financeAPI } from '../../services/api';
import { Card, colors } from '../../components/common/UIComponents';
import { ScreenLoading, StateView } from '../../components/feedback';
import { useToasts } from '../../hooks/useToasts';
import { describeApiError } from '../../utils/apiError';
import { extractArray } from '../../utils/responseParser';
import { transformFarm, transformLivestock, transformFlock, transformExpense, transformSale, RawFarm, RawLivestock, RawFlock, RawExpense, RawSale } from '../../utils/entityTransformers';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  gridItem: {
    width: (Dimensions.get('window').width - 52) / 2,
    aspectRatio: 1,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textLight,
  },
  quickActionCard: {
    padding: 16,
    marginBottom: 12,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickActionText: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  quickActionDescription: {
    fontSize: 13,
    color: colors.textLight,
  },
  quickActionIcon: {
    fontSize: 24,
    marginLeft: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
});

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const { error: showError } = useToasts();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    activeFarms: 0,
    totalCrops: 0,
    totalLivestock: 0,
    totalRevenue: 0,
  });

  const loadDashboardData = useCallback(async () => {
    try {
      setLoadError(null);
      const [farmsRes, cropsRes, livestockRes, poultryRes, financeRes] = await Promise.all([
        farmsAPI.list(),
        cropsAPI.list(),
        livestockAPI.list(),
        poultryAPI.list(),
        financeAPI.list(),
      ]);

      const farms = extractArray<RawFarm>(farmsRes).map(transformFarm);
      const crops = extractArray<any>(cropsRes);
      const livestock = extractArray<RawLivestock>(livestockRes).map((item) => transformLivestock(item));
      const poultry = extractArray<RawFlock>(poultryRes).map(transformFlock);

      // Finance: merge expenses + sales
      const financeRaw = extractArray<any>(financeRes);
      const transactions = financeRaw.map((item: any) =>
        item.item !== undefined || item.quantity !== undefined
          ? transformSale(item as RawSale)
          : transformExpense(item as RawExpense)
      );

      // Calculate total revenue from income transactions
      const totalRevenue = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      // Count total livestock (sum of all quantities)
      const totalLivestock = [...livestock, ...poultry].reduce(
        (sum, item) => sum + (item.quantity || 0),
        0
      );

      setStats({
        activeFarms: farms.filter((f) => f.status === 'active').length,
        totalCrops: crops.length,
        totalLivestock,
        totalRevenue,
      });
    } catch (error) {
      const message = describeApiError(error, 'Couldn\u2019t load your dashboard. Please try again.');
      setLoadError(message);
      if (!loading) showError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading, showError]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = user?.fullName?.split(' ')[0] || 'User';

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back, {firstName}! 👋</Text>
          <Text style={styles.subtitle}>Here\u2019s an overview of your farm</Text>
        </View>
        <ScreenLoading message="Fetching your farm overview…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back, {firstName}! 👋</Text>
          <Text style={styles.subtitle}>Here\u2019s an overview of your farm</Text>
        </View>
        <StateView
          variant="error"
          title="Couldn\u2019t load your dashboard"
          message={loadError}
          onRetry={loadDashboardData}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back, {firstName}! 👋</Text>
          <Text style={styles.subtitle}>Here\u2019s an overview of your farm</Text>
        </View>

        <View style={styles.content}>
          {/* Quick Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsRow}>
              <Card style={styles.statCard} accessibilityLabel={`Active Farms: ${stats.activeFarms}`}>
                <Text style={styles.statLabel}>Active Farms</Text>
                <Text style={styles.statValue}>{stats.activeFarms}</Text>
              </Card>
              <Card style={styles.statCard} accessibilityLabel={`Total Crops: ${stats.totalCrops}`}>
                <Text style={styles.statLabel}>Total Crops</Text>
                <Text style={styles.statValue}>{stats.totalCrops}</Text>
              </Card>
            </View>
            <View style={styles.statsRow}>
              <Card style={styles.statCard} accessibilityLabel={`Livestock: ${stats.totalLivestock}`}>
                <Text style={styles.statLabel}>Livestock</Text>
                <Text style={styles.statValue}>{stats.totalLivestock}</Text>
              </Card>
              <Card style={styles.statCard} accessibilityLabel={`Revenue: $${(stats.totalRevenue / 1000).toFixed(1)}K`}>
                <Text style={styles.statLabel}>Revenue</Text>
                <Text style={styles.statValue}>${(stats.totalRevenue / 1000).toFixed(1)}K</Text>
              </Card>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>

            <Card
              style={styles.quickActionCard}
              onPress={() => router.push('/farms')}
              accessibilityLabel="Navigate to Farms"
            >
              <View style={styles.quickActionRow}>
                <View style={styles.quickActionText}>
                  <Text style={styles.quickActionTitle}>Manage Farms</Text>
                  <Text style={styles.quickActionDescription}>
                    View and manage all your farms
                  </Text>
                </View>
                <Text style={styles.quickActionIcon}>🌾</Text>
              </View>
            </Card>

            <Card
              style={styles.quickActionCard}
              onPress={() => router.push('/crops')}
              accessibilityLabel="Navigate to Crops"
            >
              <View style={styles.quickActionRow}>
                <View style={styles.quickActionText}>
                  <Text style={styles.quickActionTitle}>Monitor Crops</Text>
                  <Text style={styles.quickActionDescription}>
                    Track crop health and yield
                  </Text>
                </View>
                <Text style={styles.quickActionIcon}>🌱</Text>
              </View>
            </Card>

            <Card
              style={styles.quickActionCard}
              onPress={() => router.push('/livestock')}
              accessibilityLabel="Navigate to Livestock"
            >
              <View style={styles.quickActionRow}>
                <View style={styles.quickActionText}>
                  <Text style={styles.quickActionTitle}>Livestock Management</Text>
                  <Text style={styles.quickActionDescription}>
                    Manage animals and health records
                  </Text>
                </View>
                <Text style={styles.quickActionIcon}>🐄</Text>
              </View>
            </Card>

            <Card
              style={styles.quickActionCard}
              onPress={() => router.push('/finance')}
              accessibilityLabel="Navigate to Finance"
            >
              <View style={styles.quickActionRow}>
                <View style={styles.quickActionText}>
                  <Text style={styles.quickActionTitle}>Financial Reports</Text>
                  <Text style={styles.quickActionDescription}>
                    Review income and expenses
                  </Text>
                </View>
                <Text style={styles.quickActionIcon}>💰</Text>
              </View>
            </Card>
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Card style={styles.quickActionCard}>
              <Text style={styles.quickActionTitle}>
                New crop planted - Farm A
              </Text>
              <Text style={styles.quickActionDescription}>
                Maize planted 2 hours ago
              </Text>
            </Card>
            <Card style={styles.quickActionCard}>
              <Text style={styles.quickActionTitle}>
                Livestock health check completed
              </Text>
              <Text style={styles.quickActionDescription}>
                All animals healthy - 1 day ago
              </Text>
            </Card>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
