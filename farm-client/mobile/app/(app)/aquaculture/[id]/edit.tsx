import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { aquacultureAPI, farmsAPI } from '../../../../src/services/api';
import type { PondType, PondStatus } from '../../../../src/services/types';
import { TextInputField, Button, colors } from '../../../../src/core/ui/UIComponents';
import { ScreenLoading, StateView } from '../../../../src/core/ui/feedback';
import { useToasts } from '../../../../src/core/hooks/useToasts';
import { describeApiError } from '../../../../src/core/utils/apiError';

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
  selectButtonText: { fontSize: 16, color: colors.text },
  selectPlaceholder: { fontSize: 16, color: colors.textLight },
  selectArrow: { fontSize: 12, color: colors.textLight },
  selectError: { borderColor: colors.error },
  errorText: { color: colors.error, fontSize: 12, marginTop: 4 },
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

// Local palette, mirroring the FARM_TYPE_COLORS pattern from farms.tsx.
const POND_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  FISH: { bg: '#CFFAFE', text: '#155E75' },
  SHRIMP: { bg: '#FFE4E6', text: '#9F1239' },
  CRAB: { bg: '#FFEDD5', text: '#9A3412' },
  MIXED: { bg: '#EDE9FE', text: '#5B21B6' },
};

const POND_TYPES = ['FISH', 'SHRIMP', 'CRAB', 'MIXED'] as const;
const POND_TYPE_ICONS: Record<string, string> = {
  FISH: '🐟',
  SHRIMP: '🦐',
  CRAB: '🦀',
  MIXED: '🌊',
};
const POND_STATUSES = ['active', 'draining', 'maintenance', 'retired'] as const;

interface FormData {
  name: string;
  pondType: PondType;
  area: string;
  waterSource: string;
  capacity: string;
  status: PondStatus;
  notes: string;
  farmId: string;
}

interface FormErrors {
  name?: string;
  area?: string;
  capacity?: string;
  farmId?: string;
}

interface FarmOption {
  id: string;
  name: string;
}

interface PondData {
  id: string;
  name: string;
  farmId: string;
  pondType?: string;
  area?: number | null;
  waterSource?: string | null;
  capacity?: number | null;
  status?: string;
  notes?: string | null;
}

