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
import { useGetFarmQuery, useUpdateFarmMutation } from '@/store/api';
import type { UpdateFarmRequest } from '@/services/types';
import { TextInputField, Button } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
import { usePermission } from '@/core/hooks/usePermission';
import { useAppSelector } from '@/modules/auth/hooks/useAuth';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { FARM_TYPES, FARM_TYPE_COLORS, FARM_TYPE_LABELS } from '@/core/farmTypes';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
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
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  switchLabel: {
    fontSize: 16,
  },
  submitButton: {
    marginTop: 20,
  },
});

interface FormData {
  name: string;
  farmType: string;
  location: string;
  size: string;
  status: 'active' | 'inactive';
}

interface FormErrors {
  name?: string;
  farmType?: string;
  location?: string;
  size?: string;
}

export default function EditFarmScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const { canUpdate } = usePermission();
  const canWrite = canUpdate('farm');
  const user = useAppSelector((s) => s.auth.user);
  const { colors: themeColors, isDark } = useAppTheme();

  const { data: farm, isLoading, error: loadError, refetch } = useGetFarmQuery(id);
  const [updateFarm, { isLoading: isSubmitting }] = useUpdateFarmMutation();

  const [formData, setFormData] = useState<FormData | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  // Seed the form once from the fetched farm; afterwards the user's edits
  // own the state.
  useEffect(() => {
    if (!farm || formData) return;
    setFormData({
      name: farm.name || '',
      farmType: String(farm.farmType || ''),
      location: farm.location || '',
      size: farm.size?.toString() || '',
      status:
        String(farm.status || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active',
    });
  }, [farm, formData]);

  // Plan-filtered picker, same rule as the add screen: only plan-allowed
  // types are offered (missing/empty plan list behaves like ['CROP'],
  // mirroring the server), but the farm's CURRENT type is always selectable
  // so an existing farm can never become un-editable.
  const allowedFarmTypes = user?.planFeatures?.farmTypes;
  const farmTypes = FARM_TYPES.filter(
    (type) =>
      (allowedFarmTypes && allowedFarmTypes.length > 0
        ? allowedFarmTypes.includes(type)
        : type === 'CROP') ||
      type === farm?.farmType
  );

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData?.name.trim()) {
      newErrors.name = 'Farm name is required';
    }

    if (!formData?.farmType) {
      newErrors.farmType = 'Farm type is required';
    }

    if (!formData?.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData?.size.trim()) {
      newErrors.size = 'Size is required';
    } else if (isNaN(Number(formData.size)) || Number(formData.size) <= 0) {
      newErrors.size = 'Size must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!formData || !validateForm() || !id) {
      return;
    }

    const payload: UpdateFarmRequest = {
      name: formData.name.trim(),
      farmType: formData.farmType as UpdateFarmRequest['farmType'],
      location: formData.location.trim(),
      size: Number(formData.size),
      status: formData.status,
    };

    try {
      await updateFarm({ id, data: payload }).unwrap();
      success('Farm updated successfully');
      router.back();
    } catch (error) {
      showError(describeApiError(error, 'Failed to update farm. Please try again.'));
    }
  };

  const updateFormData = (field: keyof FormData, value: string | 'active' | 'inactive') => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const dynamicStyles = {
    container: {
      backgroundColor: themeColors.background,
    },
    header: {
      backgroundColor: themeColors.headerBg || themeColors.primary,
    },
    label: {
      color: themeColors.text,
    },
    switchContainer: {
      backgroundColor: themeColors.card,
      borderColor: isDark ? themeColors.border : themeColors.borderLight,
    },
    switchLabel: {
      color: themeColors.text,
    },
    errorText: {
      color: themeColors.error,
    },
  };

  // Hooks above stay unconditional; the permission gate replaces only the
  // form body (the API would 403 farm.write regardless).
  if (!canWrite) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, dynamicStyles.header]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Farm</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="You don't have permission"
          message="You don't have permission to edit farms. Ask your administrator for farm.write access."
          onRetry={() => router.back()}
          retryLabel="Go Back"
        />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, dynamicStyles.header]}>
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

  if (loadError || !farm || !formData) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, dynamicStyles.header]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Farm</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load farm"
          message={
            loadError
              ? describeApiError(loadError, 'Failed to load farm details.')
              : 'Farm not found'
          }
          onRetry={refetch}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Farm</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
            <Text style={[styles.label, dynamicStyles.label]}>Farm Type *</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {farmTypes.map((type) => {
                const isSelected = formData.farmType === type;
                const typeColors = FARM_TYPE_COLORS[type] || { bg: '#F3F4F6', text: '#6B7280' };
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => updateFormData('farmType', type)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected
                        ? typeColors.text
                        : isDark ? themeColors.border : '#D1D5DB',
                      backgroundColor: isSelected
                        ? typeColors.bg
                        : isDark ? themeColors.surface : '#F9FAFB',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected ? '600' : '400',
                        color: isSelected
                          ? typeColors.text
                          : isDark ? themeColors.textSecondary : '#6B7280',
                      }}
                    >
                      {FARM_TYPE_LABELS[type] || type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.farmType && (
              <Text style={[{ fontSize: 12, marginTop: 4 }, dynamicStyles.errorText]}>
                {errors.farmType}
              </Text>
            )}
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
            <Text style={[styles.label, dynamicStyles.label]}>Status</Text>
            <View style={[styles.switchContainer, dynamicStyles.switchContainer]}>
              <Text style={[styles.switchLabel, dynamicStyles.switchLabel]}>
                {formData.status === 'active' ? 'Active' : 'Inactive'}
              </Text>
              <Switch
                value={formData.status === 'active'}
                onValueChange={(value) =>
                  updateFormData('status', value ? 'active' : 'inactive')
                }
                trackColor={{ false: themeColors.border, true: themeColors.primary }}
                thumbColor={formData.status === 'active' ? '#FFFFFF' : themeColors.textSecondary}
              />
            </View>
          </View>

          <Button
            title="Save Changes"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
