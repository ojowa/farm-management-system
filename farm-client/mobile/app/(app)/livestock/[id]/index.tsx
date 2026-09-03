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
import { offlineLivestockAPI, offlinePoultryAPI } from '../../../../src/services/offlineApi';
import { Card, Button, colors } from '../../../../src/components/common/UIComponents';
import { ScreenLoading, StateView } from '../../../../src/components/feedback';
import { useToasts } from '../../../../src/hooks/useToasts';
import { describeApiError } from '../../../../src/utils/apiError';
import { useAppDispatch } from '../../../../src/hooks/useAuth';
import { setSelectedLivestockId } from '../../../../src/store/slices/uiSlice';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  backButton: { padding: 8 },
  backButtonText: { color: '#FFFFFF', fontSize: 16 },
  content: { paddingHorizontal: 20, paddingVertical: 16 },
  card: { marginBottom: 16 },
  name: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 },
  typeText: { fontSize: 14, color: colors.textLight, marginBottom: 12 },
  healthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  healthDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  healthLabel: { fontSize: 14, color: colors.text, flex: 1 },
  healthValue: { fontSize: 14, fontWeight: '700' },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.light,
    marginTop: 8,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 12, color: colors.textLight, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.primary },
  checkupSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  checkupLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  checkupValue: { fontSize: 16, color: colors.text },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: { flex: 1 },
  deleteButton: { backgroundColor: colors.error },
  deleteButtonAction: { flex: 1, backgroundColor: colors.error },
});

interface AnimalData {
  id: string;
  name: string;
  type: 'livestock' | 'poultry';
  breed: string;
  quantity: number;
  health: 'healthy' | 'sick' | 'treatment';
  farm: string;
  lastCheckup: string;
}

const getHealthColor = (health: string) => {
  if (health === 'healthy') return colors.success;
  if (health === 'treatment') return colors.warning;
  return colors.error;
};

export default function AnimalDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { success, error: showError } = useToasts();
  const [loading, setLoading] = useState(true);
  const [animal, setAnimal] = useState<AnimalData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnimal();
  }, [id]);

  const fetchAnimal = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);

    try {
      const response = await offlineLivestockAPI.get(id);
      setAnimal({ ...(response.data.data || response.data), type: 'livestock' });
      dispatch(setSelectedLivestockId(id));
    } catch {
      try {
        const response = await offlinePoultryAPI.get(id);
        setAnimal({ ...(response.data.data || response.data), type: 'poultry' });
        dispatch(setSelectedLivestockId(id));
      } catch (error: any) {
        const message = describeApiError(error, 'Failed to load animal details.');
        setLoadError(message);
        showError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!animal) return;
    Alert.alert(
      'Delete Animal',
      `Are you sure you want to delete "${animal.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!animal) return;
    try {
      if (animal.type === 'livestock') {
        await offlineLivestockAPI.delete(animal.id);
      } else {
        await offlinePoultryAPI.delete(animal.id);
      }
      success('Animal deleted successfully');
      dispatch(setSelectedLivestockId(null));
      router.back();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to delete animal.'));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Animal Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScreenLoading message="Loading animal details…" />
      </SafeAreaView>
    );
  }

  if (loadError || !animal) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Animal Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load animal"
          message={loadError || 'Animal not found'}
          onRetry={fetchAnimal}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  const healthColor = getHealthColor(animal.health);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Animal Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.name}>{animal.name}</Text>
          <Text style={styles.typeText}>
            {animal.type === 'livestock' ? '🐄' : '🐔'} {animal.type.charAt(0).toUpperCase() + animal.type.slice(1)} · {animal.breed}
          </Text>

          <View style={styles.healthContainer}>
            <View style={[styles.healthDot, { backgroundColor: healthColor }]} />
            <Text style={styles.healthLabel}>Health Status</Text>
            <Text style={[styles.healthValue, { color: healthColor }]}>
              {animal.health.charAt(0).toUpperCase() + animal.health.slice(1)}
            </Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Quantity</Text>
              <Text style={styles.statValue}>{animal.quantity}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Farm</Text>
              <Text style={styles.statValue}>{animal.farm}</Text>
            </View>
          </View>

          <View style={styles.checkupSection}>
            <Text style={styles.checkupLabel}>Last Checkup</Text>
            <Text style={styles.checkupValue}>{animal.lastCheckup || 'No checkup recorded'}</Text>
          </View>
        </Card>

        <View style={styles.actionsContainer}>
          <Button
            title="Update Health"
            onPress={() => router.push(`/livestock/${animal.id}/health`)}
            style={styles.actionButton}
          />
          <Button
            title="Edit"
            onPress={() => router.push(`/livestock/${animal.id}/edit`)}
            style={styles.actionButton}
            variant="secondary"
          />
        </View>

        <View style={styles.actionsContainer}>
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