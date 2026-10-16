import React, { useEffect, useMemo } from 'react';
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
import { useGetFarmQuery, useDeleteFarmMutation } from '@/store/api';
import { Card, Button } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
import { usePermission } from '@/core/hooks/usePermission';
import { useAppDispatch } from '@/modules/auth/hooks/useAuth';
import { setSelectedFarmId } from '@/store/slices/uiSlice';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { FARM_TYPE_COLORS, FARM_TYPE_LABELS } from '@/core/farmTypes';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
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
    marginBottom: 8,
  },
  farmLocation: {
    fontSize: 16,
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
    backgroundColor: '#16A34A',
  },
  statusInactive: {
    backgroundColor: '#9CA3AF',
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
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  relatedCard: {
    marginBottom: 16,
  },
  relatedTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  relatedRowText: {
    fontSize: 14,
    fontWeight: '600',
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
    flex: 1,
  },
});

// Server rows carry lowercase statuses ("active"); display copy is Title
// case ("Active"/"Inactive") in both the list and the detail screen.
const formatStatus = (status?: string) => {
  const value = String(status || '').trim();
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

export default function FarmDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { success, error: showError } = useToasts();
  const { colors: themeColors, isDark } = useAppTheme();

  // Mirror the server's permission checks via the wildcard-aware
  // permission system: only farm.write may edit, farm.delete may delete.
  const { canCreate, canDelete } = usePermission();
  const canWrite = canCreate('farm');
  const canRemove = canDelete('farm');

  const { data: farm, isLoading, error: loadError, refetch } = useGetFarmQuery(id);
  const [deleteFarm, { isLoading: isDeleting }] = useDeleteFarmMutation();

  useEffect(() => {
    if (id) dispatch(setSelectedFarmId(id));
  }, [id, dispatch]);

  // Type-aware related links. POULTRY is omitted: the mobile app has no
  // poultry list route on disk. AQUACULTURE links without a farmId because
  // the aquaculture list screen doesn't read one.
  const relatedLinks = useMemo(() => {
    const farmType = String(farm?.farmType || '').toUpperCase();
    if (farmType === 'CROP') {
      return [{ label: 'Crops', icon: '🌱', path: `/crops?farmId=${id}` }];
    }
    if (farmType === 'LIVESTOCK' || farmType === 'DAIRY') {
      return [{ label: 'Livestock', icon: '🐄', path: `/livestock?farmId=${id}` }];
    }
    if (farmType === 'AQUACULTURE') {
      return [{ label: 'Aquaculture', icon: '🐟', path: '/aquaculture' }];
    }
    return [];
  }, [farm?.farmType, id]);

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
      await deleteFarm(id).unwrap();
      success('Farm deleted successfully');
      dispatch(setSelectedFarmId(null));
      router.back();
    } catch (error) {
      // The server explains why (e.g. 409 "Farm has dependent records…") —
      // surface that verbatim instead of a generic failure.
      showError(describeApiError(error, 'Failed to delete farm. Please try again.'));
    }
  };

  const dynamicStyles = {
    container: {
      backgroundColor: themeColors.background,
    },
    header: {
      backgroundColor: themeColors.headerBg || themeColors.primary,
    },
    cardBackground: {
      backgroundColor: themeColors.card,
      borderColor: isDark ? themeColors.border : 'transparent',
      borderWidth: isDark ? 1 : 0,
    },
    farmName: {
      color: themeColors.text,
    },
    farmLocation: {
      color: themeColors.textSecondary,
    },
    statLabel: {
      color: themeColors.textSecondary,
    },
    statValue: {
      color: themeColors.primary,
    },
    divider: {
      borderTopColor: isDark ? themeColors.border : themeColors.borderLight,
    },
    relatedTitle: {
      color: themeColors.text,
    },
    relatedRowText: {
      color: themeColors.text,
    },
    relatedArrow: {
      color: themeColors.textSecondary,
    },
    deleteAction: {
      backgroundColor: themeColors.error,
    },
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, dynamicStyles.header]}>
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
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, dynamicStyles.header]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Farm Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load farm"
          message={
            loadError
              ? describeApiError(loadError, 'Failed to load farm details.')
              : 'Farm not found'
          }
          onRetry={refetch}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  const isActive = String(farm.status || '').toLowerCase() === 'active';

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Farm Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={[styles.farmCard, dynamicStyles.cardBackground]}>
          <Text style={[styles.farmName, dynamicStyles.farmName]}>{farm.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 }}>
            <View style={{ backgroundColor: FARM_TYPE_COLORS[farm.farmType || '']?.bg || '#F3F4F6', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: FARM_TYPE_COLORS[farm.farmType || '']?.text || '#6B7280' }}>
                {FARM_TYPE_LABELS[farm.farmType || ''] || farm.farmType || 'Unknown'}
              </Text>
            </View>
          </View>
          <Text style={[styles.farmLocation, dynamicStyles.farmLocation]}>📍 {farm.location}</Text>

          <View
            style={[
              styles.statusBadge,
              isActive ? styles.statusActive : styles.statusInactive,
            ]}
          >
            <Text style={styles.statusText}>
              {formatStatus(farm.status)}
            </Text>
          </View>

          <View style={[styles.statsContainer, dynamicStyles.divider]}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Size</Text>
              <Text style={[styles.statValue, dynamicStyles.statValue]}>{farm.size} ha</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Registered</Text>
              <Text style={[styles.statValue, dynamicStyles.statValue]}>
                {farm.createdAt
                  ? new Date(farm.createdAt).toLocaleDateString()
                  : '—'}
              </Text>
            </View>
          </View>
        </Card>

        {relatedLinks.length > 0 && (
          <Card style={[styles.relatedCard, dynamicStyles.cardBackground]}>
            <Text style={[styles.relatedTitle, dynamicStyles.relatedTitle]}>Related</Text>
            {relatedLinks.map((link) => (
              <TouchableOpacity
                key={link.label}
                style={[styles.relatedRow, dynamicStyles.divider]}
                onPress={() => router.push(link.path)}
                accessibilityRole="link"
                accessibilityLabel={`Open ${link.label} for this farm`}
              >
                <Text style={[styles.relatedRowText, dynamicStyles.relatedRowText]}>
                  {link.icon} {link.label}
                </Text>
                <Text style={dynamicStyles.relatedArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {(canWrite || canRemove) && (
          <View style={styles.actionsContainer}>
            {canWrite && (
              <Button
                title="Edit"
                onPress={() => router.push(`/farms/${id}/edit`)}
                style={styles.actionButton}
              />
            )}
            {canRemove && (
              <Button
                title="Delete"
                onPress={handleDelete}
                loading={isDeleting}
                disabled={isDeleting}
                style={[styles.deleteAction, dynamicStyles.deleteAction]}
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
