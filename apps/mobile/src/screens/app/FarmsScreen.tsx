import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { farmsAPI } from '../../services/api';
import { Card, Button, colors } from '../../components/common/UIComponents';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 20,
    textAlign: 'center',
  },
  farmCard: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  farmCardContent: {
    paddingBottom: 0,
  },
  farmName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  farmLocation: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: 12,
  },
  farmStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  farmStat: {
    alignItems: 'center',
    flex: 1,
  },
  farmStatLabel: {
    fontSize: 11,
    color: colors.textLight,
    marginBottom: 4,
  },
  farmStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  farmActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonText: {
    color: colors.primary,
    fontSize: 12,
  },
  deleteButtonText: {
    color: colors.error,
  },
  deleteBorderColor: {
    borderColor: colors.error,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    color: colors.textLight,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
});

interface Farm {
  id: string;
  name: string;
  location: string;
  size: number;
  crops: number;
  animals: number;
  status: 'active' | 'inactive';
}

export default function FarmsScreen() {
  const router = useRouter();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    try {
      setLoading(true);
      const response = await farmsAPI.list();
      const farmsData = response.data.data || response.data;
      setFarms(Array.isArray(farmsData) ? farmsData : []);
    } catch (error: any) {
      console.error('Failed to fetch farms:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load farms. Please try again.';
      // You can dispatch a toast notification here if you have a toast service
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFarms();
    setRefreshing(false);
  };

  const filteredFarms = farms.filter((farm) => {
    if (filter === 'active') return farm.status === 'active';
    if (filter === 'inactive') return farm.status === 'inactive';
    return true;
  });

  const handleDeleteFarm = (farmId: string) => {
    setFarms(farms.filter((f) => f.id !== farmId));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Farms</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Farms</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/farms/add')}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.filterContainer}>
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterButton,
                filter === f && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === f && styles.filterButtonTextActive,
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredFarms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🌾</Text>
            <Text style={styles.emptyText}>No Farms Yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first farm to get started managing your agricultural operations
            </Text>
            <Button
              title="Add Farm"
              onPress={() => router.push('/farms/add')}
            />
          </View>
        ) : (
          <FlatList
            data={filteredFarms}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item: farm }) => (
              <Card style={styles.farmCard}>
                <TouchableOpacity
                  onPress={() => router.push(`/farms/${farm.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.farmCardContent}>
                    <Text style={styles.farmName}>{farm.name}</Text>
                    <Text style={styles.farmLocation}>📍 {farm.location}</Text>
                    <View style={styles.farmStats}>
                      <View style={styles.farmStat}>
                        <Text style={styles.farmStatLabel}>Size</Text>
                        <Text style={styles.farmStatValue}>{farm.size} ha</Text>
                      </View>
                      <View style={styles.farmStat}>
                        <Text style={styles.farmStatLabel}>Crops</Text>
                        <Text style={styles.farmStatValue}>{farm.crops}</Text>
                      </View>
                      <View style={styles.farmStat}>
                        <Text style={styles.farmStatLabel}>Animals</Text>
                        <Text style={styles.farmStatValue}>{farm.animals}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
                <View style={styles.farmActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push(`/farms/${farm.id}`)}
                  >
                    <Text style={styles.actionButtonText}>View Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push(`/farms/${farm.id}/edit`)}
                  >
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteBorderColor]}
                    onPress={() => handleDeleteFarm(farm.id)}
                  >
                    <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            )}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
