import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { farmsAPI } from '../../../src/services/api';
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

export default function AddFarmScreen() {
  const router = useRouter();
  const { success, error: showError } = useToasts();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    location: '',
    size: '',
    crops: '',
    animals: '',
    status: 'active',
  });
  const [errors, setErrors] = useState<FormErrors>({});

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
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const farmData = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        size: Number(formData.size),
        crops: formData.crops.trim() ? Number(formData.crops) : 0,
        animals: formData.animals.trim() ? Number(formData.animals) : 0,
        status: formData.status,
      };

      await farmsAPI.create(farmData);
      success('Farm created successfully');
      router.back();
    } catch (error: any) {
      const message = describeApiError(error, 'Failed to create farm. Please try again.');
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string | 'active' | 'inactive') => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Farm</Text>
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
            title="Create Farm"
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