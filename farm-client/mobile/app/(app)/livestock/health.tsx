import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { livestockAPI, livestockHealthAPI } from '@/modules/livestock';
import type { HealthRecord, Livestock } from '@/modules/livestock';
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
    const value = payload as { data?: unknown; items?: unknown; livestock?: unknown };
    if (Array.isArray(value.data)) return value.data as T[];
    if (Array.isArray(value.items)) return value.items as T[];
    if (Array.isArray(value.livestock)) return value.livestock as T[];
  }
  return [];
}

function todayAsDateInput(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export default function LivestockHealthScreen() {
  const router = useRouter();
  const { livestockId } = useLocalSearchParams<{ livestockId?: string }>();
  const { colors: themeColors } = useAppTheme();
  const { hasPermission } = usePermission();
  const { success, error: showError } = useToasts();
  const canWrite = hasPermission('livestock.write');
  const [animals, setAnimals] = useState<Livestock[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<Livestock | null>(null);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    type: '',
    description: '',
    date: todayAsDateInput(),
    veterinarian: '',
    medications: '',
    cost: '',
    nextCheckupDate: '',
  });

  const loadAnimals = useCallback(async () => {
    try {
      setLoadError(null);
      const response = await livestockAPI.list({ limit: 100 });
      const list = unwrapList<Livestock>(response.data);
      setAnimals(list);
      if (livestockId) {
        const match = list.find((animal) => animal.id === livestockId);
        if (match) setSelectedAnimal(match);
      }
    } catch (error) {
      setLoadError(describeApiError(error, 'Failed to load livestock.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [livestockId]);

  const loadRecords = useCallback(async (animalId: string) => {
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const response = await livestockHealthAPI.listByAnimal(animalId);
      setRecords(unwrapList<HealthRecord>(response.data));
    } catch (error) {
      setRecords([]);
      setRecordsError(describeApiError(error, 'Failed to load this animal’s health records.'));
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnimals();
  }, [loadAnimals]);

  useEffect(() => {
    if (!selectedAnimal) {
      setRecords([]);
      return;
    }
    void loadRecords(selectedAnimal.id);
  }, [selectedAnimal, loadRecords]);

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [records]
  );

  const selectAnimal = (animal: Livestock) => {
    setSelectedAnimal(animal);
    router.setParams({ livestockId: animal.id });
  };

  const openForm = () => {
    setForm({
      type: '',
      description: '',
      date: todayAsDateInput(),
      veterinarian: '',
      medications: '',
      cost: '',
      nextCheckupDate: '',
    });
    setFormError('');
    setShowForm(true);
  };

  const saveRecord = async () => {
    if (!selectedAnimal) return;
    if (!form.type.trim() || !form.description.trim()) {
      setFormError('Record type and description are required.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) || Number.isNaN(Date.parse(form.date))) {
      setFormError('Enter a valid record date in YYYY-MM-DD format.');
      return;
    }
    if (form.nextCheckupDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.nextCheckupDate)) {
      setFormError('Enter the next checkup date in YYYY-MM-DD format.');
      return;
    }
    if (form.cost && (!Number.isFinite(Number(form.cost)) || Number(form.cost) < 0)) {
      setFormError('Cost must be a non-negative number.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      await livestockHealthAPI.create(selectedAnimal.id, {
        type: form.type.trim(),
        description: form.description.trim(),
        date: form.date,
        veterinarian: form.veterinarian.trim() || undefined,
        medications: form.medications.trim() || undefined,
        cost: form.cost ? Number(form.cost) : undefined,
        nextCheckupDate: form.nextCheckupDate || undefined,
      });
      setShowForm(false);
      success('Health record added.');
      await loadRecords(selectedAnimal.id);
    } catch (error) {
      showError(describeApiError(error, 'Failed to add health record.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header />
        <ScreenLoading message="Loading livestock health…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header />
        <StateView
          variant="error"
          title="Couldn't load livestock"
          message={loadError}
          onRetry={() => void loadAnimals()}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Header />
      <FlatList
        data={animals}
        keyExtractor={(animal) => animal.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadAnimals();
              if (selectedAnimal) void loadRecords(selectedAnimal.id);
            }}
            tintColor={themeColors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <Text style={[styles.intro, { color: themeColors.textSecondary }]}>
              Select an animal to review its health history and add a care record.
            </Text>
            {selectedAnimal && (
              <Card style={[styles.selectedCard, { backgroundColor: themeColors.card }]}>
                <View style={styles.selectedHeading}>
                  <View style={styles.flex}>
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                      {selectedAnimal.species} health history
                    </Text>
                    <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
                      {selectedAnimal.breed || 'Breed not specified'} · {selectedAnimal.status}
                    </Text>
                  </View>
                  {canWrite && <Button title="Add record" onPress={openForm} />}
                </View>
                {recordsLoading ? (
                  <ActivityIndicator color={themeColors.primary} style={styles.spinner} />
                ) : recordsError ? (
                  <View>
                    <Text style={styles.error}>{recordsError}</Text>
                    <Button title="Retry" variant="secondary" onPress={() => void loadRecords(selectedAnimal.id)} />
                  </View>
                ) : sortedRecords.length === 0 ? (
                  <Text style={[styles.empty, { color: themeColors.textSecondary }]}>
                    No health records have been added for this animal.
                  </Text>
                ) : (
                  sortedRecords.map((record) => (
                    <View key={record.id} style={[styles.record, { borderTopColor: themeColors.border }]}>
                      <View style={styles.recordHeading}>
                        <Text style={[styles.recordTitle, { color: themeColors.text }]}>{record.type}</Text>
                        <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
                          {formatDate(record.date)}
                        </Text>
                      </View>
                      <Text style={[styles.description, { color: themeColors.text }]}>{record.description}</Text>
                      {!!record.veterinarian && (
                        <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
                          Veterinarian: {record.veterinarian}
                        </Text>
                      )}
                      {!!record.medications && (
                        <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
                          Medications: {record.medications}
                        </Text>
                      )}
                      {record.cost != null && (
                        <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
                          Cost: {Number(record.cost).toLocaleString()}
                        </Text>
                      )}
                      {!!record.nextCheckupDate && (
                        <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
                          Next checkup: {formatDate(record.nextCheckupDate)}
                        </Text>
                      )}
                    </View>
                  ))
                )}
              </Card>
            )}
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Select livestock</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: themeColors.textSecondary }]}>No livestock available.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Health records for ${item.species}`}
            onPress={() => selectAnimal(item)}
          >
            <Card
              style={[
                styles.animalCard,
                {
                  backgroundColor: themeColors.card,
                  borderColor: selectedAnimal?.id === item.id ? themeColors.primary : themeColors.border,
                },
              ]}
            >
              <View style={styles.animalRow}>
                <Text style={styles.animalIcon}>🐄</Text>
                <View style={styles.flex}>
                  <Text style={[styles.animalName, { color: themeColors.text }]}>{item.species}</Text>
                  <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
                    {item.breed || 'Breed not specified'} · {item.gender} · {item.status}
                  </Text>
                </View>
                <Text style={[styles.chevron, { color: themeColors.textSecondary }]}>›</Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Add health record</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TextInputField
                label="Record type"
                value={form.type}
                onChangeText={(type) => setForm({ ...form, type })}
                accessibilityLabel="Record type"
              />
              <TextInputField
                label="Description"
                value={form.description}
                onChangeText={(description) => setForm({ ...form, description })}
                accessibilityLabel="Description"
              />
              <TextInputField
                label="Date (YYYY-MM-DD)"
                value={form.date}
                onChangeText={(date) => setForm({ ...form, date })}
                accessibilityLabel="Health record date"
              />
              <TextInputField
                label="Veterinarian (optional)"
                value={form.veterinarian}
                onChangeText={(veterinarian) => setForm({ ...form, veterinarian })}
                accessibilityLabel="Veterinarian"
              />
              <TextInputField
                label="Medications (optional)"
                value={form.medications}
                onChangeText={(medications) => setForm({ ...form, medications })}
                accessibilityLabel="Medications"
              />
              <TextInputField
                label="Cost (optional)"
                value={form.cost}
                onChangeText={(cost) => setForm({ ...form, cost })}
                keyboardType="numeric"
                accessibilityLabel="Health record cost"
              />
              <TextInputField
                label="Next checkup (YYYY-MM-DD, optional)"
                value={form.nextCheckupDate}
                onChangeText={(nextCheckupDate) => setForm({ ...form, nextCheckupDate })}
                accessibilityLabel="Next checkup date"
              />
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
      <Text style={styles.headerTitle}>Health</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  back: { color: '#FFFFFF', fontSize: 32, lineHeight: 34 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', flex: 1 },
  content: { padding: 16, paddingBottom: 28, flexGrow: 1 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  selectedCard: { padding: 16, marginBottom: 18 },
  selectedHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  flex: { flex: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10 },
  meta: { fontSize: 13, marginTop: 3 },
  spinner: { padding: 20 },
  empty: { paddingVertical: 14, fontSize: 14, textAlign: 'center' },
  record: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 12 },
  recordHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  recordTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  description: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  animalCard: { padding: 14, marginBottom: 10, borderWidth: 1 },
  animalRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  animalIcon: { fontSize: 25 },
  animalName: { fontSize: 16, fontWeight: '700' },
  chevron: { fontSize: 28 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { maxHeight: '90%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  error: { color: '#B91C1C', fontSize: 13, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10, marginVertical: 10 },
});
