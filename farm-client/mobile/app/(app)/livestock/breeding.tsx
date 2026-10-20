import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { breedingAPI, livestockAPI } from '@/modules/livestock';
import type { BreedingRecord, Livestock } from '@/modules/livestock';
import { Button, Card, TextInputField } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { MenuButton } from '@/core/ui/MenuButton';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const value = payload as { data?: unknown; items?: unknown };
    if (Array.isArray(value.data)) return value.data as T[];
    if (Array.isArray(value.items)) return value.items as T[];
  }
  return [];
}

function todayAsDateInput(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export default function LivestockBreedingScreen() {
  const router = useRouter();
  const { colors: themeColors } = useAppTheme();
  const { hasPermission } = usePermission();
  const { success, error: showError } = useToasts();
  const canWrite = hasPermission('livestock.write');
  const [records, setRecords] = useState<BreedingRecord[]>([]);
  const [animals, setAnimals] = useState<Livestock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [animalError, setAnimalError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [expandedPicker, setExpandedPicker] = useState<'sireId' | 'damId' | null>(null);
  const [form, setForm] = useState({
    sireId: '',
    damId: '',
    breedingDate: todayAsDateInput(),
    expectedDueDate: '',
    notes: '',
  });

  const loadRecords = useCallback(async () => {
    try {
      setLoadError(null);
      const [recordsResponse, livestockResponse] = await Promise.all([
        breedingAPI.list(),
        livestockAPI.list({ limit: 100 }),
      ]);
      setRecords(unwrapList<BreedingRecord>(recordsResponse.data));
      setAnimals(unwrapList<Livestock>(livestockResponse.data));
      setAnimalError(null);
    } catch (error) {
      setLoadError(describeApiError(error, 'Failed to load breeding records.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const animalNames = useMemo(
    () => new Map(animals.map((animal) => [animal.id, animal.species])),
    [animals]
  );
  const sires = useMemo(
    () => animals.filter((animal) => animal.gender.toUpperCase() === 'MALE'),
    [animals]
  );
  const dams = useMemo(
    () => animals.filter((animal) => animal.gender.toUpperCase() === 'FEMALE'),
    [animals]
  );

  const startCreate = () => {
    setForm({
      sireId: '',
      damId: '',
      breedingDate: todayAsDateInput(),
      expectedDueDate: '',
      notes: '',
    });
    setFormError('');
    setAnimalError(null);
    setExpandedPicker(null);
    setShowForm(true);
    void livestockAPI.list({ limit: 100 }).then((response) => {
      setAnimals(unwrapList<Livestock>(response.data));
    }).catch((error) => {
      setAnimalError(describeApiError(error, 'Could not load livestock options.'));
    });
  };

  const saveRecord = async () => {
    if (!form.sireId || !form.damId) {
      setFormError('Select both a sire and a dam.');
      return;
    }
    if (form.sireId === form.damId) {
      setFormError('Sire and dam must be different animals.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.breedingDate) || Number.isNaN(Date.parse(form.breedingDate))) {
      setFormError('Enter a valid breeding date in YYYY-MM-DD format.');
      return;
    }
    if (
      form.expectedDueDate &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(form.expectedDueDate) || Number.isNaN(Date.parse(form.expectedDueDate)))
    ) {
      setFormError('Enter a valid expected due date in YYYY-MM-DD format.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      await breedingAPI.create({
        sireId: form.sireId,
        damId: form.damId,
        breedingDate: form.breedingDate,
        expectedDueDate: form.expectedDueDate || undefined,
        notes: form.notes.trim() || undefined,
      });
      setShowForm(false);
      success('Breeding record added.');
      await loadRecords();
    } catch (error) {
      showError(describeApiError(error, 'Failed to add breeding record.'));
    } finally {
      setSaving(false);
    }
  };

  const markCompleted = (record: BreedingRecord) => {
    Alert.alert('Complete breeding record', 'Mark this breeding record as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            await breedingAPI.update(record.id, { status: 'COMPLETED' });
            success('Breeding record updated.');
            await loadRecords();
          } catch (error) {
            showError(describeApiError(error, 'Failed to update breeding record.'));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header />
        <ScreenLoading message="Loading breeding records…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header />
        <StateView
          variant="error"
          title="Couldn't load breeding records"
          message={loadError}
          onRetry={() => void loadRecords()}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Header />
      <View style={styles.content}>
        <Text style={[styles.intro, { color: themeColors.textSecondary }]}>
          Track breeding pairs, breeding dates, and expected due dates.
        </Text>
        {canWrite && <Button title="Add breeding record" onPress={startCreate} />}
      </View>
      <FlatList
        data={records}
        keyExtractor={(record) => record.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadRecords();
            }}
            tintColor={themeColors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🐮</Text>
            <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No breeding records yet</Text>
            {canWrite && <Button title="Add first record" onPress={startCreate} />}
          </View>
        }
        renderItem={({ item }) => {
          const status = item.status || 'BRED';
          return (
            <Card style={[styles.recordCard, { backgroundColor: themeColors.card }]}>
              <View style={styles.recordHeader}>
                <Text style={[styles.recordTitle, { color: themeColors.text }]}>
                  {item.sireName || animalNames.get(item.sireId) || 'Sire'} ×{' '}
                  {item.damName || animalNames.get(item.damId) || 'Dam'}
                </Text>
                <Text style={[styles.status, { color: themeColors.primary }]}>{status}</Text>
              </View>
              <InfoRow label="Breeding date" value={formatDate(item.breedingDate)} />
              <InfoRow label="Expected due" value={formatDate(item.expectedDueDate)} />
              <InfoRow label="Actual birth" value={formatDate(item.actualBirthDate)} />
              {item.offspringCount != null && (
                <InfoRow label="Offspring" value={String(item.offspringCount)} />
              )}
              {!!item.notes && <Text style={[styles.notes, { color: themeColors.textSecondary }]}>{item.notes}</Text>}
              {canWrite && status !== 'COMPLETED' && status !== 'FAILED' && (
                <TouchableOpacity
                  onPress={() => markCompleted(item)}
                  style={[styles.completeButton, { borderTopColor: themeColors.border }]}
                  accessibilityRole="button"
                  accessibilityLabel="Mark breeding record completed"
                >
                  <Text style={[styles.completeText, { color: themeColors.primary }]}>Mark completed</Text>
                </TouchableOpacity>
              )}
            </Card>
          );
        }}
      />
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Add breeding record</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <AnimalPicker
                label="Sire"
                animals={sires}
                selectedId={form.sireId}
                expanded={expandedPicker === 'sireId'}
                onToggle={() => setExpandedPicker(expandedPicker === 'sireId' ? null : 'sireId')}
                onSelect={(sireId) => {
                  setForm({ ...form, sireId });
                  setExpandedPicker(null);
                }}
              />
              <AnimalPicker
                label="Dam"
                animals={dams}
                selectedId={form.damId}
                expanded={expandedPicker === 'damId'}
                onToggle={() => setExpandedPicker(expandedPicker === 'damId' ? null : 'damId')}
                onSelect={(damId) => {
                  setForm({ ...form, damId });
                  setExpandedPicker(null);
                }}
              />
              <TextInputField
                label="Breeding date (YYYY-MM-DD)"
                value={form.breedingDate}
                onChangeText={(breedingDate) => setForm({ ...form, breedingDate })}
                accessibilityLabel="Breeding date"
              />
              <TextInputField
                label="Expected due date (optional)"
                value={form.expectedDueDate}
                onChangeText={(expectedDueDate) => setForm({ ...form, expectedDueDate })}
                accessibilityLabel="Expected due date"
              />
              <TextInputField
                label="Notes (optional)"
                value={form.notes}
                onChangeText={(notes) => setForm({ ...form, notes })}
                accessibilityLabel="Breeding notes"
              />
              {!!animalError && (
                <TouchableOpacity
                  onPress={() => {
                    setAnimalError(null);
                    void livestockAPI.list({ limit: 100 }).then((response) => {
                      setAnimals(unwrapList<Livestock>(response.data));
                    }).catch((error) => {
                      setAnimalError(describeApiError(error, 'Could not load livestock options.'));
                    });
                  }}
                >
                  <Text style={styles.error}>{animalError} Tap to retry.</Text>
                </TouchableOpacity>
              )}
              {!!formError && <Text style={styles.error}>{formError}</Text>}
              <View style={styles.actions}>
                <Button title="Cancel" variant="secondary" onPress={() => setShowForm(false)} disabled={saving} />
                <Button title="Save record" onPress={() => void saveRecord()} loading={saving} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Header() {
  const router = useRouter();
  const { colors: themeColors } = useAppTheme();
  return (
    <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}>
      <TouchableOpacity onPress={() => router.push('/livestock')} accessibilityRole="button" accessibilityLabel="Back to livestock">
        <Text style={styles.back}>‹</Text>
      </TouchableOpacity>
      <MenuButton />
      <Text style={styles.headerTitle}>Breeding</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors: themeColors } = useAppTheme();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: themeColors.text }]}>{value}</Text>
    </View>
  );
}

function AnimalPicker({
  label,
  animals,
  selectedId,
  expanded,
  onToggle,
  onSelect,
}: {
  label: string;
  animals: Livestock[];
  selectedId: string;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
}) {
  const { colors: themeColors } = useAppTheme();
  const selected = animals.find((animal) => animal.id === selectedId);
  return (
    <View style={styles.pickerGroup}>
      <Text style={[styles.label, { color: themeColors.text }]}>{label}</Text>
      <TouchableOpacity
        onPress={onToggle}
        style={[styles.pickerButton, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={{ color: themeColors.text }}>
          {selected ? `${selected.species}${selected.breed ? ` · ${selected.breed}` : ''}` : `Select ${label.toLowerCase()}`}
        </Text>
        <Text style={{ color: themeColors.textSecondary }}>⌄</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={[styles.options, { borderColor: themeColors.border }]}>
          {animals.length ? animals.map((animal) => (
            <TouchableOpacity
              key={animal.id}
              style={[styles.option, { borderBottomColor: themeColors.border }]}
              onPress={() => onSelect(animal.id)}
            >
              <Text style={{ color: themeColors.text }}>
                {animal.species}{animal.breed ? ` · ${animal.breed}` : ''}
              </Text>
            </TouchableOpacity>
          )) : (
            <Text style={[styles.option, { color: themeColors.textSecondary }]}>
              No {label.toLowerCase()} livestock available.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  back: { color: '#FFFFFF', fontSize: 32, lineHeight: 34 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', flex: 1 },
  content: { padding: 16, paddingBottom: 8 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  list: { padding: 16, paddingTop: 4, flexGrow: 1 },
  recordCard: { padding: 16, marginBottom: 12 },
  recordHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  recordTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  status: { fontSize: 11, fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: '600', textAlign: 'right' },
  notes: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  completeButton: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 12 },
  completeText: { fontWeight: '700', textAlign: 'right' },
  empty: { flex: 1, minHeight: 250, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { maxHeight: '90%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  pickerGroup: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  pickerButton: { minHeight: 46, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  options: { borderWidth: 1, borderRadius: 8, marginTop: 6, maxHeight: 150 },
  option: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  error: { color: '#B91C1C', fontSize: 13, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10, marginVertical: 10 },
});
