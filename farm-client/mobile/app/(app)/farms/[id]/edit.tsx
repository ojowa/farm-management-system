import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { farmsAPI } from '../../../../src/services/api';
import { TextInputField, Button, colors } from '../../../../src/core/ui/UIComponents';
import { ScreenLoading, StateView } from '../../../../src/core/ui/feedback';
import { useToasts } from '../../../../src/core/hooks/useToasts';
import { describeApiError } from '../../../../src/core/utils/apiError';

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
  switchContainer: {
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
  switchLabel: {
    fontSize: 16,
    color: colors.text,
  },
  submitButton: {
    marginTop: 20,
  },
});

interface FormData {
  name: string;
  location: string;
  size: string;
  crops: string;
  animals: string;
  status: 'active' | 'inactive';
}

interface FormErrors {
  name?: string;
  location?: string;
  size?: string;
  crops?: string;
  animals?: string;
}

interface FarmData {
  id: string;
  name: string;
  farmType: string;
  location: string;
  size: number;
  crops: number;
  animals: number;
  status: 'active' | 'inactive';
}

const FARM_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  CROP: { bg: '#DCFCE7', text: '#166534' },
  LIVESTOCK: { bg: '#FEF3C7', text: '#92400E' },
  POULTRY: { bg: '#FFEDD5', text: '#9A3412' },
  DAIRY: { bg: '#DBEAFE', text: '#1E40AF' },
  AQUACULTURE: { bg: '#CFFAFE', text: '#155E75' },
};

const FARM_TYPE_LABELS: Record<string, string> = {
  CROP: 'Crop',
  LIVESTOCK: 'Livestock',
  POULTRY: 'Poultry',
  DAIRY: 'Dairy',
  AQUACULTURE: 'Aquaculture',
};

export default function EditFarmScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [farm, setFarm] = useState<FarmData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    location: '',
    size: '',
    crops: '',
    animals: '',
    status: 'active',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    fetchFarm();
  }, [id]);

  const fetchFarm = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setLoadError(null);
      const response = await farmsAPI.get(id);
      const farmData = response.data as any;
      setFarm(farmData);
      setFormData({
        name: farmData.name || '',
        location: farmData.location || '',
        size: farmData.size?.toString() || '',
        crops: farmData.crops?.toString() || '',
        animals: farmData.animals?.toString() || '',
        status: farmData.status || 'active',
      });
    } catch (error: any) {
      const message = describeApiError(error, 'Failed to load farm details.');
      setLoadError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Farm name is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.size.trim()) {
      newErrors.size = 'Size is required';
    } else if (isNaN(Number(formData.size)) || Number(formData.size) <= 0) {
      newErrors.size = 'Size must be a positive number';
    }

    if (formData.crops.trim() && (isNaN(Number(formData.crops)) || Number(formData.crops) < 0)) {
      newErrors.crops = 'Crops must be a non-negative number';
    }

    if (formData.animals.trim() && (isNaN(Number(formData.animals)) || Number(formData.animals) < 0)) {
      newErrors.animals = 'Animals must be a non-negative number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !id) {
      return;
    }

    setSubmitting(true);
    try {
      const farmData = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        size: Number(formData.size),
        crops: formData.crops.trim() ? Number(formData.crops) : 0,
        animals: formData.animals.trim() ? Number(formData.animals) : 0,
        status: formData.status,
      };

      await farmsAPI.update(id, farmData);
      success('Farm updated successfully');
      router.back();
    } catch (error: any) {
      const message = describeApiError(error, 'Failed to update farm. Please try again.');
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string | 'active' | 'inactive') => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Farm</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScreenLoading message="Loading farm details…" />
      </SafeAreaView>
    );
  }

  if (loadError || !farm) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Farm</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load farm"
          message={loadError || 'Farm not found'}
          onRetry={fetchFarm}
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
        <Text style={styles.headerTitle}>Edit Farm</Text>
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
              label="Farm Name *"
              placeholder="Enter farm name"
              value={formData.name}
              onChangeText={(value) => updateFormData('name', value)}
              error={errors.name}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Farm Type</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <View style={{ backgroundColor: FARM_TYPE_COLORS[farm?.farmType]?.bg || '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: FARM_TYPE_COLORS[farm?.farmType]?.text || '#6B7280' }}>
                  {FARM_TYPE_LABELS[farm?.farmType || ''] || farm?.farmType || 'Unknown'}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Cannot be changed after creation</Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Location *"
              placeholder="Enter location"
              value={formData.location}
              onChangeText={(value) => updateFormData('location', value)}
              error={errors.location}
            />
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Size (hectares) *"
              placeholder="Enter size in hectares"
              value={formData.size}
              onChangeText={(value) => updateFormData('size', value)}
              keyboardType="numeric"
              error={errors.size}
            />
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Number of Crops"
              placeholder="Enter number of crops"
              value={formData.crops}
              onChangeText={(value) => updateFormData('crops', value)}
              keyboardType="numeric"
              error={errors.crops}
            />
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Number of Animals"
              placeholder="Enter number of animals"
              value={formData.animals}
              onChangeText={(value) => updateFormData('animals', value)}
              keyboardType="numeric"
              error={errors.animals}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>
                {formData.status === 'active' ? 'Active' : 'Inactive'}
              </Text>
              <Switch
                value={formData.status === 'active'}
                onValueChange={(value) =>
                  updateFormData('status', value ? 'active' : 'inactive')
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={formData.status === 'active' ? '#FFFFFF' : colors.textLight}
              />
            </View>
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