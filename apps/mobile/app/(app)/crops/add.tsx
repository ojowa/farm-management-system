import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { cropsAPI, farmsAPI } from '../../../src/services/api';
import { TextInputField, Button, colors } from '../../../src/components/common/UIComponents';
import { useToasts } from '../../../src/hooks/useToasts';
import { describeApiError } from '../../../src/utils/apiError';

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
  name: string;
  type: string;
  farmId: string;
  area: string;
  plantedDate: string;
  health: string;
  status: 'growing' | 'harvesting' | 'completed';
}

interface FormErrors {
  name?: string;
  type?: string;
  farmId?: string;
  area?: string;
  plantedDate?: string;
  health?: string;
}

interface FarmOption {
  id: string;
  name: string;
}

export default function AddCropScreen() {
  const router = useRouter();
  const { success, error: showError } = useToasts();
  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: '',
    farmId: '',
    area: '',
    plantedDate: '',
    health: '100',
    status: 'growing',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    try {
      const response = await farmsAPI.list();
      const farmsData = response.data.data || response.data;
      const farmList = Array.isArray(farmsData)
        ? farmsData.map((f: any) => ({ id: f.id, name: f.name }))
        : [];
      setFarms(farmList);
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to load farms.'));
    }
  };

  const getHealthColor = (value: number) => {
    if (value >= 70) return colors.success;
    if (value >= 40) return colors.warning;
    return colors.error;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Crop name is required';
    }

    if (!formData.type.trim()) {
      newErrors.type = 'Crop type is required';
    }

    if (!formData.farmId) {
      newErrors.farmId = 'Please select a farm';
    }

    if (!formData.area.trim()) {
      newErrors.area = 'Area is required';
    } else if (isNaN(Number(formData.area)) || Number(formData.area) <= 0) {
      newErrors.area = 'Area must be a positive number';
    }

    if (!formData.plantedDate.trim()) {
      newErrors.plantedDate = 'Planted date is required';
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.plantedDate)) {
        newErrors.plantedDate = 'Use YYYY-MM-DD format';
      } else if (isNaN(Date.parse(formData.plantedDate))) {
        newErrors.plantedDate = 'Invalid date';
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
    if (!validateForm()) return;

    setLoading(true);
    try {
      const cropData = {
        name: formData.name.trim(),
        type: formData.type.trim(),
        farmId: formData.farmId,
        area: Number(formData.area),
        plantedDate: formData.plantedDate,
        health: Number(formData.health),
        status: formData.status,
      };

      await cropsAPI.create(cropData);
      success('Crop added successfully');
      router.back();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to add crop. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const selectedFarm = farms.find((f) => f.id === formData.farmId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Crop</Text>
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
            <TextInputField
              label="Crop Name *"
              placeholder="e.g. Maize Field A"
              value={formData.name}
              onChangeText={(value) => updateFormData('name', value)}
              error={errors.name}
            />
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Crop Type *"
              placeholder="e.g. Maize, Wheat, Soybean"
              value={formData.type}
              onChangeText={(value) => updateFormData('type', value)}
              error={errors.type}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Farm *</Text>
            <TouchableOpacity
              style={[
                styles.selectButton,
                errors.farmId && styles.selectError,
              ]}
              onPress={() => setShowFarmModal(true)}
            >
              <Text
                style={
                  selectedFarm ? styles.selectButtonText : styles.selectPlaceholder
                }
              >
                {selectedFarm ? selectedFarm.name : 'Select a farm'}
              </Text>
              <Text style={styles.selectArrow}>▼</Text>
            </TouchableOpacity>
            {errors.farmId && (
              <Text style={styles.errorText}>{errors.farmId}</Text>
            )}
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
                              item.id === formData.farmId && { color: colors.primary, fontWeight: '600' },
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
              label="Area (hectares) *"
              placeholder="Enter area"
              value={formData.area}
              onChangeText={(value) => updateFormData('area', value)}
              keyboardType="numeric"
              error={errors.area}
            />
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Planted Date *"
              placeholder="YYYY-MM-DD"
              value={formData.plantedDate}
              onChangeText={(value) => updateFormData('plantedDate', value)}
              error={errors.plantedDate}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Health (0-100)</Text>
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
              <View style={styles.healthBar}>
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
              <Text style={styles.healthValue}>{formData.health || 0}%</Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusContainer}>
              {(['growing', 'harvesting', 'completed'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusOption,
                    formData.status === s && styles.statusOptionActive,
                  ]}
                  onPress={() => updateFormData('status', s)}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      formData.status === s && styles.statusOptionTextActive,
                    ]}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Button
            title="Add Crop"
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