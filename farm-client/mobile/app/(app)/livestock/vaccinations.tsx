import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { livestockAPI, livestockHealthAPI } from '@/modules/livestock';
import type { Livestock, VaccinationSchedule } from '@/modules/livestock';
import { Button, Card, TextInputField } from '@/core/ui/UIComponents';
import { MenuButton } from '@/core/ui/MenuButton';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { usePermission } from '@/core/hooks/usePermission';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { unwrapList } from '@/core/utils/listPayload';

export default function LivestockVaccinationsScreen() {
  const router = useRouter();
  const { colors: themeColors } = useAppTheme();
  const { hasPermission } = usePermission();
  const canWrite = hasPermission('livestock.write');
  const [animals, setAnimals] = useState<Livestock[]>([]);
  const [selected, setSelected] = useState<Livestock | null>(null);
  const [records, setRecords] = useState<VaccinationSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [vaccineName, setVaccineName] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));

  const loadAnimals = useCallback(async () => {
    try {
      setLoadError(null);
      const response = await livestockAPI.list({ limit: 100 });
      const list = unwrapList<Livestock>(response.data);
      setAnimals(list);
      setSelected((current) => current ?? list[0] ?? null);
    } catch (error) {
      setLoadError(describeApiError(error, 'Could not load livestock.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRecords = useCallback(async (animalId: string) => {
    try {
      const response = await livestockHealthAPI.listVaccinations(animalId);
      setRecords(unwrapList<VaccinationSchedule>(response.data));
    } catch (error) {
      setRecords([]);
      setLoadError(describeApiError(error, 'Could not load vaccination schedules.'));
    }
  }, []);

  useEffect(() => { void loadAnimals(); }, [loadAnimals]);
  useEffect(() => { if (selected) void loadRecords(selected.id); }, [selected, loadRecords]);

  const schedule = async () => {
    if (!selected || !vaccineName.trim() || Number.isNaN(Date.parse(scheduledDate))) {
      Alert.alert('Invalid schedule', 'Choose an animal, vaccine name, and valid date.');
      return;
    }
    setSaving(true);
    try {
      await livestockHealthAPI.scheduleVaccination(selected.id, { vaccineName: vaccineName.trim(), scheduledDate });
      setVaccineName('');
      await loadRecords(selected.id);
    } catch (error) {
      Alert.alert('Could not schedule vaccination', describeApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const administer = async (record: VaccinationSchedule) => {
    try {
      await livestockHealthAPI.administerVaccination(record.id);
      if (selected) await loadRecords(selected.id);
    } catch (error) {
      Alert.alert('Could not record vaccination', describeApiError(error));
    }
  };

  if (loading) return <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}><Header onBack={() => router.back()} /><ScreenLoading message="Loading vaccination schedules…" /></SafeAreaView>;
  if (loadError && animals.length === 0) return <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}><Header onBack={() => router.back()} /><StateView variant="error" title="Couldn't load livestock" message={loadError} onRetry={() => void loadAnimals()} retryLabel="Retry" /></SafeAreaView>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Header onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.animalRow}>
          {animals.map((animal) => (
            <TouchableOpacity key={animal.id} onPress={() => setSelected(animal)} style={[styles.animalChip, { backgroundColor: selected?.id === animal.id ? themeColors.primary : themeColors.card }]}>
              <Text style={{ color: selected?.id === animal.id ? '#FFFFFF' : themeColors.text }}>{animal.species}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {canWrite && selected && (
          <Card style={[styles.card, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Schedule vaccination</Text>
            <TextInputField label="Vaccine" value={vaccineName} onChangeText={setVaccineName} />
            <TextInputField label="Date (YYYY-MM-DD)" value={scheduledDate} onChangeText={setScheduledDate} />
            <Button title="Schedule" onPress={schedule} loading={saving} disabled={saving} />
          </Card>
        )}
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Vaccination history</Text>
        {records.map((record) => (
          <Card key={record.id} style={[styles.card, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.recordTitle, { color: themeColors.text }]}>{record.vaccineName}</Text>
            <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
              {new Date(record.scheduledDate).toLocaleDateString()} · {record.status}
            </Text>
            {canWrite && record.status === 'SCHEDULED' && (
              <Button title="Mark administered" onPress={() => void administer(record)} variant="secondary" />
            )}
          </Card>
        ))}
        {selected && records.length === 0 && <Text style={[styles.meta, { color: themeColors.textSecondary }]}>No vaccination records for this animal.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  const { colors: themeColors } = useAppTheme();
  return <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}><TouchableOpacity onPress={onBack}><Text style={styles.back}>‹</Text></TouchableOpacity><MenuButton /><Text style={styles.headerTitle}>Vaccinations</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  back: { color: '#FFFFFF', fontSize: 32 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  content: { padding: 16, gap: 12 },
  animalRow: { gap: 8 },
  animalChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  card: { padding: 16, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  recordTitle: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13 },
});
