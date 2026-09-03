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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { offlineLivestockAPI, offlinePoultryAPI } from '../../../../src/services/offlineApi';
import { TextInputField, Button, colors } from '../../../../src/components/common/UIComponents';
import { ScreenLoading, StateView } from '../../../../src/components/feedback';
import { useToasts } from '../../../../src/hooks/useToasts';
import { describeApiError } from '../../../../src/utils/apiError';

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
  formGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 12, color: colors.text },
  currentHealth: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentHealthLabel: { fontSize: 14, color: colors.textLight, flex: 1 },
  currentHealthValue: { fontSize: 16, fontWeight: '700' },
  healthContainer: { flexDirection: 'row', gap: 8 },
  healthOption: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  healthOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F1F8E9',
  },
  healthIcon: { fontSize: 24, marginBottom: 6 },
  healthOptionText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  healthOptionTextSelected: { color: colors.primary },
  errorText: { color: colors.error, fontSize: 12, marginTop: 8 },
  previewCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  previewLabel: { fontSize: 13, color: colors.textLight },
  previewValue: { fontSize: 13, fontWeight: '600', color: colors.text },
  submitButton: { marginTop: 24 },
});

interface HealthData {
  health: 'healthy' | 'sick' | 'treatment';
  lastCheckup: string;
}

interface FormErrors {
  lastCheckup?: string;
}

interface AnimalData {
  id: string;
  name: string;
  type: 'livestock' | 'poultry';
  breed: string;
  quantity: number;
  health: 'healthy' | 'sick' | 'treatment';
  farm: string;
  lastCheckup: string;
}

const getHealthColor = (health: string) => {
  if (health === 'healthy') return colors.success;
  if (health === 'treatment') return colors.warning;
  return colors.error;
};

export default function AnimalHealthScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [animal, setAnimal] = useState<AnimalData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [healthData, setHealthData] = useState<HealthData>({
    health: 'healthy',
    lastCheckup: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    fetchAnimal();
  }, [id]);

  const fetchAnimal = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);

    try {
      const response = await offlineLivestockAPI.get(id);
      const data = response.data.data || response.data;
      setAnimal({ ...data, type: 'livestock' });
      setHealthData({
        health: data.health || 'healthy',
        lastCheckup: data.lastCheckup || '',
      });
    } catch {
      try {
        const response = await offlinePoultryAPI.get(id);
        const data = response.data.data || response.data;
        setAnimal({ ...data, type: 'poultry' });
        setHealthData({
          health: data.health || 'healthy',
          lastCheckup: data.lastCheckup || '',
        });
      } catch (error: any) {
        const message = describeApiError(error, 'Failed to load animal details.');
        setLoadError(message);
        showError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (healthData.lastCheckup.trim()) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(healthData.lastCheckup)) {
        newErrors.lastCheckup = 'Use YYYY-MM-DD format';
      } else if (isNaN(Date.parse(healthData.lastCheckup))) {
        newErrors.lastCheckup = 'Invalid date';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !animal) return;

    setSubmitting(true);
    try {
      const data = {
        health: healthData.health,
        lastCheckup: healthData.lastCheckup || undefined,
      };

      if (animal.type === 'livestock') {
        await offlineLivestockAPI.update(animal.id, data);
      } else {
        await offlinePoultryAPI.update(animal.id, data);
      }

      success('Health updated successfully');
      router.back();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to update health.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Update Health</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScreenLoading message="Loading animal details…" />
      </SafeAreaView>
    );
  }

  if (loadError || !animal) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Update Health</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load animal"
          message={loadError || 'Animal not found'}
          onRetry={fetchAnimal}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  const currentHealthColor = getHealthColor(healthData.health);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Update Health</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.currentHealth}>
            <Text style={styles.currentHealthLabel}>Animal</Text>
            <Text style={[styles.currentHealthValue, { color: colors.text }]}>
              {animal.name}
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Health Status *</Text>
            <View style={styles.healthContainer}>
              {(['healthy', 'sick', 'treatment'] as const).map((h) => {
                const isSelected = healthData.health === h;
                const color = getHealthColor(h);
                const icons: Record<string, string> = {
                  healthy: '✅',
                  sick: '🤒',
                  treatment: '💊',
                };
                return (
                  <TouchableOpacity
                    key={h}
                    style={[
                      styles.healthOption,
                      isSelected && styles.healthOptionSelected,
                      isSelected && { borderColor: color },
                    ]}
                    onPress={() => setHealthData((prev) => ({ ...prev, health: h }))}
                  >
                    <Text style={styles.healthIcon}>{icons[h]}</Text>
                    <Text
                      style={[
                        styles.healthOptionText,
                        isSelected && styles.healthOptionTextSelected,
                        isSelected && { color },
                      ]}
                    >
                      {h.charAt(0).toUpperCase() + h.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Last Checkup Date"
              placeholder="YYYY-MM-DD (optional)"
              value={healthData.lastCheckup}
              onChangeText={(v) => {
                setHealthData((prev) => ({ ...prev, lastCheckup: v }));
                if (errors.lastCheckup) setErrors((prev) => ({ ...prev, lastCheckup: undefined }));
              }}
              error={errors.lastCheckup}
            />
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Summary</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Health</Text>
              <Text style={[styles.previewValue, { color: currentHealthColor }]}>
                {healthData.health.charAt(0).toUpperCase() + healthData.health.slice(1)}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Last Checkup</Text>
              <Text style={styles.previewValue}>
                {healthData.lastCheckup || 'Not set'}
              </Text>
            </View>
          </View>

          <Button
            title="Save Health Update"
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