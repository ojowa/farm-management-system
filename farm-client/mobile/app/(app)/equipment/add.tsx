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
import { useRouter } from 'expo-router';
import { equipmentAPI } from '@/modules/inventory';
import { farmsAPI } from '@/modules/farm';
import { TextInputField, Button, colors } from '@/core/ui/UIComponents';
import { SelectField, SelectOption } from '@/core/ui/SelectField';
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

const EQUIP_STATUS_OPTIONS: SelectOption[] = [
  { id: 'ACTIVE', label: 'Active' },
  { id: 'MAINTENANCE', label: 'Maintenance' },
  { id: 'INACTIVE', label: 'Inactive' },
  { id: 'RETIRED', label: 'Retired' },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function unwrapList<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

interface FormData {
  farmId: string;
  name: string;
  type: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  purchaseCost: string;
  status: string;
  notes: string;
}

interface FormErrors {
  name?: string;
  purchaseDate?: string;
  purchaseCost?: string;
}

export default function AddEquipmentScreen() {
  const router = useRouter();
  const { success, error: showError } = useToasts();
  const { colors: tc, isDark } = useAppTheme();

  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState<SelectOption[]>([]);
  const [formData, setFormData] = useState<FormData>({
    farmId: '',
    name: '',
    type: '',
    model: '',
    serialNumber: '',
    purchaseDate: '',
    purchaseCost: '',
    status: 'ACTIVE',
    notes: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    try {
      const response = await farmsAPI.list();
      setFarms(unwrapList<any>(response.data).map((f: any) => ({ id: f.id, label: f.name })));
    } catch {
      /* the select shows "No options available" */
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (formData.purchaseDate.trim()) {
      if (
        !DATE_RE.test(formData.purchaseDate.trim()) ||
        isNaN(Date.parse(formData.purchaseDate.trim()))
      ) {
        newErrors.purchaseDate = 'Use YYYY-MM-DD';
      }
    }
    if (formData.purchaseCost.trim()) {
      const cost = Number(formData.purchaseCost);
      if (isNaN(cost) || cost < 0) newErrors.purchaseCost = 'Enter a valid amount';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      await equipmentAPI.create({
        farmId: formData.farmId || undefined,
        name: formData.name.trim(),
        type: formData.type.trim() || undefined,
        model: formData.model.trim() || undefined,
        serialNumber: formData.serialNumber.trim() || undefined,
        purchaseDate: formData.purchaseDate.trim() || undefined,
        purchaseCost: formData.purchaseCost.trim() ? Number(formData.purchaseCost) : undefined,
        status: formData.status,
        notes: formData.notes.trim() || undefined,
      });
      success('Equipment created successfully');
      router.back();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to create equipment. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Equipment</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextInputField
            label="Name *"
            placeholder="e.g. Tractor"
            value={formData.name}
            onChangeText={(v) => updateFormData('name', v)}
            error={errors.name}
          />

          <SelectField
            label="Farm"
            placeholder="Select a farm (optional)"
            value={formData.farmId}
            options={farms}
            onSelect={(v) => updateFormData('farmId', v)}
          />

          <TextInputField
            label="Type"
            placeholder="e.g. Machinery"
            value={formData.type}
            onChangeText={(v) => updateFormData('type', v)}
          />

          <TextInputField
            label="Model"
            placeholder="e.g. Kubota L3902"
            value={formData.model}
            onChangeText={(v) => updateFormData('model', v)}
          />

          <TextInputField
            label="Serial Number"
            placeholder="e.g. SN-12345"
            value={formData.serialNumber}
            onChangeText={(v) => updateFormData('serialNumber', v)}
          />

          <TextInputField
            label="Purchase Date"
            placeholder="YYYY-MM-DD"
            value={formData.purchaseDate}
            onChangeText={(v) => updateFormData('purchaseDate', v)}
            error={errors.purchaseDate}
          />

          <TextInputField
            label="Purchase Cost"
            placeholder="e.g. 15000"
            value={formData.purchaseCost}
            onChangeText={(v) => updateFormData('purchaseCost', v)}
            keyboardType="numeric"
            error={errors.purchaseCost}
          />

          <SelectField
            label="Status"
            placeholder="Select a status"
            value={formData.status}
            options={EQUIP_STATUS_OPTIONS}
            onSelect={(v) => updateFormData('status', v)}
          />

          <TextInputField
            label="Notes"
            placeholder="Optional notes"
            value={formData.notes}
            onChangeText={(v) => updateFormData('notes', v)}
          />

          <Button
            title="Create Equipment"
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
