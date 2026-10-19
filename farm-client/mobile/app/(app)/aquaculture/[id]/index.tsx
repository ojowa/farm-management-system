import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { aquacultureAPI } from '@/modules/aquaculture';
import type {
  Pond,
  PondStocking,
  PondFeeding,
  PondWaterQuality,
  PondHarvest,
} from '@/modules/aquaculture';
import { farmsAPI } from '@/modules/farm';
import { TextInputField, Button, colors } from '../../../../src/core/ui/UIComponents';
import { ScreenLoading, StateView } from '../../../../src/core/ui/feedback';
import { useToasts } from '../../../../src/core/hooks/useToasts';
import { describeApiError } from '../../../../src/core/utils/apiError';
import { useAppSelector } from '../../../../src/modules/auth/hooks/useAuth';

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
  pondCard: { marginBottom: 16 },
  pondName: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 },
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
  detailLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  detailValue: { fontSize: 15, color: colors.text },
  sectionCard: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  sectionAdd: { paddingVertical: 4, paddingHorizontal: 8 },
  sectionAddText: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
  sectionEmpty: { paddingVertical: 12, alignItems: 'center' },
  sectionEmptyText: { fontSize: 13, color: colors.textLight },
  sectionLoading: { paddingVertical: 12, alignItems: 'center' },
  sectionLoadingText: { fontSize: 12, color: colors.textLight },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  sectionRowBody: { flex: 1 },
  sectionRowTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  sectionRowSubtitle: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  sectionRowDelete: { paddingVertical: 6, paddingHorizontal: 10 },
  sectionRowDeleteText: { fontSize: 14, color: colors.error },
  actionsContainer: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionButton: { flex: 1 },
  deleteAction: { flex: 1, backgroundColor: colors.error },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '88%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: colors.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  chipActive: { borderWidth: 2, borderColor: colors.primary, backgroundColor: '#E8F0FE' },
  chipText: { fontSize: 13, color: '#6B7280' },
  chipTextActive: { fontWeight: '600', color: colors.primary },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  errorText: { color: colors.error, fontSize: 12, marginTop: 4 },
});

// Local badge palette, mirroring the FARM_TYPE_COLORS pattern from farms.tsx.
const POND_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  FISH: { bg: '#CFFAFE', text: '#155E75' },
  SHRIMP: { bg: '#FFE4E6', text: '#9F1239' },
  CRAB: { bg: '#FFEDD5', text: '#9A3412' },
  MIXED: { bg: '#EDE9FE', text: '#5B21B6' },
};

const POND_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#DCFCE7', text: '#166534' },
  draining: { bg: '#DBEAFE', text: '#1E40AF' },
  maintenance: { bg: '#FEF3C7', text: '#92400E' },
  retired: { bg: '#F3F4F6', text: '#6B7280' },
};

type SectionKey = 'stockings' | 'feedings' | 'waterQuality' | 'harvests';

const STOCKING_STATUSES = ['ongoing', 'completed', 'failed'] as const;

const today = () => new Date().toISOString().split('T')[0];

// Date inputs mirror the YYYY-MM-DD validation used by livestock/[id]/health.tsx.
const isDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));

interface SectionRowProps {
  title: string;
  subtitle?: string;
  onDelete?: () => void;
  deleteLabel?: string;
}

const SectionRow: React.FC<SectionRowProps> = ({ title, subtitle, onDelete, deleteLabel }) => (
  <View style={styles.sectionRow}>
    <View style={styles.sectionRowBody}>
      <Text style={styles.sectionRowTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionRowSubtitle}>{subtitle}</Text> : null}
    </View>
    {onDelete && (
      <TouchableOpacity
        style={styles.sectionRowDelete}
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel={deleteLabel || 'Delete record'}
      >
        <Text style={styles.sectionRowDeleteText}>✕</Text>
      </TouchableOpacity>
    )}
  </View>
);

