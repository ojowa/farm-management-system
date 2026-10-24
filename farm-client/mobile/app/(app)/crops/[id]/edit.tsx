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
import { offlineCropsAPI } from '@/modules/crop';
import { TextInputField, Button, colors } from '../../../../src/core/ui/UIComponents';
import { ScreenLoading, StateView } from '../../../../src/core/ui/feedback';
import { useToasts } from '../../../../src/core/hooks/useToasts';
import { describeApiError } from '../../../../src/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.text,
  },
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
  selectButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  selectPlaceholder: {
    fontSize: 16,
    color: colors.textLight,
  },
  selectArrow: {
    fontSize: 12,
    color: colors.textLight,
  },
  selectError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },
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
  modalItemText: {
    fontSize: 16,
    color: colors.text,
  },
  modalItemEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  modalItemEmptyText: {
    fontSize: 14,
    color: colors.textLight,
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statusOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusOptionText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  statusOptionTextActive: {
    color: '#FFFFFF',
  },
  healthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  healthInput: {
    flex: 1,
  },
  healthBar: {
    flex: 2,
    height: 8,
    backgroundColor: colors.light,
    borderRadius: 4,
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    borderRadius: 4,
  },
  healthValue: {
    width: 40,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  submitButton: {
    marginTop: 20,
  },
});

interface FormData {
  fieldId: string;
  cropId: string;
  plantingDate: string;
  harvestDate: string;
  health: string;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
}

interface FormErrors {
  fieldId?: string;
  cropId?: string;
  plantingDate?: string;
  health?: string;
}

interface CropOption {
  id: string;
  name: string;
}