export default function EditPondScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pond, setPond] = useState<PondData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    pondType: 'FISH',
    area: '',
    waterSource: '',
    capacity: '',
    status: 'active',
    notes: '',
    farmId: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    Promise.all([fetchPond(), fetchFarms()]);
  }, [id]);

  const fetchPond = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);

    try {
      const response = await aquacultureAPI.getPond(id);
      const data = response.data as any;
      setPond(data);
      setFormData({
        name: data.name || '',
        pondType: data.pondType || 'FISH',
        area: data.area != null ? String(data.area) : '',
        waterSource: data.waterSource || '',
        capacity: data.capacity != null ? String(data.capacity) : '',
        status: data.status || 'active',
        notes: data.notes || '',
        farmId: data.farmId || '',
      });
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
      setFarms(
        Array.isArray(farmsData)
          ? farmsData.map((f: any) => ({ id: f.id, name: f.name }))
          : []
      );
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to load farms.'));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Pond name is required';
    if (!formData.farmId) newErrors.farmId = 'Please select a farm';
    if (formData.area.trim() && (isNaN(Number(formData.area)) || Number(formData.area) <= 0)) {
      newErrors.area = 'Area must be a positive number';
    }
    if (formData.capacity.trim() && (isNaN(Number(formData.capacity)) || Number(formData.capacity) <= 0)) {
      newErrors.capacity = 'Capacity must be a positive number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !pond) return;

    setSubmitting(true);
    try {
      const pondData = {
        name: formData.name.trim(),
        farmId: formData.farmId,
        pondType: formData.pondType,
        area: formData.area.trim() ? Number(formData.area) : undefined,
        waterSource: formData.waterSource.trim() || undefined,
        capacity: formData.capacity.trim() ? Number(formData.capacity) : undefined,
        status: formData.status,
        notes: formData.notes.trim() || undefined,
      };

      await aquacultureAPI.updatePond(pond.id, pondData);

      success('Pond updated successfully');
      router.back();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to update pond.'));
    } finally {
      setSubmitting(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const selectedFarm = farms.find((f) => f.id === formData.farmId);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Pond</Text>
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
          <Text style={styles.headerTitle}>Edit Pond</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load pond"
          message={loadError || 'Pond not found'}
          onRetry={() => Promise.all([fetchPond(), fetchFarms()])}
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
        <Text style={styles.headerTitle}>Edit Pond</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.formGroup}>
            <Text style={styles.label}>Farm *</Text>
            <TouchableOpacity
              style={[styles.selectButton, errors.farmId && styles.selectError]}
              onPress={() => setShowFarmModal(true)}
            >
              <Text style={selectedFarm ? styles.selectButtonText : styles.selectPlaceholder}>
                {selectedFarm ? selectedFarm.name : 'Select a farm'}
              </Text>
              <Text style={styles.selectArrow}>▼</Text>
            </TouchableOpacity>
            {errors.farmId && <Text style={styles.errorText}>{errors.farmId}</Text>}
          </View>

          <Modal
            visible={showFarmModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowFarmModal(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowFarmModal(false)}
            >
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Select Farm</Text>
                  {farms.length === 0 ? (
                    <View style={styles.modalItemEmpty}>
                      <Text style={styles.modalItemEmptyText}>No farms available</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={farms}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.modalItem}
                          onPress={() => {
                            updateFormData('farmId', item.id);
                            setShowFarmModal(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.modalItemText,
                              item.id === formData.farmId && {
                                color: colors.primary,
                                fontWeight: '600',
                              },
                            ]}
                          >
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowFarmModal(false)}
                  >
                    <Text style={styles.modalCloseButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>

          <View style={styles.formGroup}>
            <TextInputField
              label="Pond Name *"
              placeholder="e.g. Pond 1, Shrimp Basin A"
              value={formData.name}
              onChangeText={(v) => updateFormData('name', v)}
              error={errors.name}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Pond Type *</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {POND_TYPES.map((type) => {
                const isSelected = formData.pondType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => updateFormData('pondType', type)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? POND_TYPE_COLORS[type].text : '#D1D5DB',
                      backgroundColor: isSelected ? POND_TYPE_COLORS[type].bg : '#F9FAFB',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: isSelected ? '600' : '400', color: isSelected ? POND_TYPE_COLORS[type].text : '#6B7280' }}>
                      {POND_TYPE_ICONS[type]} {type.charAt(0) + type.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Area (hectares)"
              placeholder="Enter pond area in hectares"
              value={formData.area}
              onChangeText={(v) => updateFormData('area', v)}
              keyboardType="numeric"
              error={errors.area}
            />
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Water Source"
              placeholder="e.g. River, well, rainwater"
              value={formData.waterSource}
              onChangeText={(v) => updateFormData('waterSource', v)}
            />
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Capacity"
              placeholder="e.g. number of fish or kg"
              value={formData.capacity}
              onChangeText={(v) => updateFormData('capacity', v)}
              keyboardType="numeric"
              error={errors.capacity}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Status</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {POND_STATUSES.map((status) => {
                const isSelected = formData.status === status;
                return (
                  <TouchableOpacity
                    key={status}
                    onPress={() => updateFormData('status', status)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? colors.primary : '#D1D5DB',
                      backgroundColor: isSelected ? '#E8F0FE' : '#F9FAFB',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: isSelected ? '600' : '400', color: isSelected ? colors.primary : '#6B7280' }}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Notes"
              placeholder="Any additional details about the pond"
              value={formData.notes}
              onChangeText={(v) => updateFormData('notes', v)}
            />
          </View>

          <Button
            title="Save Changes"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
