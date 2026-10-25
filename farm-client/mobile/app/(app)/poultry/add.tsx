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
import { useRouter } from 'expo-router';
import { offlinePoultryAPI } from '@/modules/poultry';
import type { Pen, PoultryHouse } from '@/modules/poultry';
import { PickerField } from '@/modules/poultry/FlockFormPickers';
import {
  fetchBreedOptions,
  fetchHousesForFarm,
  fetchPensForHouse,
  toHouseOptions,
  toPenOptions,
  unwrapList,
  type NameOption,
} from '@/modules/poultry/flockChain';
import { farmsAPI } from '@/modules/farm';
import { TextInputField, Button, colors } from '@/core/ui/UIComponents';
import { useToasts } from '@/core/hooks/useToasts';
import { useAppSelector } from '@/modules/auth/hooks/useAuth';
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

interface FormData {
  batchCode: string;
  birdCount: string;
  arrivalDate: string;
  farmId: string;
  houseId: string;
  penId: string;
  breedId: string;
}

interface FormErrors {
  batchCode?: string;
  birdCount?: string;
  arrivalDate?: string;
  farmId?: string;
  houseId?: string;
  penId?: string;
  breedId?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function AddFlockScreen() {
  const router = useRouter();
  const { success, error: showError } = useToasts();
  const { colors: tc } = useAppTheme();
  const organizationId = useAppSelector((state) => state.auth.user?.organizationId ?? '');

  const [loading, setLoading] = useState(false);
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
    arrivalDate: '',
    farmId: '',
    houseId: '',
    penId: '',
    breedId: '',
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

  useEffect(() => {
    void loadStaticOptions();
  }, [loadStaticOptions]);

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

  const houseOptions = toHouseOptions(houses);
  const penOptions = toPenOptions(pens, houses);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.farmId) newErrors.farmId = 'Please select a farm';
    if (!formData.houseId) newErrors.houseId = 'Please select a poultry house';
    if (!formData.penId) newErrors.penId = 'Please select a pen';
    if (!formData.breedId) newErrors.breedId = 'Please select a breed';
    if (!formData.batchCode.trim()) newErrors.batchCode = 'Batch code is required';
    const count = Number(formData.birdCount);
    if (!formData.birdCount.trim() || isNaN(count) || count <= 0 || !Number.isInteger(count)) {
      newErrors.birdCount = 'Bird count must be a positive whole number';
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
    setLoading(true);
    try {
      const birdCount = Number(formData.birdCount);
      const arrivalDate = formData.arrivalDate.trim();
      const arrivalTimestamp = Date.parse(`${arrivalDate}T00:00:00.000Z`);
      const today = new Date();
      const todayTimestamp = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
      await offlinePoultryAPI.create({
        // Organization is derived from the JWT server-side; included only to
        // satisfy the request type (the zod schema strips unknown keys).
        organizationId,
        farmId: formData.farmId,
        penId: formData.penId,
        breedId: formData.breedId,
        batchCode: formData.batchCode.trim(),
        birdCount,
        currentCount: birdCount,
        arrivalDate,
        currentAgeDays: Math.max(0, Math.floor((todayTimestamp - arrivalTimestamp) / 86_400_000)),
        status: 'ACTIVE',
      });
      success('Flock created successfully');
      router.back();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to create flock. Please try again.'));
    } finally {
      setLoading(false);
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Flock</Text>
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
                  ? 'This farm has no poultry houses yet. Add one from House/Pen first.'
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
                  : 'This house has no pens yet. Add one from House/Pen first.'
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

          <View style={styles.formGroup}>
            <TextInputField
              label="Batch Code *"
              placeholder="e.g. BATCH-2024-A"
              value={formData.batchCode}
              onChangeText={(v) => updateFormData('batchCode', v)}
              error={errors.batchCode}
            />
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Bird Count *"
              placeholder="Number of birds"
              value={formData.birdCount}
              onChangeText={(v) => updateFormData('birdCount', v)}
              keyboardType="numeric"
              error={errors.birdCount}
            />
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Arrival Date *"
              placeholder="YYYY-MM-DD"
              value={formData.arrivalDate}
              onChangeText={(v) => updateFormData('arrivalDate', v)}
              error={errors.arrivalDate}
            />
          </View>

          <Button
            title="Create Flock"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