export default function EditCropScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const { colors: tc, isDark } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cycle, setCycle] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [crops, setCrops] = useState<CropOption[]>([]);
  const [showCropModal, setShowCropModal] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    fieldId: '',
    cropId: '',
    plantingDate: '',
    harvestDate: '',
    health: '100',
    status: 'PLANNED',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    fetchCycle();
    fetchCrops();
  }, [id]);

  const fetchCycle = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setLoadError(null);
      const response = await offlineCropsAPI.getCycle(id);
      const data = response.data as any;
      setCycle(data);
      setFormData({
        fieldId: data.fieldId || '',
        cropId: data.cropId || '',
        plantingDate: data.plantingDate ? data.plantingDate.slice(0, 10) : '',
        harvestDate: data.harvestDate ? data.harvestDate.slice(0, 10) : '',
        health: (data.health ?? 100).toString(),
        status: data.status || 'PLANNED',
      });
    } catch (error: any) {
      const message = describeApiError(error, 'Failed to load crop cycle.');
      setLoadError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCrops = async () => {
    try {
      const response = await offlineCropsAPI.list();
      const cropsData = response.data;
      const cropList = Array.isArray(cropsData)
        ? cropsData.map((c: any) => ({ id: c.id, name: c.name }))
        : [];
      setCrops(cropList);
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to load crop catalog.'));
    }
  };

  const getHealthColor = (value: number) => {
    if (value >= 70) return colors.success;
    if (value >= 40) return colors.warning;
    return colors.error;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.fieldId.trim()) {
      newErrors.fieldId = 'Field ID is required';
    }

    if (!formData.cropId) {
      newErrors.cropId = 'Please select a crop';
    }

    if (!formData.plantingDate.trim()) {
      newErrors.plantingDate = 'Planting date is required';
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.plantingDate)) {
        newErrors.plantingDate = 'Use YYYY-MM-DD format';
      } else if (isNaN(Date.parse(formData.plantingDate))) {
        newErrors.plantingDate = 'Invalid date';
      }
    }

    if (!formData.health.trim()) {
      newErrors.health = 'Health is required';
    } else {
      const healthNum = Number(formData.health);
      if (isNaN(healthNum) || healthNum < 0 || healthNum > 100) {
        newErrors.health = 'Health must be 0-100';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !id) return;

    setSubmitting(true);
    try {
      const cycleData = {
        fieldId: formData.fieldId.trim(),
        cropId: formData.cropId,
        plantingDate: formData.plantingDate,
        harvestDate: formData.harvestDate || undefined,
        health: Number(formData.health),
        status: formData.status,
      };

      await offlineCropsAPI.updateCycle(id, cycleData);
      success('Crop cycle updated successfully');
      router.back();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to update crop cycle. Please try again.'));
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

  const selectedCrop = crops.find((c) => c.id === formData.cropId);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Crop Cycle</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScreenLoading message="Loading crop cycle details…" />
      </SafeAreaView>
    );
  }

  if (!cycle) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Crop Cycle</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load crop cycle"
          message="Crop cycle not found"
          onRetry={() => fetchCycle()}
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
        <Text style={styles.headerTitle}>Edit Crop Cycle</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: tc.text }]}>Field ID *</Text>
            <TextInputField
              label="Field ID *"
              placeholder="e.g. FIELD-01"
              value={formData.fieldId}
              onChangeText={(value) => updateFormData('fieldId', value)}
              error={errors.fieldId}
            />
            {errors.fieldId && (
              <Text style={styles.errorText}>{errors.fieldId}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: tc.text }]}>Crop *</Text>
            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: tc.card, borderColor: tc.border }]}
              onPress={() => setShowCropModal(true)}
            >
              <Text
                style={[
                  styles.selectButtonText,
                  selectedCrop ? { color: tc.text } : { color: tc.textSecondary },
                ]}
              >
                {selectedCrop ? selectedCrop.name : 'Select a crop'}
              </Text>
              <Text style={[styles.selectArrow, { color: tc.textSecondary }]}>▼</Text>
            </TouchableOpacity>
            {errors.cropId && <Text style={styles.errorText}>{errors.cropId}</Text>}
          </View>

          <Modal
            visible={showCropModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowCropModal(false)}
          >
            <TouchableOpacity
              style={[styles.modalOverlay, { backgroundColor: tc.overlay }]}
              activeOpacity={1}
              onPress={() => setShowCropModal(false)}
            >
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <View style={[styles.modalContent, { backgroundColor: tc.surface }]}>
                  <Text style={[styles.modalTitle, { color: tc.text }]}>Select Crop</Text>
                  {crops.length === 0 ? (
                    <View style={styles.modalItemEmpty}>
                      <Text style={[styles.modalItemEmptyText, { color: tc.textSecondary }]}>
                        No crops available
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={crops}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.modalItem,
                            { borderBottomColor: isDark ? tc.surface : '#F5F5F5' },
                          ]}
                          onPress={() => {
                            updateFormData('cropId', item.id);
                            setShowCropModal(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.modalItemText,
                              item.id === formData.cropId
                                ? { color: colors.primary, fontWeight: '600' }
                                : { color: tc.text },
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
                    onPress={() => setShowCropModal(false)}
                  >
                    <Text style={styles.modalCloseButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>

          <View style={styles.formGroup}>
            <TextInputField
              label="Planting Date *"
              placeholder="YYYY-MM-DD"
              value={formData.plantingDate}
              onChangeText={(value) => updateFormData('plantingDate', value)}
              error={errors.plantingDate}
            />
            {errors.plantingDate && (
              <Text style={styles.errorText}>{errors.plantingDate}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Harvest Date (optional)"
              placeholder="YYYY-MM-DD"
              value={formData.harvestDate}
              onChangeText={(value) => updateFormData('harvestDate', value)}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: tc.text }]}>Health (0-100)</Text>
            <View style={styles.healthContainer}>
              <TextInputField
                value={formData.health}
                onChangeText={(value) => {
                  const num = Number(value);
                  if (value === '' || (num >= 0 && num <= 100)) {
                    updateFormData('health', value);
                  }
                }}
                keyboardType="numeric"
                containerStyle={styles.healthInput}
                error={errors.health}
              />
              <View style={[styles.healthBar, { backgroundColor: isDark ? tc.surface : '#F5F5F5' }]}>
                <View
                  style={[
                    styles.healthFill,
                    {
                      width: `${formData.health || 0}%` as any,
                      backgroundColor: getHealthColor(Number(formData.health) || 0),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.healthValue, { color: tc.text }]}>
                {formData.health || 0}%
              </Text>
            </View>
            {errors.health && <Text style={styles.errorText}>{errors.health}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: tc.text }]}>Status</Text>
            <View style={styles.statusContainer}>
              {(['PLANNED', 'ACTIVE', 'COMPLETED', 'FAILED'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusOption,
                    formData.status === s && styles.statusOptionActive,
                    formData.status === s ? undefined : { backgroundColor: tc.card, borderColor: tc.border },
                  ]}
                  onPress={() => updateFormData('status', s)}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      formData.status === s && styles.statusOptionTextActive,
                      formData.status === s ? undefined : { color: tc.text },
                    ]}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ marginTop: 20, gap: 10 }}>
            <Button
              title="Save Changes"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
              style={styles.submitButton}
            />
            <Button
              title="Delete"
              onPress={() => {
                // Simplified delete; in a fuller build this would prompt a confirm dialog.
                if (window.confirm('Delete this crop cycle? This cannot be undone.')) {
                  offlineCropsAPI
                    .deleteCycle(id)
                    .then(() => {
                      success('Crop cycle deleted');
                      router.back();
                    })
                    .catch((err: any) =>
                      showError(describeApiError(err, 'Failed to delete crop cycle.'))
                    );
                }
              }}
              style={[styles.submitButton, { backgroundColor: colors.error }]}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
