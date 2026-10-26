import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { equipmentAPI } from '@/modules/inventory';
import type { Equipment } from '@/modules/inventory';
import { RecordTasksCard } from '@/modules/worker/RecordTasksCard';
import { farmsAPI } from '@/modules/farm';
import { Button, colors } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';

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
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', flex: 1, textAlign: 'center' },
  backButton: { padding: 8 },
  backButtonText: { color: '#FFFFFF', fontSize: 16 },
  content: { paddingHorizontal: 20, paddingVertical: 16 },
  card: { marginBottom: 16 },
  equipName: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
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
  statValue: { fontSize: 16, fontWeight: '700', color: colors.primary },
  detailSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.light },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  detailValue: { fontSize: 14, color: colors.text, flexShrink: 1, textAlign: 'right' },
  actions: { marginTop: 20, gap: 12 },
});

const EQUIP_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: '#DCFCE7', text: '#166534' },
  MAINTENANCE: { bg: '#FEF3C7', text: '#92400E' },
  INACTIVE: { bg: '#F3F4F6', text: '#6B7280' },
  RETIRED: { bg: '#FEE2E2', text: '#991B1B' },
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function formatCost(value?: number | null) {
  if (value == null || isNaN(Number(value))) return '—';
  return Number(value).toLocaleString();
}

function unwrapOne<T>(payload: any): T | null {
  if (payload?.id) return payload as T;
  if (payload?.data?.id) return payload.data as T;
  return null;
}

export default function EquipmentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const { hasPermission } = usePermission();
  const { colors: tc, isDark } = useAppTheme();

  const canDelete = hasPermission('farm.delete');
  const canWrite = hasPermission('farm.write');

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<Equipment | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [farmName, setFarmName] = useState<string>('');

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    if (!id) {
      setLoadError('Missing equipment id.');
      setLoading(false);
      return;
    }
    try {
      setLoadError(null);
      const response = await equipmentAPI.get(id);
      const record = unwrapOne<Equipment>(response.data);
      if (!record) {
        setLoadError('Equipment not found.');
        return;
      }
      setItem(record);
      if (record.farmId) fetchFarmName(record.farmId);
    } catch (error: any) {
      setLoadError(describeApiError(error, 'Failed to load equipment.'));
    } finally {
      setLoading(false);
    }
  };

  const fetchFarmName = async (farmId: string) => {
    try {
      const response = await farmsAPI.get(farmId);
      const body: any = response.data;
      setFarmName(body?.name || body?.data?.name || '');
    } catch {
      /* ignore — falls back to "—" */
    }
  };

  const handleDelete = useCallback(() => {
    if (!item) return;
    Alert.alert(
      'Delete Equipment',
      `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await equipmentAPI.delete(item.id);
              success('Equipment deleted successfully');
              router.back();
            } catch (error: any) {
              showError(describeApiError(error, 'Failed to delete equipment.'));
            }
          },
        },
      ]
    );
  }, [item, success, showError, router]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Equipment Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScreenLoading message="Loading equipment…" />
      </SafeAreaView>
    );
  }

  if (loadError || !item) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Equipment Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load this equipment"
          message={loadError || 'Equipment not found.'}
          onRetry={fetchItem}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  const statusColors = EQUIP_STATUS_COLORS[item.status] || { bg: '#F3F4F6', text: '#6B7280' };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Equipment Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: tc.card }]}>
          <Text style={[styles.equipName, { color: tc.text }]}>{item.name}</Text>
          <View style={styles.badgeRow}>
            <View
              style={{
                backgroundColor: statusColors.bg,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 12,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: statusColors.text }}>
                {item.status || '—'}
              </Text>
            </View>
          </View>

          <View style={[styles.statsContainer, { borderTopColor: isDark ? tc.surface : '#F5F5F5' }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: tc.textSecondary }]}>Cost</Text>
              <Text style={[styles.statValue, { color: tc.primary }]}>{formatCost(item.purchaseCost)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: tc.textSecondary }]}>Purchased</Text>
              <Text style={[styles.statValue, { color: tc.primary }]}>{formatDate(item.purchaseDate)}</Text>
            </View>
          </View>

          <View style={[styles.detailSection, { borderTopColor: isDark ? tc.surface : '#F5F5F5' }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: tc.text }]}>Type</Text>
              <Text style={[styles.detailValue, { color: tc.text }]}>{item.type || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: tc.text }]}>Model</Text>
              <Text style={[styles.detailValue, { color: tc.text }]}>{item.model || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: tc.text }]}>Serial Number</Text>
              <Text style={[styles.detailValue, { color: tc.text }]}>{item.serialNumber || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: tc.text }]}>Farm</Text>
              <Text style={[styles.detailValue, { color: tc.text }]}>
                {item.farmId ? farmName || '—' : 'Unassigned'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: tc.text }]}>Purchase Date</Text>
              <Text style={[styles.detailValue, { color: tc.text }]}>{formatDate(item.purchaseDate)}</Text>
            </View>
            {item.notes ? (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: tc.text }]}>Notes</Text>
                <Text style={[styles.detailValue, { color: tc.text }]}>{item.notes}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <RecordTasksCard moduleKey="equipment" recordId={item.id} recordName={item.name} />

        {(canWrite || canDelete) && (
          <View style={styles.actions}>
            {canWrite && (
              <Button
                title="Edit Equipment"
                onPress={() => router.push(`/equipment/${id}/edit`)}
                accessibilityLabel="Edit this equipment"
              />
            )}
            {canDelete && (
              <Button
                title="Delete Equipment"
                variant="secondary"
                onPress={handleDelete}
                accessibilityLabel="Delete this equipment"
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
