import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useCreateFarmMutation } from '@/modules/farm';
import type { CreateFarmRequest } from '@/modules/farm';
import type { User } from '@/modules/auth';
import { TextInputField, Button } from '@/core/ui/UIComponents';
import { StateView } from '@/core/ui/feedback';
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
  planHint: {
    fontSize: 12,
    marginTop: 8,
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

export default function AddFarmScreen() {
  const router = useRouter();
  const { success, error: showError } = useToasts();
  const { canCreate } = usePermission();
  const canWrite = canCreate('farm');
  // The auth slice's cached user type predates the plan's farm caps; the
  // server includes `maxFarms` in planFeatures (canonical shape in
  // services/types.ts), so read the user through that type.
  const user = useAppSelector((s) => s.auth.user) as User | null;
  const { colors: themeColors, isDark } = useAppTheme();
  const [createFarm, { isLoading: isCreating }] = useCreateFarmMutation();

  // Plan-filtered picker: only farm types the org's plan includes are
  // offered. An empty/missing plan list is RESTRICTIVE, not permissive —
  // the server falls back to ['CROP'] when features.farmTypes is absent
  // (kernel/database features.ts), so the picker mirrors that instead of
  // showing all five types. The server re-checks the plan on create and a
  // 403 entitlement message is surfaced verbatim via describeApiError.
  const allowedFarmTypes = user?.planFeatures?.farmTypes;
  const farmTypes = FARM_TYPES.filter((type) =>
    allowedFarmTypes && allowedFarmTypes.length > 0
      ? allowedFarmTypes.includes(type)
      : type === 'CROP'
  );

  const [formData, setFormData] = useState<FormData>({
    name: '',
    farmType: '',
    location: '',
    size: '',
    status: 'active',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Farm name is required';
    }

    if (!formData.farmType) {
      newErrors.farmType = 'Farm type is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.size.trim()) {
      newErrors.size = 'Size is required';
    } else if (isNaN(Number(formData.size)) || Number(formData.size) <= 0) {
      newErrors.size = 'Size must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    // The server scopes farms from the caller's JWT — a body-supplied
    // organizationId is ignored (and would be a tenant-escape attempt), so
    // it is never sent.
    const payload: Omit<CreateFarmRequest, 'organizationId'> = {
      name: formData.name.trim(),
      farmType: formData.farmType as CreateFarmRequest['farmType'],
      location: formData.location.trim(),
      size: Number(formData.size),
      status: formData.status,
    };

    try {
      await createFarm(payload).unwrap();
      success('Farm created successfully');
      router.back();
    } catch (error) {
      showError(describeApiError(error, 'Failed to create farm. Please try again.'));
    }
  };

  const updateFormData = (field: keyof FormData, value: string | 'active' | 'inactive') => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
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
    planHint: {
      color: themeColors.textSecondary,
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
          <Text style={styles.headerTitle}>Add Farm</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="You don't have permission"
          message="You don't have permission to create farms. Ask your administrator for farm.write access."
          onRetry={() => router.back()}
          retryLabel="Go Back"
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
        <Text style={styles.headerTitle}>Add Farm</Text>
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
            {user?.planFeatures?.maxFarms ? (
              <Text style={[styles.planHint, dynamicStyles.planHint]}>
                Your plan allows up to {user.planFeatures.maxFarms} farms.
              </Text>
            ) : null}
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
            title="Create Farm"
            onPress={handleSubmit}
            loading={isCreating}
            disabled={isCreating}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
