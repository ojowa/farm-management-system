import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { poultryAPI, offlinePoultryAPI } from '@/modules/poultry';
import type { Flock, Pen, PoultryHouse } from '@/modules/poultry';
import { PickerField } from '@/modules/poultry/FlockFormPickers';
import {
  fetchBreedOptions,
  fetchHousesForFarm,
  fetchPensForFarm,
  fetchPensForHouse,
  toHouseOptions,
  toPenOptions,
  unwrapList,
  unwrapOne,
  type NameOption,
} from '@/modules/poultry/flockChain';
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
  formGroup: { marginBottom: 20 },
  errorText: { color: colors.error, fontSize: 12, marginTop: 4 },
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
  houseId: string;
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
  houseId?: string;
  penId?: string;
  breedId?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function EditFlockScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const { colors: tc } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [farms, setFarms] = useState<NameOption[]>([]);
  const [breeds, setBreeds] = useState<NameOption[]>([]);
  const [houses, setHouses] = useState<PoultryHouse[]>([]);
  const [pens, setPens] = useState<Pen[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [chainError, setChainError] = useState<string | null>(null);
  const [housesLoading, setHousesLoading] = useState(false);
  const [pensLoading, setPensLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    batchCode: '',
    birdCount: '',
    currentCount: '',
    arrivalDate: '',
    farmId: '',
    houseId: '',
    penId: '',
    breedId: '',
    status: 'ACTIVE',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Chain responses can land out of order when the user taps through farms
  // quickly — only the newest request may write to state.
  const chainRequestRef = useRef(0);

  const loadStaticOptions = useCallback(async () => {
    try {
      setOptionsError(null);
      const [farmsRes, breedOptions] = await Promise.all([farmsAPI.list(), fetchBreedOptions()]);
      setFarms(
        unwrapList<{ id: string; name: string }>(farmsRes.data).map((f) => ({ id: f.id, name: f.name }))
      );
      setBreeds(breedOptions);
    } catch (error: any) {
      setOptionsError(describeApiError(error, "Couldn't load farms and breeds."));
    }
  }, []);

  /** farm → houses. Clears the house and pen picked further down the chain. */
  const loadHouses = useCallback(async (farmId: string) => {
    if (!farmId) return;
    const requestId = ++chainRequestRef.current;
    setHousesLoading(true);
    try {
      const next = await fetchHousesForFarm(farmId);
      if (requestId !== chainRequestRef.current) return;
      setHouses(next);
      setChainError(null);
    } catch (error: any) {
      if (requestId !== chainRequestRef.current) return;
      setHouses([]);
      setChainError(describeApiError(error, "Couldn't load poultry houses for this farm."));
    } finally {
      if (requestId === chainRequestRef.current) setHousesLoading(false);
    }
  }, []);

  /** house → pens. Clears the pen picked for the previous house. */
  const loadPens = useCallback(async (houseId: string) => {
    if (!houseId) return;
    const requestId = ++chainRequestRef.current;
    setPensLoading(true);
    try {
      const next = await fetchPensForHouse(houseId);
      if (requestId !== chainRequestRef.current) return;
      setPens(next);
      setChainError(null);
    } catch (error: any) {
      if (requestId !== chainRequestRef.current) return;
      setPens([]);
      setChainError(describeApiError(error, "Couldn't load pens for this poultry house."));
    } finally {
      if (requestId === chainRequestRef.current) setPensLoading(false);
    }
  }, []);

  /**
   * Opening an existing flock: its pen is known but its house is not (the
   * flock only stores `penId`), so resolve the whole chain in one pass —
   * houses for the farm, every pen under it, then the house the saved pen
   * lives in — and leave the picker exactly where the record already sits.
   */
  const prefillChain = useCallback(
    async (farmId: string, penId: string, onHouseFound: (houseId: string) => void) => {
      if (!farmId) return;
      const requestId = ++chainRequestRef.current;
      setHousesLoading(true);
      setPensLoading(true);
      try {
        const housesList = await fetchHousesForFarm(farmId);
        if (requestId !== chainRequestRef.current) return;
        setHouses(housesList);

        const farmPens = await fetchPensForFarm(farmId, housesList);
        if (requestId !== chainRequestRef.current) return;

        const savedPen = farmPens.find((candidate) => candidate.id === penId);
        const houseId = savedPen?.poultryHouseId ?? '';
        setPens(houseId ? farmPens.filter((candidate) => candidate.poultryHouseId === houseId) : []);
        if (houseId) onHouseFound(houseId);
        setChainError(null);
      } catch (error: any) {
        if (requestId !== chainRequestRef.current) return;
        setHouses([]);
        setPens([]);
        setChainError(describeApiError(error, "Couldn't load this flock's houses and pens."));
      } finally {
        if (requestId === chainRequestRef.current) {
          setHousesLoading(false);
          setPensLoading(false);
        }
      }
    },
    []
  );

  const loadAll = useCallback(async () => {
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
      const farmId = record.farmId ?? '';
      const penId = record.penId ?? '';
      // Prefill from the existing record. Arrival is trimmed to the date part
      // (YYYY-MM-DD) to match the input format.
      setFormData({
        batchCode: record.batchCode ?? '',
        birdCount: record.birdCount != null ? String(record.birdCount) : '',
        currentCount: record.currentCount != null ? String(record.currentCount) : '',
        arrivalDate: record.arrivalDate ? String(record.arrivalDate).slice(0, 10) : '',
        farmId,
        houseId: '',
        penId,
        breedId: record.breedId ?? '',
        status: record.status ?? 'ACTIVE',
      });
      void loadStaticOptions();
      void prefillChain(farmId, penId, (houseId) => {
        setFormData((prev) => ({ ...prev, houseId }));
      });
    } catch (error: any) {
      setLoadError(describeApiError(error, 'Failed to load flock.'));
    } finally {
      setLoading(false);
    }
  }, [id, loadStaticOptions, prefillChain]);

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const houseOptions = toHouseOptions(houses);
  const penOptions = toPenOptions(pens, houses);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.batchCode.trim()) newErrors.batchCode = 'Batch code is required';
    if (!formData.farmId) newErrors.farmId = 'Please select a farm';
    if (!formData.houseId) newErrors.houseId = 'Please select a poultry house';
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
    setFormData((prev) => {
      const next: FormData = { ...prev, [field]: value };
      // Every step of the chain invalidates the steps below it: a new farm
      // orphans the house, and a new house orphans the pen.
      if (field === 'farmId') {
        next.houseId = '';
        next.penId = '';
      } else if (field === 'houseId') {
        next.penId = '';
      }
      return next;
    });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));

    if (field === 'farmId') {
      setHouses([]);
      setPens([]);
      void loadHouses(value);
    } else if (field === 'houseId') {
      setPens([]);
      void loadPens(value);
    }
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
          {!!optionsError && (
            <TouchableOpacity
              onPress={() => void loadStaticOptions()}
              style={styles.formGroup}
              accessibilityRole="button"
              accessibilityLabel="Retry loading farms and breeds"
            >
              <Text style={styles.errorText}>{optionsError} Tap to retry.</Text>
            </TouchableOpacity>
          )}

          <PickerField
            label="Farm *"
            placeholder="Select a farm"
            selectedId={formData.farmId}
            options={farms}
            onSelect={(id) => updateFormData('farmId', id)}
            error={errors.farmId}
          />

          <PickerField
            label="Poultry House *"
            placeholder={formData.farmId ? 'Select a house' : 'Select a farm first'}
            selectedId={formData.houseId}
            options={houseOptions}
            onSelect={(id) => updateFormData('houseId', id)}
            error={errors.houseId}
            disabled={!formData.farmId}
            disabledHint={
              housesLoading
                ? undefined
                : formData.farmId && houseOptions.length === 0
                  ? 'This farm has no poultry houses yet.'
                  : 'Houses are loaded for the selected farm.'
            }
            loading={housesLoading}
            onRetry={chainError ? () => void loadHouses(formData.farmId) : undefined}
          />

          <PickerField
            label="Pen *"
            placeholder={
              !formData.houseId
                ? 'Select a house first'
                : penOptions.length === 0
                  ? 'No pens in this house'
                  : 'Select a pen'
            }
            selectedId={formData.penId}
            options={penOptions}
            onSelect={(id) => updateFormData('penId', id)}
            error={errors.penId}
            disabled={!formData.houseId || penOptions.length === 0}
            disabledHint={
              pensLoading
                ? undefined
                : !formData.houseId
                  ? 'Pens are loaded for the selected poultry house.'
                  : 'This house has no pens yet.'
            }
            loading={pensLoading}
            onRetry={chainError ? () => void loadPens(formData.houseId) : undefined}
          />

          {!!chainError && (
            <View style={styles.formGroup}>
              <Text style={styles.errorText}>{chainError}</Text>
            </View>
          )}

          <PickerField
            label="Breed *"
            placeholder="Select a breed"
            selectedId={formData.breedId}
            options={breeds}
            onSelect={(id) => updateFormData('breedId', id)}
            error={errors.breedId}
          />

          <TextInputField
            label="Batch Code *"
            placeholder="e.g. BATCH-2024-A"
            value={formData.batchCode}
            onChangeText={(v) => updateFormData('batchCode', v)}
            error={errors.batchCode}
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

          <View style={styles.formGroup}>
            <SelectField
              label="Status"
              placeholder="Select a status"
              value={formData.status}
              options={FLOCK_STATUS_OPTIONS}
              onSelect={(v) => updateFormData('status', v)}
            />
          </View>

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
