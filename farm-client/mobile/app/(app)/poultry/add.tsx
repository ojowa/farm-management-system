import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { poultryAPI, poultryHousesAPI, offlinePoultryAPI } from '@/modules/poultry';
import type { Pen, Breed, PoultryHouse } from '@/modules/poultry';
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
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: colors.text },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectButtonDisabled: { opacity: 0.5 },
  selectButtonText: { fontSize: 16, color: colors.text },
  selectPlaceholder: { fontSize: 16, color: colors.textLight },
  selectArrow: { fontSize: 12, color: colors.textLight },
  selectError: { borderColor: colors.error },
  errorText: { color: colors.error, fontSize: 12, marginTop: 4 },
  hint: { color: colors.textLight, fontSize: 12, marginTop: 4 },
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
    width: '80%',
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  modalItemText: { fontSize: 16, color: colors.text },
  modalItemEmpty: { paddingVertical: 20, alignItems: 'center' },
  modalItemEmptyText: { fontSize: 14, color: colors.textLight },
  modalCloseButton: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  modalCloseButtonText: { fontSize: 16, color: colors.primary, fontWeight: '600' },
  submitButton: { marginTop: 20 },
});

interface Option {
  id: string;
  name: string;
}

interface FormData {
  batchCode: string;
  birdCount: string;
  arrivalDate: string;
  farmId: string;
  penId: string;
  breedId: string;
}

interface FormErrors {
  batchCode?: string;
  birdCount?: string;
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

/** Reusable modal picker (label + select button + options list). */
function PickerField({
  label,
  placeholder,
  selectedId,
  options,
  onSelect,
  error,
  disabled,
  disabledHint,
}: {
  label: string;
  placeholder: string;
  selectedId: string;
  options: Option[];
  onSelect: (id: string) => void;
  error?: string;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const { colors: tc, isDark } = useAppTheme();
  const selected = options.find((o) => o.id === selectedId);

  return (
    <View style={styles.formGroup}>
      <Text style={[styles.label, { color: tc.text }]}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.selectButton,
          error && styles.selectError,
          disabled && styles.selectButtonDisabled,
          { backgroundColor: tc.card },
          error ? undefined : { borderColor: tc.border },
        ]}
        disabled={disabled}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
      >
        <Text style={[selected ? styles.selectButtonText : styles.selectPlaceholder, { color: selected ? tc.text : tc.textSecondary }]}>
          {selected ? selected.name : placeholder}
        </Text>
        <Text style={styles.selectArrow}>▼</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && disabled && disabledHint ? <Text style={[styles.hint, { color: tc.textSecondary }]}>{disabledHint}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: tc.overlay }]}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalContent, { backgroundColor: tc.surface }]}>
              <Text style={[styles.modalTitle, { color: tc.text }]}>{label}</Text>
              {options.length === 0 ? (
                <View style={styles.modalItemEmpty}>
                  <Text style={[styles.modalItemEmptyText, { color: tc.textSecondary }]}>No options available</Text>
                </View>
              ) : (
                <FlatList
                  data={options}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.modalItem, { borderBottomColor: isDark ? tc.surface : '#F5F5F5' }]}
                      onPress={() => {
                        onSelect(item.id);
                        setOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          item.id === selectedId && { color: colors.primary, fontWeight: '600' },
                          item.id === selectedId ? undefined : { color: tc.text },
                        ]}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setOpen(false)}>
                <Text style={styles.modalCloseButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function AddFlockScreen() {
  const router = useRouter();
  const { success, error: showError } = useToasts();
  const { colors: tc, isDark } = useAppTheme();
  const organizationId = useAppSelector((state) => state.auth.user?.organizationId ?? '');

  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState<Option[]>([]);
  const [houses, setHouses] = useState<PoultryHouse[]>([]);
  const [pens, setPens] = useState<Pen[]>([]);
  const [breeds, setBreeds] = useState<Option[]>([]);
  const [formData, setFormData] = useState<FormData>({
    batchCode: '',
    birdCount: '',
    arrivalDate: '',
    farmId: '',
    penId: '',
    breedId: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const [farmsRes, housesRes, pensRes, breedsRes] = await Promise.allSettled([
        farmsAPI.list(),
        poultryHousesAPI.list({ limit: 200 }),
        poultryAPI.listPens({ limit: 200 }),
        poultryAPI.listBreeds({ limit: 200 }),
      ]);

      if (farmsRes.status === 'fulfilled') {
        const data = unwrapList<any>(farmsRes.value.data);
        setFarms(data.map((f: any) => ({ id: f.id, name: f.name })));
      }
      if (housesRes.status === 'fulfilled') setHouses(unwrapList<PoultryHouse>(housesRes.value.data));
      if (pensRes.status === 'fulfilled') setPens(unwrapList<Pen>(pensRes.value.data));
      if (breedsRes.status === 'fulfilled') {
        const data = unwrapList<Breed>(breedsRes.value.data);
        setBreeds(data.map((b) => ({ id: b.id, name: `${b.name}${b.species ? ` · ${b.species}` : ''}` })));
      }
    } catch {
      /* individual rejections already handled via allSettled */
    }
  };

  // Pens live under houses, and houses under farms — so once a farm is chosen
  // we only offer pens whose house belongs to that farm.
  const houseFarm = useMemo(() => {
    const map: Record<string, string> = {};
    houses.forEach((h) => {
      map[h.id] = h.farmId;
    });
    return map;
  }, [houses]);

  const availablePens = useMemo(() => {
    if (!formData.farmId) return [];
    return pens
      .filter((p: any) => {
        if (p.farmId === formData.farmId) return true;
        const houseId = p.poultryHouseId || p.houseId;
        return houseId && houseFarm[houseId] === formData.farmId;
      })
      .map((p) => ({ id: p.id, name: p.name }));
  }, [pens, houseFarm, formData.farmId]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.batchCode.trim()) newErrors.batchCode = 'Batch code is required';
    if (!formData.farmId) newErrors.farmId = 'Please select a farm';
    if (!formData.breedId) newErrors.breedId = 'Please select a breed';
    if (!formData.penId) newErrors.penId = 'Please select a pen';
    const count = Number(formData.birdCount);
    if (!formData.birdCount.trim() || isNaN(count) || count <= 0 || !Number.isInteger(count)) {
      newErrors.birdCount = 'Bird count must be a positive whole number';
    }
    if (!formData.arrivalDate.trim()) {
      newErrors.arrivalDate = 'Arrival date is required';
    } else if (!DATE_RE.test(formData.arrivalDate.trim()) || isNaN(Date.parse(formData.arrivalDate.trim()))) {
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
        // satisfy the request type (the zod schema ignores it).
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
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      // Changing the farm invalidates the selected pen (it may belong elsewhere).
      ...(field === 'farmId' ? { penId: '' } : null),
    }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
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
          <PickerField
            label="Farm *"
            placeholder="Select a farm"
            selectedId={formData.farmId}
            options={farms}
            onSelect={(id) => updateFormData('farmId', id)}
            error={errors.farmId}
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

          <PickerField
            label="Breed *"
            placeholder="Select a breed"
            selectedId={formData.breedId}
            options={breeds}
            onSelect={(id) => updateFormData('breedId', id)}
            error={errors.breedId}
          />

          <PickerField
            label="Pen *"
            placeholder={formData.farmId ? 'Select a pen' : 'Select a farm first'}
            selectedId={formData.penId}
            options={availablePens}
            onSelect={(id) => updateFormData('penId', id)}
            error={errors.penId}
            disabled={!formData.farmId}
            disabledHint="Pens are grouped by the selected farm's poultry houses."
          />

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