export default function PondDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const user = useAppSelector((state) => state.auth.user);

  // Pond actions mirror the server's permission checks: only aquaculture.write
  // may add/edit records, aquaculture.delete may delete them. Missing
  // permissions default to hidden (same pattern as farms.tsx).
  const canWrite = user?.permissions?.includes('aquaculture.write') ?? false;
  const canDelete = user?.permissions?.includes('aquaculture.delete') ?? false;

  const [loading, setLoading] = useState(true);
  const [pond, setPond] = useState<Pond | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [farmNames, setFarmNames] = useState<Record<string, string>>({});

  const [stockings, setStockings] = useState<PondStocking[]>([]);
  const [feedings, setFeedings] = useState<PondFeeding[]>([]);
  const [waterQuality, setWaterQuality] = useState<PondWaterQuality[]>([]);
  const [harvests, setHarvests] = useState<PondHarvest[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState({
    stockings: true,
    feedings: true,
    waterQuality: true,
    harvests: true,
  });

  const [activeModal, setActiveModal] = useState<SectionKey | null>(null);
  const [submitting, setSubmitting] = useState<SectionKey | null>(null);

  const [stockingForm, setStockingForm] = useState({
    species: '',
    strain: '',
    count: '',
    source: '',
    totalCost: '',
    stockedAt: today(),
    expectedHarvestAt: '',
    status: 'ongoing',
    notes: '',
  });
  const [stockingErrors, setStockingErrors] = useState<Record<string, string>>({});

  const [feedingForm, setFeedingForm] = useState({
    feedType: '',
    quantityKg: '',
    cost: '',
    fedAt: today(),
    notes: '',
  });
  const [feedingErrors, setFeedingErrors] = useState<Record<string, string>>({});

  const [wqForm, setWqForm] = useState({
    ph: '',
    temperatureC: '',
    dissolvedOxygen: '',
    ammonia: '',
    turbidity: '',
    recordedAt: today(),
    notes: '',
  });
  const [wqErrors, setWqErrors] = useState<Record<string, string>>({});

  const [harvestForm, setHarvestForm] = useState({
    quantityKg: '',
    count: '',
    unitPrice: '',
    revenue: '',
    harvestedAt: today(),
    notes: '',
  });
  const [harvestErrors, setHarvestErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPond();
    fetchFarms();
  }, [id]);

  useEffect(() => {
    if (id) fetchSections();
  }, [id]);

  const fetchPond = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);

    try {
      const response = await aquacultureAPI.getPond(id);
      setPond(response.data as Pond);
    } catch (error: any) {
      const message = describeApiError(error, 'Failed to load pond details.');
      setLoadError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFarms = async () => {
    try {
      const response = await farmsAPI.list();
      const farmsData = response.data;
      if (Array.isArray(farmsData)) {
        setFarmNames(
          farmsData.reduce((acc: Record<string, string>, f: any) => {
            acc[f.id] = f.name;
            return acc;
          }, {})
        );
      }
    } catch { /* ignore — farm name falls back to "Farm" */ }
  };

  const fetchSections = async () => {
    if (!id) return;
    await Promise.all([
      fetchStockings(),
      fetchFeedings(),
      fetchWaterQuality(),
      fetchHarvests(),
    ]);
  };

  const fetchStockings = async () => {
    if (!id) return;
    try {
      const response = await aquacultureAPI.listStockings(id);
      setStockings(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to load stockings.'));
    } finally {
      setSectionsLoading((prev) => ({ ...prev, stockings: false }));
    }
  };

  const fetchFeedings = async () => {
    if (!id) return;
    try {
      const response = await aquacultureAPI.listFeedings(id);
      setFeedings(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to load feedings.'));
    } finally {
      setSectionsLoading((prev) => ({ ...prev, feedings: false }));
    }
  };

  const fetchWaterQuality = async () => {
    if (!id) return;
    try {
      const response = await aquacultureAPI.listWaterQuality(id);
      setWaterQuality(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to load water quality records.'));
    } finally {
      setSectionsLoading((prev) => ({ ...prev, waterQuality: false }));
    }
  };

  const fetchHarvests = async () => {
    if (!id) return;
    try {
      const response = await aquacultureAPI.listHarvests(id);
      setHarvests(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to load harvests.'));
    } finally {
      setSectionsLoading((prev) => ({ ...prev, harvests: false }));
    }
  };

  const handleDelete = () => {
    if (!pond) return;
    Alert.alert(
      'Delete Pond',
      `Are you sure you want to delete "${pond.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!pond) return;
    try {
      await aquacultureAPI.deletePond(pond.id);
      success('Pond deleted successfully');
      router.back();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to delete pond.'));
    }
  };

  const confirmDeleteRecord = useCallback(
    (title: string, deleteAction: () => Promise<void>, failureMessage: string, onDone: () => void) => {
      Alert.alert(title, 'Are you sure you want to delete this record? This action cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAction();
              success('Record deleted successfully');
              onDone();
            } catch (error: any) {
              showError(describeApiError(error, failureMessage));
            }
          },
        },
      ]);
    },
    [success, showError]
  );

  const openModal = (key: SectionKey) => {
    setActiveModal(key);
  };

  const closeModal = () => {
    if (submitting) return;
    setActiveModal(null);
  };

  const handleAddStocking = async () => {
    if (!id) return;
    const newErrors: Record<string, string> = {};
    if (!stockingForm.species.trim()) newErrors.species = 'Species is required';
    if (!stockingForm.count.trim()) {
      newErrors.count = 'Count is required';
    } else if (isNaN(Number(stockingForm.count)) || Number(stockingForm.count) <= 0) {
      newErrors.count = 'Count must be greater than 0';
    }
    if (stockingForm.totalCost.trim() && isNaN(Number(stockingForm.totalCost))) {
      newErrors.totalCost = 'Total cost must be a number';
    }
    if (!isDate(stockingForm.stockedAt)) newErrors.stockedAt = 'Use a valid YYYY-MM-DD date';
    if (stockingForm.expectedHarvestAt.trim() && !isDate(stockingForm.expectedHarvestAt)) {
      newErrors.expectedHarvestAt = 'Use a valid YYYY-MM-DD date';
    }
    setStockingErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting('stockings');
    try {
      await aquacultureAPI.createStocking(id, {
        species: stockingForm.species.trim(),
        strain: stockingForm.strain.trim() || undefined,
        count: Number(stockingForm.count),
        source: stockingForm.source.trim() || undefined,
        totalCost: stockingForm.totalCost.trim() ? Number(stockingForm.totalCost) : undefined,
        stockedAt: stockingForm.stockedAt,
        expectedHarvestAt: stockingForm.expectedHarvestAt.trim() || undefined,
        status: stockingForm.status as any,
        notes: stockingForm.notes.trim() || undefined,
      });
      success('Stocking added successfully');
      setActiveModal(null);
      setStockingForm({
        species: '',
        strain: '',
        count: '',
        source: '',
        totalCost: '',
        stockedAt: today(),
        expectedHarvestAt: '',
        status: 'ongoing',
        notes: '',
      });
      fetchStockings();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to add stocking.'));
    } finally {
      setSubmitting(null);
    }
  };

  const handleAddFeeding = async () => {
    if (!id) return;
    const newErrors: Record<string, string> = {};
    if (!feedingForm.feedType.trim()) newErrors.feedType = 'Feed type is required';
    if (!feedingForm.quantityKg.trim()) {
      newErrors.quantityKg = 'Quantity is required';
    } else if (isNaN(Number(feedingForm.quantityKg)) || Number(feedingForm.quantityKg) <= 0) {
      newErrors.quantityKg = 'Quantity must be greater than 0';
    }
    if (feedingForm.cost.trim() && isNaN(Number(feedingForm.cost))) {
      newErrors.cost = 'Cost must be a number';
    }
    if (!isDate(feedingForm.fedAt)) newErrors.fedAt = 'Use a valid YYYY-MM-DD date';
    setFeedingErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting('feedings');
    try {
      await aquacultureAPI.createFeeding(id, {
        feedType: feedingForm.feedType.trim(),
        quantityKg: Number(feedingForm.quantityKg),
        cost: feedingForm.cost.trim() ? Number(feedingForm.cost) : undefined,
        fedAt: feedingForm.fedAt,
        notes: feedingForm.notes.trim() || undefined,
      });
      success('Feeding recorded successfully');
      setActiveModal(null);
      setFeedingForm({ feedType: '', quantityKg: '', cost: '', fedAt: today(), notes: '' });
      fetchFeedings();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to add feeding.'));
    } finally {
      setSubmitting(null);
    }
  };

  const handleAddWaterQuality = async () => {
    if (!id) return;
    const newErrors: Record<string, string> = {};
    const numericFields: Array<keyof typeof wqForm> = [
      'ph',
      'temperatureC',
      'dissolvedOxygen',
      'ammonia',
      'turbidity',
    ];
    numericFields.forEach((field) => {
      if (wqForm[field].trim() && isNaN(Number(wqForm[field]))) {
        newErrors[field] = 'Must be a number';
      }
    });
    if (!isDate(wqForm.recordedAt)) newErrors.recordedAt = 'Use a valid YYYY-MM-DD date';
    setWqErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting('waterQuality');
    try {
      await aquacultureAPI.createWaterQuality(id, {
        ph: wqForm.ph.trim() ? Number(wqForm.ph) : undefined,
        temperatureC: wqForm.temperatureC.trim() ? Number(wqForm.temperatureC) : undefined,
        dissolvedOxygen: wqForm.dissolvedOxygen.trim() ? Number(wqForm.dissolvedOxygen) : undefined,
        ammonia: wqForm.ammonia.trim() ? Number(wqForm.ammonia) : undefined,
        turbidity: wqForm.turbidity.trim() ? Number(wqForm.turbidity) : undefined,
        recordedAt: wqForm.recordedAt,
        notes: wqForm.notes.trim() || undefined,
      });
      success('Water quality recorded successfully');
      setActiveModal(null);
      setWqForm({
        ph: '',
        temperatureC: '',
        dissolvedOxygen: '',
        ammonia: '',
        turbidity: '',
        recordedAt: today(),
        notes: '',
      });
      fetchWaterQuality();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to add water quality record.'));
    } finally {
      setSubmitting(null);
    }
  };

  const handleAddHarvest = async () => {
    if (!id) return;
    const newErrors: Record<string, string> = {};
    if (!harvestForm.quantityKg.trim()) {
      newErrors.quantityKg = 'Quantity is required';
    } else if (isNaN(Number(harvestForm.quantityKg)) || Number(harvestForm.quantityKg) <= 0) {
      newErrors.quantityKg = 'Quantity must be greater than 0';
    }
    (['count', 'unitPrice', 'revenue'] as const).forEach((field) => {
      if (harvestForm[field].trim() && isNaN(Number(harvestForm[field]))) {
        newErrors[field] = 'Must be a number';
      }
    });
    if (!isDate(harvestForm.harvestedAt)) newErrors.harvestedAt = 'Use a valid YYYY-MM-DD date';
    setHarvestErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting('harvests');
    try {
      await aquacultureAPI.createHarvest(id, {
        quantityKg: Number(harvestForm.quantityKg),
        count: harvestForm.count.trim() ? Number(harvestForm.count) : undefined,
        unitPrice: harvestForm.unitPrice.trim() ? Number(harvestForm.unitPrice) : undefined,
        revenue: harvestForm.revenue.trim() ? Number(harvestForm.revenue) : undefined,
        harvestedAt: harvestForm.harvestedAt,
        notes: harvestForm.notes.trim() || undefined,
      });
      success('Harvest recorded successfully');
      setActiveModal(null);
      setHarvestForm({
        quantityKg: '',
        count: '',
        unitPrice: '',
        revenue: '',
        harvestedAt: today(),
        notes: '',
      });
      fetchHarvests();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to add harvest.'));
    } finally {
      setSubmitting(null);
    }
  };

  const renderSectionBody = <T extends { id: string }>(
    key: SectionKey,
    items: T[],
    renderRow: (item: T) => React.ReactNode,
    emptyLabel: string
  ) => {
    if (sectionsLoading[key]) {
      return (
        <View style={styles.sectionLoading}>
          <Text style={styles.sectionLoadingText}>Loading…</Text>
        </View>
      );
    }
    if (items.length === 0) {
      return (
        <View style={styles.sectionEmpty}>
          <Text style={styles.sectionEmptyText}>{emptyLabel}</Text>
        </View>
      );
    }
    return <View>{items.map((item) => renderRow(item))}</View>;
  };

  const renderModalForm = () => {
    switch (activeModal) {
      case 'stockings':
        return (
          <>
            <Text style={styles.modalTitle}>Add Stocking</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <TextInputField
                  label="Species *"
                  placeholder="e.g. Tilapia, Catfish, Shrimp"
                  value={stockingForm.species}
                  onChangeText={(v) => {
                    setStockingForm((prev) => ({ ...prev, species: v }));
                    if (stockingErrors.species) setStockingErrors((p) => ({ ...p, species: '' }));
                  }}
                  error={stockingErrors.species}
                />
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Strain"
                  placeholder="e.g. GIFT, Hawaii"
                  value={stockingForm.strain}
                  onChangeText={(v) => setStockingForm((prev) => ({ ...prev, strain: v }))}
                />
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Count *"
                  placeholder="Number of fingerlings / seeds"
                  value={stockingForm.count}
                  onChangeText={(v) => {
                    setStockingForm((prev) => ({ ...prev, count: v }));
                    if (stockingErrors.count) setStockingErrors((p) => ({ ...p, count: '' }));
                  }}
                  keyboardType="numeric"
                  error={stockingErrors.count}
                />
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Source"
                  placeholder="e.g. local hatchery"
                  value={stockingForm.source}
                  onChangeText={(v) => setStockingForm((prev) => ({ ...prev, source: v }))}
                />
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Total Cost"
                  placeholder="Total cost of stocking"
                  value={stockingForm.totalCost}
                  onChangeText={(v) => {
                    setStockingForm((prev) => ({ ...prev, totalCost: v }));
                    if (stockingErrors.totalCost) setStockingErrors((p) => ({ ...p, totalCost: '' }));
                  }}
                  keyboardType="numeric"
                  error={stockingErrors.totalCost}
                />
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Stocked At *"
                  placeholder="YYYY-MM-DD"
                  value={stockingForm.stockedAt}
                  onChangeText={(v) => {
                    setStockingForm((prev) => ({ ...prev, stockedAt: v }));
                    if (stockingErrors.stockedAt) setStockingErrors((p) => ({ ...p, stockedAt: '' }));
                  }}
                  error={stockingErrors.stockedAt}
                />
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Expected Harvest"
                  placeholder="YYYY-MM-DD (optional)"
                  value={stockingForm.expectedHarvestAt}
                  onChangeText={(v) => {
                    setStockingForm((prev) => ({ ...prev, expectedHarvestAt: v }));
                    if (stockingErrors.expectedHarvestAt) {
                      setStockingErrors((p) => ({ ...p, expectedHarvestAt: '' }));
                    }
                  }}
                  error={stockingErrors.expectedHarvestAt}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.chipRow}>
                  {STOCKING_STATUSES.map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.chip, stockingForm.status === status && styles.chipActive]}
                      onPress={() => setStockingForm((prev) => ({ ...prev, status }))}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          stockingForm.status === status && styles.chipTextActive,
                        ]}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Notes"
                  placeholder="Optional notes"
                  value={stockingForm.notes}
                  onChangeText={(v) => setStockingForm((prev) => ({ ...prev, notes: v }))}
                />
              </View>
              <View style={styles.modalButtons}>
                <Button title="Cancel" onPress={closeModal} variant="secondary" style={{ flex: 1 }} />
                <Button
                  title="Add Stocking"
                  onPress={handleAddStocking}
                  loading={submitting === 'stockings'}
                  disabled={submitting === 'stockings'}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </>
        );

      case 'feedings':
        return (
          <>
            <Text style={styles.modalTitle}>Add Feeding</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <TextInputField
                  label="Feed Type *"
                  placeholder="e.g. pellets, bran, live feed"
                  value={feedingForm.feedType}
                  onChangeText={(v) => {
                    setFeedingForm((prev) => ({ ...prev, feedType: v }));
                    if (feedingErrors.feedType) setFeedingErrors((p) => ({ ...p, feedType: '' }));
                  }}
                  error={feedingErrors.feedType}
                />
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Quantity (kg) *"
                  placeholder="Amount fed in kg"
                  value={feedingForm.quantityKg}
                  onChangeText={(v) => {
                    setFeedingForm((prev) => ({ ...prev, quantityKg: v }));
                    if (feedingErrors.quantityKg) setFeedingErrors((p) => ({ ...p, quantityKg: '' }));
                  }}
                  keyboardType="numeric"
                  error={feedingErrors.quantityKg}
                />
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Cost"
                  placeholder="Cost of this feeding (optional)"
                  value={feedingForm.cost}
                  onChangeText={(v) => {
                    setFeedingForm((prev) => ({ ...prev, cost: v }));
                    if (feedingErrors.cost) setFeedingErrors((p) => ({ ...p, cost: '' }));
                  }}
                  keyboardType="numeric"
                  error={feedingErrors.cost}
                />
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Fed At *"
                  placeholder="YYYY-MM-DD"
                  value={feedingForm.fedAt}
                  onChangeText={(v) => {
                    setFeedingForm((prev) => ({ ...prev, fedAt: v }));
                    if (feedingErrors.fedAt) setFeedingErrors((p) => ({ ...p, fedAt: '' }));
                  }}
                  error={feedingErrors.fedAt}
                />
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Notes"
                  placeholder="Optional notes"
                  value={feedingForm.notes}
                  onChangeText={(v) => setFeedingForm((prev) => ({ ...prev, notes: v }))}
                />
              </View>
              <View style={styles.modalButtons}>
                <Button title="Cancel" onPress={closeModal} variant="secondary" style={{ flex: 1 }} />
                <Button
                  title="Add Feeding"
                  onPress={handleAddFeeding}
                  loading={submitting === 'feedings'}
                  disabled={submitting === 'feedings'}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </>
        );

      case 'waterQuality':
        return (
          <>
            <Text style={styles.modalTitle}>Add Water Quality</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <TextInputField
                  label="pH"
                  placeholder="e.g. 7.5"
                  value={wqForm.ph}
                  onChangeText={(v) => {
                    setWqForm((prev) => ({ ...prev, ph: v }));
                    if (wqErrors.ph) setWqErrors((p) => ({ ...p, ph: '' }));
                  }}
                  keyboardType="numeric"
                  error={wqErrors.ph}
                />
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Temperature (°C)"
                  placeholder="e.g. 28"
                  value={wqForm.temperatureC}
                  onChangeText={(v) => {
                    setWqForm((prev) => ({ ...prev, temperatureC: v }));
                    if (wqErrors.temperatureC) setWqErrors((p) => ({ ...p, temperatureC: '' }));
                  }}
                  keyboardType="numeric"
                  error={wqErrors.temperatureC}
                />
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Dissolved Oxygen"
                  placeholder="e.g. 5.5"
                  value={wqForm.dissolvedOxygen}
                  onChangeText={(v) => {
                    setWqForm((prev) => ({ ...prev, dissolvedOxygen: v }));
                    if (wqErrors.dissolvedOxygen) setWqErrors((p) => ({ ...p, dissolvedOxygen: '' }));
                  }}
                  keyboardType="numeric"
                  error={wqErrors.dissolvedOxygen}
                />
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Ammonia"
                  placeholder="e.g. 0.25"
                  value={wqForm.ammonia}
                  onChangeText={(v) => {
                    setWqForm((prev) => ({ ...prev, ammonia: v }));
                    if (wqErrors.ammonia) setWqErrors((p) => ({ ...p, ammonia: '' }));
                  }}
                  keyboardType="numeric"
                  error={wqErrors.ammonia}
                />
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Turbidity"
                  placeholder="e.g. 30"
                  value={wqForm.turbidity}
                  onChangeText={(v) => {
                    setWqForm((prev) => ({ ...prev, turbidity: v }));
                    if (wqErrors.turbidity) setWqErrors((p) => ({ ...p, turbidity: '' }));
                  }}
                  keyboardType="numeric"
                  error={wqErrors.turbidity}
                />
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Recorded At *"
                  placeholder="YYYY-MM-DD"
                  value={wqForm.recordedAt}
                  onChangeText={(v) => {
                    setWqForm((prev) => ({ ...prev, recordedAt: v }));
                    if (wqErrors.recordedAt) setWqErrors((p) => ({ ...p, recordedAt: '' }));
                  }}
                  error={wqErrors.recordedAt}
                />
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Notes"
                  placeholder="Optional notes"
                  value={wqForm.notes}
                  onChangeText={(v) => setWqForm((prev) => ({ ...prev, notes: v }))}
                />
              </View>
              <View style={styles.modalButtons}>
                <Button title="Cancel" onPress={closeModal} variant="secondary" style={{ flex: 1 }} />
                <Button
                  title="Add Reading"
                  onPress={handleAddWaterQuality}
                  loading={submitting === 'waterQuality'}
                  disabled={submitting === 'waterQuality'}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </>
        );

      case 'harvests':
        return (
          <>
            <Text style={styles.modalTitle}>Add Harvest</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <TextInputField
                  label="Quantity (kg) *"
                  placeholder="Harvested weight in kg"
                  value={harvestForm.quantityKg}
                  onChangeText={(v) => {
                    setHarvestForm((prev) => ({ ...prev, quantityKg: v }));
                    if (harvestErrors.quantityKg) setHarvestErrors((p) => ({ ...p, quantityKg: '' }));
                  }}
                  keyboardType="numeric"
                  error={harvestErrors.quantityKg}
                />
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Count"
                  placeholder="Number of animals harvested"
                  value={harvestForm.count}
                  onChangeText={(v) => {
                    setHarvestForm((prev) => ({ ...prev, count: v }));
                    if (harvestErrors.count) setHarvestErrors((p) => ({ ...p, count: '' }));
                  }}
                  keyboardType="numeric"
                  error={harvestErrors.count}
                />
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Unit Price"
                  placeholder="Price per kg"
                  value={harvestForm.unitPrice}
                  onChangeText={(v) => {
                    setHarvestForm((prev) => ({ ...prev, unitPrice: v }));
                    if (harvestErrors.unitPrice) setHarvestErrors((p) => ({ ...p, unitPrice: '' }));
                  }}
                  keyboardType="numeric"
                  error={harvestErrors.unitPrice}
                />
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Revenue"
                  placeholder="Total revenue from this harvest"
                  value={harvestForm.revenue}
                  onChangeText={(v) => {
                    setHarvestForm((prev) => ({ ...prev, revenue: v }));
                    if (harvestErrors.revenue) setHarvestErrors((p) => ({ ...p, revenue: '' }));
                  }}
                  keyboardType="numeric"
                  error={harvestErrors.revenue}
                />
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Harvested At *"
                  placeholder="YYYY-MM-DD"
                  value={harvestForm.harvestedAt}
                  onChangeText={(v) => {
                    setHarvestForm((prev) => ({ ...prev, harvestedAt: v }));
                    if (harvestErrors.harvestedAt) setHarvestErrors((p) => ({ ...p, harvestedAt: '' }));
                  }}
                  error={harvestErrors.harvestedAt}
                />
              </View>
              <View style={styles.formGroup}>
                <TextInputField
                  label="Notes"
                  placeholder="Optional notes"
                  value={harvestForm.notes}
                  onChangeText={(v) => setHarvestForm((prev) => ({ ...prev, notes: v }))}
                />
              </View>
              <View style={styles.modalButtons}>
                <Button title="Cancel" onPress={closeModal} variant="secondary" style={{ flex: 1 }} />
                <Button
                  title="Add Harvest"
                  onPress={handleAddHarvest}
                  loading={submitting === 'harvests'}
                  disabled={submitting === 'harvests'}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pond Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScreenLoading message="Loading pond details…" />
      </SafeAreaView>
    );
  }

  if (loadError || !pond) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pond Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load pond"
          message={loadError || 'Pond not found'}
          onRetry={fetchPond}
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
        <Text style={styles.headerTitle}>Pond Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.pondCard}>
          <Text style={styles.pondName}>{pond.name}</Text>
          <View style={styles.badgeRow}>
            <View style={{ backgroundColor: POND_TYPE_COLORS[pond.pondType]?.bg || '#F3F4F6', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: POND_TYPE_COLORS[pond.pondType]?.text || '#6B7280' }}>
                {pond.pondType || 'FISH'}
              </Text>
            </View>
            <View style={{ backgroundColor: POND_STATUS_COLORS[pond.status]?.bg || '#F3F4F6', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: POND_STATUS_COLORS[pond.status]?.text || '#6B7280' }}>
                {pond.status ? pond.status.charAt(0).toUpperCase() + pond.status.slice(1) : '—'}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 14, color: colors.textLight, marginBottom: 8 }}>
            🌊 {farmNames[pond.farmId] || 'Farm'}
            {pond.waterSource ? ` · Water source: ${pond.waterSource}` : ''}
          </Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Area</Text>
              <Text style={styles.statValue}>{pond.area ?? '—'} ha</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Capacity</Text>
              <Text style={styles.statValue}>{pond.capacity ?? '—'}</Text>
            </View>
          </View>

          {pond.notes ? (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Notes</Text>
              <Text style={styles.detailValue}>{pond.notes}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Stockings</Text>
            {canWrite && (
              <TouchableOpacity
                style={styles.sectionAdd}
                onPress={() => openModal('stockings')}
                accessibilityRole="button"
                accessibilityLabel="Add stocking"
              >
                <Text style={styles.sectionAddText}>+</Text>
              </TouchableOpacity>
            )}
          </View>
          {renderSectionBody(
            'stockings',
            stockings,
            (item) => (
              <SectionRow
                key={item.id}
                title={`${item.species} · ${item.count.toLocaleString()} pcs`}
                subtitle={[
                  item.strain || item.source || '',
                  `Stocked ${item.stockedAt}`,
                  item.status && item.status !== 'ongoing' ? item.status : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
                onDelete={
                  canDelete
                    ? () =>
                        confirmDeleteRecord(
                          'Delete Stocking',
                          () => aquacultureAPI.deleteStocking(item.id).then(() => undefined),
                          'Failed to delete stocking.',
                          fetchStockings
                        )
                    : undefined
                }
                deleteLabel="Delete stocking"
              />
            ),
            'No stockings recorded yet'
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Feedings</Text>
            {canWrite && (
              <TouchableOpacity
                style={styles.sectionAdd}
                onPress={() => openModal('feedings')}
                accessibilityRole="button"
                accessibilityLabel="Add feeding"
              >
                <Text style={styles.sectionAddText}>+</Text>
              </TouchableOpacity>
            )}
          </View>
          {renderSectionBody(
            'feedings',
            feedings,
            (item) => (
              <SectionRow
                key={item.id}
                title={`${item.quantityKg} kg · ${item.feedType}`}
                subtitle={[`Fed ${item.fedAt}`, item.cost != null ? `Cost ${item.cost}` : '']
                  .filter(Boolean)
                  .join(' · ')}
                onDelete={
                  canDelete
                    ? () =>
                        confirmDeleteRecord(
                          'Delete Feeding',
                          () => aquacultureAPI.deleteFeeding(item.id).then(() => undefined),
                          'Failed to delete feeding.',
                          fetchFeedings
                        )
                    : undefined
                }
                deleteLabel="Delete feeding"
              />
            ),
            'No feedings recorded yet'
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Water Quality</Text>
            {canWrite && (
              <TouchableOpacity
                style={styles.sectionAdd}
                onPress={() => openModal('waterQuality')}
                accessibilityRole="button"
                accessibilityLabel="Add water quality record"
              >
                <Text style={styles.sectionAddText}>+</Text>
              </TouchableOpacity>
            )}
          </View>
          {renderSectionBody(
            'waterQuality',
            waterQuality,
            (item) => (
              <SectionRow
                key={item.id}
                title={[
                  item.ph != null ? `pH ${item.ph}` : '',
                  item.temperatureC != null ? `${item.temperatureC}°C` : '',
                  item.dissolvedOxygen != null ? `DO ${item.dissolvedOxygen}` : '',
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Reading'}
                subtitle={[
                  `Recorded ${item.recordedAt}`,
                  item.ammonia != null ? `Ammonia ${item.ammonia}` : '',
                  item.turbidity != null ? `Turbidity ${item.turbidity}` : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
                onDelete={
                  canDelete
                    ? () =>
                        confirmDeleteRecord(
                          'Delete Water Quality Record',
                          () => aquacultureAPI.deleteWaterQuality(item.id).then(() => undefined),
                          'Failed to delete water quality record.',
                          fetchWaterQuality
                        )
                    : undefined
                }
                deleteLabel="Delete water quality record"
              />
            ),
            'No water quality records yet'
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Harvests</Text>
            {canWrite && (
              <TouchableOpacity
                style={styles.sectionAdd}
                onPress={() => openModal('harvests')}
                accessibilityRole="button"
                accessibilityLabel="Add harvest"
              >
                <Text style={styles.sectionAddText}>+</Text>
              </TouchableOpacity>
            )}
          </View>
          {renderSectionBody(
            'harvests',
            harvests,
            (item) => (
              <SectionRow
                key={item.id}
                title={`${item.quantityKg} kg${item.count != null ? ` · ${item.count} pcs` : ''}`}
                subtitle={[
                  `Harvested ${item.harvestedAt}`,
                  item.revenue != null ? `Revenue ${item.revenue}` : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
                onDelete={
                  canDelete
                    ? () =>
                        confirmDeleteRecord(
                          'Delete Harvest',
                          () => aquacultureAPI.deleteHarvest(item.id).then(() => undefined),
                          'Failed to delete harvest.',
                          fetchHarvests
                        )
                    : undefined
                }
                deleteLabel="Delete harvest"
              />
            ),
            'No harvests recorded yet'
          )}
        </View>

        {(canWrite || canDelete) && (
          <View style={styles.actionsContainer}>
            {canWrite && (
              <Button
                title="Edit"
                onPress={() => router.push(`/aquaculture/${pond.id}/edit`)}
                style={styles.actionButton}
                variant="secondary"
              />
            )}
            {canDelete && (
              <Button
                title="Delete"
                onPress={handleDelete}
                style={styles.deleteAction}
              />
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={activeModal !== null}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closeModal}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>{renderModalForm()}</View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
