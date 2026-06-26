import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSelector } from '../../hooks/useAuth';
import { farmsAPI, cropsAPI, livestockAPI, poultryAPI, financeAPI } from '../../services/api';
import { Card, colors } from '../../components/common/UIComponents';

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeFarms: 0,
    totalCrops: 0,
    totalLivestock: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [farmsRes, cropsRes, livestockRes, poultryRes, financeRes] = await Promise.all([
        farmsAPI.list(),
        cropsAPI.list(),
        livestockAPI.list(),
        poultryAPI.list(),
        financeAPI.list(),
      ]);

      const farms = Array.isArray(farmsRes.data.data || farmsRes.data) ? (farmsRes.data.data || farmsRes.data) : [];
      const crops = Array.isArray(cropsRes.data.data || cropsRes.data) ? (cropsRes.data.data || cropsRes.data) : [];
      const livestock = Array.isArray(livestockRes.data.data || livestockRes.data) ? (livestockRes.data.data || livestockRes.data) : [];
      const poultry = Array.isArray(poultryRes.data.data || poultryRes.data) ? (poultryRes.data.data || poultryRes.data) : [];
      const transactions = Array.isArray(financeRes.data.data || financeRes.data) ? (financeRes.data.data || financeRes.data) : [];

      // Calculate total revenue from income transactions
      const totalRevenue = transactions
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      // Count total livestock (sum of all quantities)
      const totalLivestock = [...livestock, ...poultry].reduce(
        (sum: number, item: any) => sum + (item.quantity || 0),
        0
      );

      setStats({
        activeFarms: farms.filter((f: any) => f.status === 'active').length,
        totalCrops: crops.length,
        totalLivestock,
        totalRevenue,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Use default empty stats on error
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const firstName = user?.fullName.split(' ')[0] || 'User';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back, {firstName}! 👋</Text>
          <Text style={styles.subtitle}>Here's an overview of your farm</Text>
        </View>

        <View style={styles.content}>
          {/* Quick Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>Active Farms</Text>
                <Text style={styles.statValue}>{stats.activeFarms}</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>Total Crops</Text>
                <Text style={styles.statValue}>{stats.totalCrops}</Text>
              </Card>
            </View>
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>Livestock</Text>
                <Text style={styles.statValue}>{stats.totalLivestock}</Text>
              </Card>
              <Card style={styles.statCard}>
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
