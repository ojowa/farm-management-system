import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { livestockAPI, weightAPI } from '@/modules/livestock';
import type { Livestock, WeightRecord } from '@/modules/livestock';
import { Button, Card, TextInputField } from '@/core/ui/UIComponents';
import { MenuButton } from '@/core/ui/MenuButton';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { usePermission } from '@/core/hooks/usePermission';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { unwrapList } from '@/core/utils/listPayload';

export default function LivestockWeightScreen() {
  const router = useRouter();
  const { colors: themeColors } = useAppTheme();
  const { hasPermission } = usePermission();
  const canWrite = hasPermission('livestock.write');
  const [animals, setAnimals] = useState<Livestock[]>([]);
  const [selected, setSelected] = useState<Livestock | null>(null);
  const [records, setRecords] = useState<WeightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState('kg');
  const [recordedDate, setRecordedDate] = useState(new Date().toISOString().slice(0, 10));

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
      const response = await weightAPI.listByAnimal(animalId);
      setRecords(unwrapList<WeightRecord>(response.data));
    } catch (error) {
      setRecords([]);
      setLoadError(describeApiError(error, 'Could not load weight records.'));
    }
  }, []);

  useEffect(() => { void loadAnimals(); }, [loadAnimals]);
  useEffect(() => { if (selected) void loadRecords(selected.id); }, [selected, loadRecords]);

  const save = async () => {
    const value = Number(weight);
    if (!selected || !Number.isFinite(value) || value <= 0 || !unit.trim() || Number.isNaN(Date.parse(recordedDate))) {
      Alert.alert('Invalid record', 'Choose an animal and enter a positive weight, unit, and valid date.');
      return;
    }
    setSaving(true);
    try {
      await weightAPI.recordForAnimal(selected.id, { weight: value, unit: unit.trim(), recordedDate, notes: '' });
      setWeight('');
      await loadRecords(selected.id);
    } catch (error) {
      Alert.alert('Could not save weight', describeApiError(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}><Header onBack={() => router.back()} /><ScreenLoading message="Loading weight records…" /></SafeAreaView>;
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
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Record weight</Text>
            <TextInputField label="Weight" value={weight} onChangeText={setWeight} keyboardType="numeric" />
            <TextInputField label="Unit" value={unit} onChangeText={setUnit} />
            <TextInputField label="Recorded date (YYYY-MM-DD)" value={recordedDate} onChangeText={setRecordedDate} />
            <Button title="Save weight" onPress={save} loading={saving} disabled={saving} />
          </Card>
        )}
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>History</Text>
        {records.map((record) => (
          <Card key={record.id} style={[styles.card, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.recordTitle, { color: themeColors.text }]}>{record.weight} {record.unit}</Text>
            <Text style={[styles.meta, { color: themeColors.textSecondary }]}>{new Date(record.recordedDate).toLocaleDateString()}</Text>
          </Card>
        ))}
        {selected && records.length === 0 && <Text style={[styles.meta, { color: themeColors.textSecondary }]}>No weight records for this animal.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  const { colors: themeColors } = useAppTheme();
  return <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}><TouchableOpacity onPress={onBack}><Text style={styles.back}>‹</Text></TouchableOpacity><MenuButton /><Text style={styles.headerTitle}>Weight</Text></View>;
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
