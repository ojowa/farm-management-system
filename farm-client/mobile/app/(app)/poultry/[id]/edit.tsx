import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { poultryAPI, poultryHousesAPI, offlinePoultryAPI } from '@/modules/poultry';
import type { Flock, Pen, Breed, PoultryHouse } from '@/modules/poultry';
import { farmsAPI } from '@/modules/farm';
import { TextInputField, Button, colors } from '@/core/ui/UIComponents';
import { SelectField, SelectOption } from '@/core/ui/SelectField';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
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
  submitButton: { marginTop: 20 },
});

const FLOCK_STATUS_OPTIONS: SelectOption[] = [
  { id: 'ACTIVE', label: 'Active' },
  { id: 'DECEASED', label: 'Deceased' },
  { id: 'SOLD', label: 'Sold' },
  { id: 'COMPLETED', label: 'Completed' },
];

interface FormData {
  batchCode: string;
  birdCount: string;
  currentCount: string;
  arrivalDate: string;
  farmId: string;
  penId: string;
  breedId: string;
  status: string;
}

interface FormErrors {
  batchCode?: string;
  birdCount?: string;
  currentCount?: string;
  arrivalDate?: string;
  farmId?: string;
  penId?: string;
  breedId?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function unwrapList<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function unwrapOne<T>(payload: any): T | null {
  if (payload?.id) return payload as T;
  if (payload?.data?.id) return payload.data as T;
  return null;
}

export default function EditFlockScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const { colors: tc, isDark } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [farms, setFarms] = useState<SelectOption[]>([]);
  const [houses, setHouses] = useState<PoultryHouse[]>([]);
  const [pens, setPens] = useState<Pen[]>([]);
  const [breeds, setBreeds] = useState<SelectOption[]>([]);

  const [formData, setFormData] = useState<FormData>({
    batchCode: '',
    birdCount: '',
    currentCount: '',
    arrivalDate: '',
    farmId: '',
    penId: '',
    breedId: '',
    status: 'ACTIVE',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    loadAll();
  }, [id]);

  const loadAll = async () => {
    if (!id) {
      setLoadError('Missing flock id.');
      setLoading(false);
      return;
    }
    try {
      setLoadError(null);
      const response = await poultryAPI.get(id);
      const record = unwrapOne<Flock>(response.data);
      if (!record) {
        setLoadError('Flock not found.');
        return;
      }
      // Prefill from the existing record. Arrival is trimmed to the date part
      // (YYYY-MM-DD) to match the input format.
      setFormData({
        batchCode: record.batchCode ?? '',
        birdCount: record.birdCount != null ? String(record.birdCount) : '',
        currentCount: record.currentCount != null ? String(record.currentCount) : '',
        arrivalDate: record.arrivalDate ? String(record.arrivalDate).slice(0, 10) : '',
        farmId: record.farmId ?? '',
        penId: record.penId ?? '',
        breedId: record.breedId ?? '',
        status: record.status ?? 'ACTIVE',
      });
      loadOptions();
    } catch (error: any) {
      setLoadError(describeApiError(error, 'Failed to load flock.'));
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const [farmsRes, housesRes, pensRes, breedsRes] = await Promise.allSettled([
        farmsAPI.list(),
        poultryHousesAPI.list({ limit: 200 }),
        poultryAPI.listPens({ limit: 200 }),
        poultryAPI.listBreeds({ limit: 200 }),
      ]);
      if (farmsRes.status === 'fulfilled') {
        setFarms(unwrapList<any>(farmsRes.value.data).map((f: any) => ({ id: f.id, label: f.name })));
      }
      if (housesRes.status === 'fulfilled') setHouses(unwrapList<PoultryHouse>(housesRes.value.data));
      if (pensRes.status === 'fulfilled') setPens(unwrapList<Pen>(pensRes.value.data));
      if (breedsRes.status === 'fulfilled') {
        setBreeds(
          unwrapList<Breed>(breedsRes.value.data).map((b) => ({
            id: b.id,
            label: `${b.name}${b.species ? ` · ${b.species}` : ''}`,
          }))
        );
      }
    } catch {
      /* individual rejections already handled via allSettled */
    }
  };

