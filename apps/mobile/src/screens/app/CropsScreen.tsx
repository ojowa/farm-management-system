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
import { cropsAPI } from '../../services/api';
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
  cropCard: {
    marginBottom: 12,
  },
  cropName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  cropInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cropInfoItem: {
    flex: 1,
  },
  cropLabel: {
    fontSize: 11,
    color: colors.textLight,
    marginBottom: 2,
  },
  cropValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  healthBar: {
    height: 8,
    backgroundColor: colors.light,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  statusBadgeActive: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 6,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 4,
  },
  actionButtonText: {
    textAlign: 'center',
    color: colors.primary,
    fontSize: 12,
    fontWeight: '500',
  },
});

interface Crop {
  id: string;
  name: string;
  farm: string;
  type: string;
  area: number;
  plantedDate: string;
  health: number;
  status: 'growing' | 'harvesting' | 'completed';
}

export default function CropsScreen() {
  const router = useRouter();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCrops();
  }, []);

  const fetchCrops = async () => {
    try {
      setLoading(true);
      const response = await cropsAPI.list();
      const cropsData = response.data.data || response.data;
      setCrops(Array.isArray(cropsData) ? cropsData : []);
    } catch (error: any) {
      console.error('Failed to fetch crops:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load crops. Please try again.';
      // You can dispatch a toast notification here if you have a toast service
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCrops();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Crops</Text>
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
        <Text style={styles.headerTitle}>Crops</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/crops/add')}
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
        {crops.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={styles.emptyText}>No Crops Yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first crop to start tracking growth and health
            </Text>
            <Button
              title="Add Crop"
              onPress={() => router.push('/crops/add')}
            />
          </View>
        ) : (
          <FlatList
            data={crops}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item: crop }) => (
              <Card style={styles.cropCard}>
                <Text style={styles.cropName}>{crop.name}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>
                    {crop.status.charAt(0).toUpperCase() + crop.status.slice(1)}
                  </Text>
                </View>
                <View style={styles.cropInfo}>
                  <View style={styles.cropInfoItem}>
                    <Text style={styles.cropLabel}>Type</Text>
                    <Text style={styles.cropValue}>{crop.type}</Text>
                  </View>
                  <View style={styles.cropInfoItem}>
                    <Text style={styles.cropLabel}>Area</Text>
                    <Text style={styles.cropValue}>{crop.area} ha</Text>
                  </View>
                  <View style={styles.cropInfoItem}>
                    <Text style={styles.cropLabel}>Farm</Text>
                    <Text style={styles.cropValue}>{crop.farm}</Text>
                  </View>
                </View>
                <Text style={styles.cropLabel}>Health: {crop.health}%</Text>
                <View style={styles.healthBar}>
                  <View
                    style={[
                      styles.healthFill,
                      { width: `${crop.health}%` },
                    ]}
                  />
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push(`/crops/${crop.id}`)}
                  >
                    <Text style={styles.actionButtonText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push(`/crops/${crop.id}/edit`)}
                  >
                    <Text style={styles.actionButtonText}>Edit</Text>
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
