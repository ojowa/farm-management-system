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
import { livestockAPI, poultryAPI } from '../../services/api';
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
  animalCard: {
    marginBottom: 12,
  },
  animalName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  animalType: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: 4,
  },
  animalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  animalInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  animalLabel: {
    fontSize: 11,
    color: colors.textLight,
    marginBottom: 2,
  },
  animalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  healthStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  healthText: {
    fontSize: 13,
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

interface Animal {
  id: string;
  name: string;
  type: 'livestock' | 'poultry';
  breed: string;
  quantity: number;
  health: 'healthy' | 'sick' | 'treatment';
  farm: string;
  lastCheckup: string;
}

export default function LivestockScreen() {
  const router = useRouter();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'livestock' | 'poultry'>('all');

  useEffect(() => {
    fetchAnimals();
  }, []);

  const fetchAnimals = async () => {
    try {
      setLoading(true);
      // Fetch both livestock and poultry data
      const [livestockResponse, poultryResponse] = await Promise.all([
        livestockAPI.list(),
        poultryAPI.list(),
      ]);

      const livestockData = Array.isArray(livestockResponse.data.data || livestockResponse.data)
        ? (livestockResponse.data.data || livestockResponse.data).map((item: any) => ({
            ...item,
            type: 'livestock',
          }))
        : [];

      const poultryData = Array.isArray(poultryResponse.data.data || poultryResponse.data)
        ? (poultryResponse.data.data || poultryResponse.data).map((item: any) => ({
            ...item,
            type: 'poultry',
          }))
        : [];

      setAnimals([...livestockData, ...poultryData]);
    } catch (error: any) {
      console.error('Failed to fetch animals:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load animals. Please try again.';
      // You can dispatch a toast notification here if you have a toast service
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnimals();
    setRefreshing(false);
  };

  const filteredAnimals = animals.filter((animal) => {
    if (filter === 'livestock') return animal.type === 'livestock';
    if (filter === 'poultry') return animal.type === 'poultry';
    return true;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Livestock & Poultry</Text>
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
        <Text style={styles.headerTitle}>Livestock & Poultry</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/livestock/add')}
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
          {(['all', 'livestock', 'poultry'] as const).map((f) => (
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

        {filteredAnimals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🐄</Text>
            <Text style={styles.emptyText}>No Animals Yet</Text>
            <Text style={styles.emptySubtext}>
              Add livestock or poultry to track their health and productivity
            </Text>
            <Button
              title="Add Animals"
              onPress={() => router.push('/livestock/add')}
            />
          </View>
        ) : (
          <FlatList
            data={filteredAnimals}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item: animal }) => (
              <Card style={styles.animalCard}>
                <Text style={styles.animalName}>{animal.name}</Text>
                <Text style={styles.animalType}>
                  {animal.type === 'livestock' ? '🐄' : '🐔'} {animal.breed}
                </Text>
                <View style={styles.healthStatus}>
                  <View
                    style={[
                      styles.healthDot,
                      {
                        backgroundColor:
                          animal.health === 'healthy'
                            ? colors.success
                            : animal.health === 'treatment'
                            ? colors.warning
                            : colors.error,
                      },
                    ]}
                  />
                  <Text style={[
                    styles.healthText,
                    {
                      color:
                        animal.health === 'healthy'
                          ? colors.success
                          : animal.health === 'treatment'
                          ? colors.warning
                          : colors.error,
                    },
                  ]}>
                    {animal.health.charAt(0).toUpperCase() +
                      animal.health.slice(1)}
                  </Text>
                </View>
                <View style={styles.animalInfo}>
                  <View style={styles.animalInfoItem}>
                    <Text style={styles.animalLabel}>Quantity</Text>
                    <Text style={styles.animalValue}>{animal.quantity}</Text>
                  </View>
                  <View style={styles.animalInfoItem}>
                    <Text style={styles.animalLabel}>Farm</Text>
                    <Text style={styles.animalValue}>{animal.farm}</Text>
                  </View>
                  <View style={styles.animalInfoItem}>
                    <Text style={styles.animalLabel}>Last Checkup</Text>
                    <Text style={styles.animalValue}>{animal.lastCheckup}</Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push(`/livestock/${animal.id}`)}
                  >
                    <Text style={styles.actionButtonText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() =>
                      router.push(`/livestock/${animal.id}/health`)
                    }
                  >
                    <Text style={styles.actionButtonText}>Health</Text>
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
