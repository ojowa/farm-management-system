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
import { farmsAPI, fieldsAPI } from '@/modules/farm';
import { TextInputField, Button, colors } from '@/core/ui/UIComponents';
import { StateView } from '@/core/ui/feedback';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
import { unwrapList } from '@/core/utils/listPayload';
import { usePermission } from '@/core/hooks/usePermission';
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
  submitButton: {
    marginTop: 20,
  },
});

interface FarmOption {
  id: string;
  name: string;
}

interface FormErrors {
  farmId?: string;
  name?: string;
  size?: string;
}

export default function AddFieldScreen() {
  const router = useRouter();
  const { farmId: paramFarmId } = useLocalSearchParams<{ farmId?: string }>();
  const { success, error: showError } = useToasts();
  const { canCreate } = usePermission();
  const canWrite = canCreate('farm');
  const { colors: tc } = useAppTheme();

  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [form, setForm] = useState({ farmId: '', name: '', size: '' });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    fetchFarms();
  }, []);

  // Seed the farm picker from ?farmId= — the farm detail "Add Field" action
  // and the add-cycle screen's empty-fields link both pass it. Only seed
  // values the user hasn't touched.
  useEffect(() => {
    if (paramFarmId) {
      const farm = String(paramFarmId);
      setForm((prev) => (prev.farmId ? prev : { ...prev, farmId: farm }));
    }
  }, [paramFarmId]);

  const fetchFarms = async () => {
    try {
      // GET /farms answers {farms, total, data} — an Array.isArray guard
      // alone always landed on the object and rendered an empty picker.
      const response = await farmsAPI.list({ limit: 200 });
      setFarms(
        unwrapList<any>(response.data).map((f: any) => ({ id: f.id, name: f.name }))
      );
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to load farms.'));
    }
  };

  const selectedFarm = farms.find((f) => f.id === form.farmId);

  const updateForm = (field: 'farmId' | 'name' | 'size', value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.farmId) {
      newErrors.farmId = 'Please select a farm';
    }

    if (!form.name.trim()) {
      newErrors.name = 'Field name is required';
    }

    if (!form.size.trim()) {
      newErrors.size = 'Size is required';
    } else if (isNaN(Number(form.size)) || Number(form.size) < 0) {
      newErrors.size = 'Size must be a number of 0 or more';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await fieldsAPI.create({
        farmId: form.farmId,
        name: form.name.trim(),
        size: Number(form.size),
      });
      success('Field added');
      router.back();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to add field. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // The server enforces farm.write on POST /fields — mirror that up front
  // instead of showing a form that can only 403.
  if (!canWrite) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Field</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="You don't have permission"
          message="You don't have permission to create fields. Ask your administrator for farm.write access."
          onRetry={() => router.back()}
          retryLabel="Go Back"
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
        <Text style={styles.headerTitle}>Add Field</Text>
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
            <Text style={[styles.label, { color: tc.text }]}>Farm *</Text>
            <TouchableOpacity
              style={[
                styles.selectButton,
                errors.farmId && styles.selectError,
                { backgroundColor: tc.card },
                errors.farmId ? undefined : { borderColor: tc.border },
              ]}
              onPress={() => setShowFarmModal(true)}
            >
              <Text
                style={[
                  styles.selectButtonText,
                  selectedFarm ? { color: tc.text } : { color: tc.textSecondary },
                ]}
              >
                {selectedFarm ? selectedFarm.name : 'Select a farm'}
              </Text>
              <Text style={[styles.selectArrow, { color: tc.textSecondary }]}>▼</Text>
            </TouchableOpacity>
            {errors.farmId && <Text style={styles.errorText}>{errors.farmId}</Text>}
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Field Name *"
              placeholder="e.g. North Valley Plot"
              value={form.name}
              onChangeText={(value) => updateForm('name', value)}
              error={errors.name}
            />
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Size (hectares) *"
              placeholder="e.g. 12.5"
              value={form.size}
              onChangeText={(value) => updateForm('size', value)}
              keyboardType="numeric"
              error={errors.size}
            />
          </View>

          <Button
            title="Add Field"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showFarmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFarmModal(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: tc.overlay }]}
          activeOpacity={1}
          onPress={() => setShowFarmModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalContent, { backgroundColor: tc.surface }]}>
              <Text style={[styles.modalTitle, { color: tc.text }]}>Select Farm</Text>
              {farms.length === 0 ? (
                <View style={styles.modalItemEmpty}>
                  <Text style={[styles.modalItemEmptyText, { color: tc.textSecondary }]}>
                    No farms available
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={farms}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        { borderBottomColor: tc.surface },
                      ]}
                      onPress={() => {
                        updateForm('farmId', item.id);
                        setShowFarmModal(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          item.id === form.farmId
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
                onPress={() => setShowFarmModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
