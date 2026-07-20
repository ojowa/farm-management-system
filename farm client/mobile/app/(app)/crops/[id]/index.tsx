import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { offlineCropsAPI } from '../../../../src/services/offlineApi';
import { Card, Button, colors } from '../../../../src/components/common/UIComponents';
import { ScreenLoading, StateView } from '../../../../src/components/feedback';
import { useToasts } from '../../../../src/hooks/useToasts';
import { describeApiError } from '../../../../src/utils/apiError';
import { useAppDispatch } from '../../../../src/hooks/useAuth';
import { setSelectedCropId } from '../../../../src/store/slices/uiSlice';

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
  cropCard: {
    marginBottom: 16,
  },
  cropName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  cropType: {
    fontSize: 14,
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
  statusGrowing: {
    backgroundColor: '#E8F5E9',
  },
  statusHarvesting: {
    backgroundColor: '#FFF3E0',
  },
  statusCompleted: {
    backgroundColor: '#E3F2FD',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextGrowing: {
    color: colors.success,
  },
  statusTextHarvesting: {
    color: colors.warning,
  },
  statusTextCompleted: {
    color: colors.info,
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
  healthSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  healthValueText: {
    fontSize: 14,
    fontWeight: '700',
  },
  healthBar: {
    height: 12,
    backgroundColor: colors.light,
    borderRadius: 6,
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    borderRadius: 6,
  },
  healthActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  healthButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  healthButtonText: {
    fontSize: 12,
    color: colors.text,
  },
  healthButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  healthButtonTextActive: {
    color: '#FFFFFF',
  },
  statusSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  statusActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusButtonText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  statusButtonTextActive: {
    color: '#FFFFFF',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
  },
  deleteAction: {
    backgroundColor: colors.error,
  },
  deleteButtonAction: {
    flex: 1,
    backgroundColor: colors.error,
  },
  farmInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  farmLabel: {
    fontSize: 12,
    color: colors.textLight,
    marginRight: 8,
  },
  farmValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});

interface CropData {
  id: string;
  name: string;
  type: string;
  farm: string;
  farmId?: string;
  area: number;
  plantedDate: string;
  health: number;
  status: 'growing' | 'harvesting' | 'completed';
}

export default function CropDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { success, error: showError } = useToasts();
  const [loading, setLoading] = useState(true);
  const [crop, setCrop] = useState<CropData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchCrop();
  }, [id]);

  const fetchCrop = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setLoadError(null);
      const response = await offlineCropsAPI.get(id);
      const cropData = response.data.data || response.data;
      setCrop(cropData);
      dispatch(setSelectedCropId(id));
    } catch (error: any) {
      const message = describeApiError(error, 'Failed to load crop details.');
      setLoadError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (value: number) => {
    if (value >= 70) return colors.success;
    if (value >= 40) return colors.warning;
    return colors.error;
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'growing':
        return { badge: styles.statusGrowing, text: styles.statusTextGrowing };
      case 'harvesting':
        return { badge: styles.statusHarvesting, text: styles.statusTextHarvesting };
      case 'completed':
        return { badge: styles.statusCompleted, text: styles.statusTextCompleted };
      default:
        return { badge: styles.statusGrowing, text: styles.statusTextGrowing };
    }
  };

  const handleUpdateHealth = async (newHealth: number) => {
    if (!crop) return;
    try {
      await offlineCropsAPI.update(crop.id, { health: newHealth });
      setCrop({ ...crop, health: newHealth });
      success('Health updated');
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to update health.'));
    }
  };

  const handleUpdateStatus = async (newStatus: CropData['status']) => {
    if (!crop) return;
    try {
      await offlineCropsAPI.update(crop.id, { status: newStatus });
      setCrop({ ...crop, status: newStatus });
      success('Status updated');
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to update status.'));
    }
  };

  const handleDelete = () => {
    if (!crop) return;
    Alert.alert(
      'Delete Crop',
      `Are you sure you want to delete "${crop.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!crop) return;
    try {
      await offlineCropsAPI.delete(crop.id);
      success('Crop deleted successfully');
      dispatch(setSelectedCropId(null));
      router.back();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to delete crop.'));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Crop Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScreenLoading message="Loading crop details…" />
      </SafeAreaView>
    );
  }

  if (loadError || !crop) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Crop Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load crop"
          message={loadError || 'Crop not found'}
          onRetry={fetchCrop}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  const statusStyle = getStatusStyles(crop.status);
  const healthColor = getHealthColor(crop.health);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crop Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.cropCard}>
          <Text style={styles.cropName}>{crop.name}</Text>
          <Text style={styles.cropType}>{crop.type}</Text>

          <View style={styles.farmInfo}>
            <Text style={styles.farmLabel}>Farm:</Text>
            <Text style={styles.farmValue}>{crop.farm}</Text>
          </View>

          <View style={[styles.statusBadge, statusStyle.badge]}>
            <Text style={[styles.statusText, statusStyle.text]}>
              {crop.status.charAt(0).toUpperCase() + crop.status.slice(1)}
            </Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Area</Text>
              <Text style={styles.statValue}>{crop.area} ha</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Planted</Text>
              <Text style={styles.statValue}>{crop.plantedDate}</Text>
            </View>
          </View>

          {/* Health Section */}
          <View style={styles.healthSection}>
            <View style={styles.healthHeader}>
              <Text style={styles.healthLabel}>Health</Text>
              <Text style={[styles.healthValueText, { color: healthColor }]}>
                {crop.health}%
              </Text>
            </View>
            <View style={styles.healthBar}>
              <View
                style={[
                  styles.healthFill,
                  { width: `${crop.health}%`, backgroundColor: healthColor },
                ]}
              />
            </View>
            <View style={styles.healthActions}>
              {[-10, -5, +5, +10].map((delta) => {
                const newValue = Math.min(100, Math.max(0, crop.health + delta));
                return (
                  <TouchableOpacity
                    key={delta}
                    style={styles.healthButton}
                    onPress={() => handleUpdateHealth(newValue)}
                  >
                    <Text style={styles.healthButtonText}>
                      {delta > 0 ? `+${delta}` : delta}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Status Section */}
          <View style={styles.statusSection}>
            <Text style={styles.statusLabel}>Status</Text>
            <View style={styles.statusActions}>
              {(['growing', 'harvesting', 'completed'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusButton,
                    crop.status === s && styles.statusButtonActive,
                  ]}
                  onPress={() => handleUpdateStatus(s)}
                >
                  <Text
                    style={[
                      styles.statusButtonText,
                      crop.status === s && styles.statusButtonTextActive,
                    ]}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        <View style={styles.actionsContainer}>
          <Button
            title="Edit"
            onPress={() => router.push(`/crops/${crop.id}/edit`)}
            style={styles.actionButton}
          />
          <Button
            title="Delete"
            onPress={handleDelete}
            style={styles.deleteButtonAction}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}