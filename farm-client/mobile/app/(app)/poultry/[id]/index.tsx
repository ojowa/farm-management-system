import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { poultryAPI, offlinePoultryAPI } from '@/modules/poultry';
import type { Flock } from '@/modules/poultry';
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
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  backButton: { padding: 8 },
  backButtonText: { color: '#FFFFFF', fontSize: 16 },
  content: { paddingHorizontal: 20, paddingVertical: 16 },
  card: { marginBottom: 16 },
  flockCode: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 },
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
  statValue: { fontSize: 18, fontWeight: '700', color: colors.primary },
  detailSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.light },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  detailValue: { fontSize: 14, color: colors.text, flexShrink: 1, textAlign: 'right' },
  actions: { marginTop: 20, gap: 12 },
});

// Local badge palette for flock status, mirroring POND_STATUS_COLORS.
const FLOCK_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: '#DCFCE7', text: '#166534' },
  DECEASED: { bg: '#FEE2E2', text: '#991B1B' },
  SOLD: { bg: '#DBEAFE', text: '#1E40AF' },
  COMPLETED: { bg: '#F3F4F6', text: '#6B7280' },
};

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export default function FlockDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const { hasPermission } = usePermission();
  const { colors: tc, isDark } = useAppTheme();

  const canDelete = hasPermission('poultry.delete');
  const canWrite = hasPermission('poultry.write');

  const [loading, setLoading] = useState(true);
  const [flock, setFlock] = useState<Flock | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [farmName, setFarmName] = useState<string>('');

  useEffect(() => {
    fetchFlock();
  }, [id]);

  const fetchFlock = async () => {
    if (!id) {
      setLoadError('Missing flock id.');
      setLoading(false);
      return;
    }
    try {
      setLoadError(null);
      const response = await poultryAPI.get(id);
      // Handle both a bare entity and a `{ data: ... }` envelope.
      const body: any = response.data;
      const record: Flock | null = body?.id ? body : body?.data?.id ? body.data : null;
      if (!record) {
        setLoadError('Flock not found.');
        return;
      }
      setFlock(record);
      fetchFarmName(record.farmId);
    } catch (error: any) {
      setLoadError(describeApiError(error, 'Failed to load flock.'));
    } finally {
      setLoading(false);
    }
  };

  const fetchFarmName = async (farmId: string) => {
    if (!farmId) return;
    try {
      const response = await farmsAPI.get(farmId);
      const body: any = response.data;
      setFarmName(body?.name || body?.data?.name || '');
    } catch {
      /* ignore — falls back to "—" */
    }
  };

  const handleDelete = useCallback(() => {
    if (!flock) return;
    Alert.alert(
      'Delete Flock',
      `Are you sure you want to delete flock "${flock.batchCode}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await offlinePoultryAPI.delete(flock.id);
              success('Flock deleted successfully');
              router.back();
            } catch (error: any) {
              showError(describeApiError(error, 'Failed to delete flock.'));
            }
          },
        },
      ]
    );
  }, [flock, success, showError, router]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Flock Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScreenLoading message="Loading flock…" />
      </SafeAreaView>
    );
  }

  if (loadError || !flock) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Flock Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load this flock"
          message={loadError || 'Flock not found.'}
          onRetry={fetchFlock}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  const statusColors = FLOCK_STATUS_COLORS[flock.status] || { bg: '#F3F4F6', text: '#6B7280' };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Flock Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: tc.card }]}>
          <Text style={[styles.flockCode, { color: tc.text }]}>{flock.batchCode}</Text>
          <View style={styles.badgeRow}>
            <View style={{ backgroundColor: statusColors.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: statusColors.text }}>
                {flock.status || '—'}
              </Text>
            </View>
          </View>

          <View style={[styles.statsContainer, { borderTopColor: isDark ? tc.surface : '#F5F5F5' }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: tc.textSecondary }]}>Birds</Text>
              <Text style={[styles.statValue, { color: tc.primary }]}>
                {flock.currentCount ?? '—'}/{flock.birdCount ?? '—'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: tc.textSecondary }]}>Age</Text>
              <Text style={[styles.statValue, { color: tc.primary }]}>{flock.currentAgeDays ?? '—'} d</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: tc.textSecondary }]}>Arrived</Text>
              <Text style={[styles.statValue, { color: tc.primary }]}>{formatDate(flock.arrivalDate)}</Text>
            </View>
          </View>

          <View style={[styles.detailSection, { borderTopColor: isDark ? tc.surface : '#F5F5F5' }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: tc.text }]}>Breed</Text>
              <Text style={[styles.detailValue, { color: tc.text }]}>
                {flock.breed?.name
                  ? `${flock.breed.name}${flock.breed.birdType ? ` · ${flock.breed.birdType}` : ''}`
                  : '—'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: tc.text }]}>Pen</Text>
              <Text style={[styles.detailValue, { color: tc.text }]}>{flock.pen?.name || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: tc.text }]}>Poultry House</Text>
              <Text style={[styles.detailValue, { color: tc.text }]}>
                {flock.pen?.poultryHouse?.name || '—'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: tc.text }]}>Farm</Text>
              <Text style={[styles.detailValue, { color: tc.text }]}>
                {flock.farm?.name || farmName || '—'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: tc.text }]}>Arrival Date</Text>
              <Text style={[styles.detailValue, { color: tc.text }]}>{formatDate(flock.arrivalDate)}</Text>
            </View>
          </View>
        </View>

        {(canWrite || canDelete) && (
          <View style={styles.actions}>
            {canWrite && (
              <Button
                title="Edit Flock"
                onPress={() => router.push(`/poultry/${id}/edit`)}
                accessibilityLabel="Edit this flock"
              />
            )}
            {canDelete && (
              <Button
                title="Delete Flock"
                variant="secondary"
                onPress={handleDelete}
                accessibilityLabel="Delete this flock"
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
