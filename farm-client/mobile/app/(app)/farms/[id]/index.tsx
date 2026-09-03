import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { farmsAPI } from '../../../../src/services/api';
import { Card, Button, colors } from '../../../../src/components/common/UIComponents';
import { ScreenLoading, StateView } from '../../../../src/components/feedback';
import { useToasts } from '../../../../src/hooks/useToasts';
import { describeApiError } from '../../../../src/utils/apiError';
import { useAppDispatch } from '../../../../src/hooks/useAuth';
import { setSelectedFarmId } from '../../../../src/store/slices/uiSlice';

const FARM_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  CROP: { bg: '#DCFCE7', text: '#166534' },
  LIVESTOCK: { bg: '#FEF3C7', text: '#92400E' },
  POULTRY: { bg: '#FFEDD5', text: '#9A3412' },
  DAIRY: { bg: '#DBEAFE', text: '#1E40AF' },
  AQUACULTURE: { bg: '#CFFAFE', text: '#155E75' },
};

const FARM_TYPE_LABELS: Record<string, string> = {
  CROP: 'Crop',
  LIVESTOCK: 'Livestock',
  POULTRY: 'Poultry',
  DAIRY: 'Dairy',
  AQUACULTURE: 'Aquaculture',
};

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
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  farmCard: {
    marginBottom: 16,
  },
  farmName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  farmLocation: {
    fontSize: 16,
    color: colors.textLight,
    marginBottom: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  statusActive: {
    backgroundColor: colors.success,
  },
  statusInactive: {
    backgroundColor: colors.border,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.light,
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
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
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  deleteAction: {
    flex: 1,
    backgroundColor: colors.error,
  },
});

interface FarmData {
  id: string;
  name: string;
  location: string;
  size: number;
  crops: number;
  animals: number;
  status: 'active' | 'inactive';
  farmType?: string;
}

export default function FarmDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { success, error: showError } = useToasts();
  const [loading, setLoading] = useState(true);
  const [farm, setFarm] = useState<FarmData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchFarm();
  }, [id]);

  const fetchFarm = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setLoadError(null);
      const response = await farmsAPI.get(id);
      const farmData = response.data.data || response.data;
      setFarm(farmData);
      dispatch(setSelectedFarmId(id));
    } catch (error: any) {
      const message = describeApiError(error, 'Failed to load farm details.');
      setLoadError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!id || !farm) return;

    Alert.alert(
      'Delete Farm',
      `Are you sure you want to delete "${farm.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!id) return;

    try {
      await farmsAPI.delete(id);
      success('Farm deleted successfully');
      dispatch(setSelectedFarmId(null));
      router.back();
    } catch (error: any) {
      const message = describeApiError(error, 'Failed to delete farm. Please try again.');
      showError(message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Farm Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScreenLoading message="Loading farm details…" />
      </SafeAreaView>
    );
  }

  if (loadError || !farm) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Farm Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load farm"
          message={loadError || 'Farm not found'}
          onRetry={fetchFarm}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Farm Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.farmCard}>
          <Text style={styles.farmName}>{farm.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 }}>
            <View style={{ backgroundColor: FARM_TYPE_COLORS[farm.farmType || '']?.bg || '#F3F4F6', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: FARM_TYPE_COLORS[farm.farmType || '']?.text || '#6B7280' }}>
                {FARM_TYPE_LABELS[farm.farmType || ''] || farm.farmType || 'Unknown'}
              </Text>
            </View>
          </View>
          <Text style={styles.farmLocation}>📍 {farm.location}</Text>

          <View
            style={[
              styles.statusBadge,
              farm.status === 'active' ? styles.statusActive : styles.statusInactive,
            ]}
          >
            <Text style={styles.statusText}>
              {farm.status === 'active' ? 'Active' : 'Inactive'}
            </Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Size</Text>
              <Text style={styles.statValue}>{farm.size} ha</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Crops</Text>
              <Text style={styles.statValue}>{farm.crops}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Animals</Text>
              <Text style={styles.statValue}>{farm.animals}</Text>
            </View>
          </View>
        </Card>

        <View style={styles.actionsContainer}>
          <Button
            title="Edit"
            onPress={() => router.push(`/farms/${id}/edit`)}
            style={styles.actionButton}
          />
          <Button
            title="Delete"
            onPress={handleDelete}
            style={styles.deleteAction}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}