  // Pens live under houses, and houses under farms — so once a farm is chosen
  // we only offer pens whose house belongs to that farm.
  const houseFarm: Record<string, string> = {};
  houses.forEach((h) => {
    houseFarm[h.id] = h.farmId;
  });
  const availablePens: SelectOption[] = formData.farmId
    ? pens
        .filter((p) => houseFarm[p.poultryHouseId] === formData.farmId)
        .map((p) => ({ id: p.id, label: p.name }))
    : [];

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.batchCode.trim()) newErrors.batchCode = 'Batch code is required';
    if (!formData.farmId) newErrors.farmId = 'Please select a farm';
    if (!formData.breedId) newErrors.breedId = 'Please select a breed';
    if (!formData.penId) newErrors.penId = 'Please select a pen';
    const count = Number(formData.birdCount);
    if (!formData.birdCount.trim() || isNaN(count) || count < 0 || !Number.isInteger(count)) {
      newErrors.birdCount = 'Bird count must be a whole number';
    }
    const current = Number(formData.currentCount);
    if (!formData.currentCount.trim() || isNaN(current) || current < 0 || !Number.isInteger(current)) {
      newErrors.currentCount = 'Current count must be a whole number';
    }
    if (!formData.arrivalDate.trim()) {
      newErrors.arrivalDate = 'Arrival date is required';
    } else if (
      !DATE_RE.test(formData.arrivalDate.trim()) ||
      isNaN(Date.parse(formData.arrivalDate.trim()))
    ) {
      newErrors.arrivalDate = 'Use YYYY-MM-DD';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      await offlinePoultryAPI.update(id!, {
        farmId: formData.farmId,
        penId: formData.penId,
        breedId: formData.breedId,
        batchCode: formData.batchCode.trim(),
        birdCount: Number(formData.birdCount),
        currentCount: Number(formData.currentCount),
        arrivalDate: formData.arrivalDate.trim(),
        status: formData.status,
      });
      success('Flock updated successfully');
      router.back();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to update flock. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      // Changing the farm invalidates the selected pen (it may belong elsewhere).
      ...(field === 'farmId' ? { penId: '' } : null),
    }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Flock</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScreenLoading message="Loading flock…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Flock</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load this flock"
          message={loadError}
          onRetry={loadAll}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Flock</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <SelectField
            label="Farm *"
            placeholder="Select a farm"
            value={formData.farmId}
            options={farms}
            onSelect={(id) => updateFormData('farmId', id)}
            error={errors.farmId}
          />

          <TextInputField
            label="Batch Code *"
            placeholder="e.g. BATCH-2024-A"
            value={formData.batchCode}
            onChangeText={(v) => updateFormData('batchCode', v)}
            error={errors.batchCode}
          />

          <SelectField
            label="Breed *"
            placeholder="Select a breed"
            value={formData.breedId}
            options={breeds}
            onSelect={(id) => updateFormData('breedId', id)}
            error={errors.breedId}
          />

          <SelectField
            label="Pen *"
            placeholder={formData.farmId ? 'Select a pen' : 'Select a farm first'}
            value={formData.penId}
            options={availablePens}
            onSelect={(id) => updateFormData('penId', id)}
            error={errors.penId}
            disabled={!formData.farmId}
            disabledHint="Pens are grouped by the selected farm's poultry houses."
          />

          <TextInputField
            label="Bird Count *"
            placeholder="Number of birds"
            value={formData.birdCount}
            onChangeText={(v) => updateFormData('birdCount', v)}
            keyboardType="numeric"
            error={errors.birdCount}
          />

          <TextInputField
            label="Current Count *"
            placeholder="Birds currently alive"
            value={formData.currentCount}
            onChangeText={(v) => updateFormData('currentCount', v)}
            keyboardType="numeric"
            error={errors.currentCount}
          />

          <TextInputField
            label="Arrival Date *"
            placeholder="YYYY-MM-DD"
            value={formData.arrivalDate}
            onChangeText={(v) => updateFormData('arrivalDate', v)}
            error={errors.arrivalDate}
          />

          <SelectField
            label="Status"
            placeholder="Select a status"
            value={formData.status}
            options={FLOCK_STATUS_OPTIONS}
            onSelect={(v) => updateFormData('status', v)}
          />

          <Button
            title="Save Changes"
            onPress={handleSubmit}
            loading={saving}
            disabled={saving}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
