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
import { workersAPI } from '@/modules/hr';
import type { Worker } from '@/modules/hr';
import { farmsAPI } from '@/modules/farm';
import { TextInputField, Button, colors } from '@/core/ui/UIComponents';
import { SelectField, SelectOption } from '@/core/ui/SelectField';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 10,
  },
});

const WORKER_STATUS_OPTIONS: SelectOption[] = [
  { id: 'ACTIVE', label: 'Active' },
  { id: 'INACTIVE', label: 'Inactive' },
  { id: 'PROBATION', label: 'Probation' },
  { id: 'TERMINATED', label: 'Terminated' },
];

const PAY_TYPE_OPTIONS: SelectOption[] = [
  { id: 'HOURLY', label: 'Hourly' },
  { id: 'SALARY', label: 'Salary' },
  { id: 'PIECE', label: 'Piece rate' },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function unwrapList<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function unwrapOne<T>(payload: any): T | null {
  if (payload?.id) return payload as T;
  if (payload?.data?.id) return payload.data as T;
  return null;
}

interface FormData {
  farmId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  hireDate: string;
  status: string;
  payRate: string;
  payType: string;
  skills: string;
  terminationDate: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
}

interface FormErrors {
  farmId?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  email?: string;
  hireDate?: string;
  payRate?: string;
  terminationDate?: string;
}

export default function EditWorkerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const { colors: tc, isDark } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [farms, setFarms] = useState<SelectOption[]>([]);

  const [formData, setFormData] = useState<FormData>({
    farmId: '',
    firstName: '',
    middleName: '',
    lastName: '',
    position: '',
    department: '',
    email: '',
    phone: '',
    hireDate: '',
    status: 'ACTIVE',
    payRate: '',
    payType: '',
    skills: '',
    terminationDate: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const dynamicStyles = {
    container: {
      backgroundColor: tc.background,
    },
    sectionTitle: {
      color: tc.textSecondary,
    },
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  const loadAll = async () => {
    if (!id) {
      setLoadError('Missing worker id.');
      setLoading(false);
      return;
    }
    try {
      setLoadError(null);
      const response = await workersAPI.get(id);
      const record = unwrapOne<Worker>(response.data);
      if (!record) {
        setLoadError('Worker not found.');
        return;
      }
      setFormData({
        farmId: record.farmId ?? '',
        firstName: record.firstName ?? '',
        middleName: record.middleName ?? '',
        lastName: record.lastName ?? '',
        position: record.position ?? '',
        department: record.department ?? '',
        email: record.email ?? '',
        phone: record.phone ?? '',
        hireDate: record.hireDate ? String(record.hireDate).slice(0, 10) : '',
        status: record.status ?? 'ACTIVE',
        payRate: record.payRate != null ? String(record.payRate) : '',
        payType: record.payType ?? '',
        skills: (record.skills ?? []).join(', '),
        terminationDate: record.terminationDate
          ? String(record.terminationDate).slice(0, 10)
          : '',
        emergencyContactName: record.emergencyContactName ?? '',
        emergencyContactPhone: record.emergencyContactPhone ?? '',
        emergencyContactRelation: record.emergencyContactRelation ?? '',
      });
      loadFarms();
    } catch (error: any) {
      setLoadError(describeApiError(error, 'Failed to load worker.'));
    } finally {
      setLoading(false);
    }
  };

  const loadFarms = async () => {
    try {
      const response = await farmsAPI.list();
      setFarms(unwrapList<any>(response.data).map((f: any) => ({ id: f.id, label: f.name })));
    } catch {
      /* the select shows "No options available" */
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.farmId) newErrors.farmId = 'Please select a farm';
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.position.trim()) newErrors.position = 'Position is required';
    if (formData.email.trim() && !/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }
    if (formData.hireDate.trim()) {
      if (!DATE_RE.test(formData.hireDate.trim()) || isNaN(Date.parse(formData.hireDate.trim()))) {
        newErrors.hireDate = 'Use YYYY-MM-DD';
      }
    }
    if (formData.payRate.trim()) {
      const rate = Number(formData.payRate.trim());
      if (!Number.isFinite(rate) || rate < 0) newErrors.payRate = 'Enter a number ≥ 0';
    }
    if (formData.terminationDate.trim()) {
      if (
        !DATE_RE.test(formData.terminationDate.trim()) ||
        isNaN(Date.parse(formData.terminationDate.trim()))
      ) {
        newErrors.terminationDate = 'Use YYYY-MM-DD';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      await workersAPI.update(id!, {
        farmId: formData.farmId,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        middleName: formData.middleName.trim(),
        position: formData.position.trim(),
        department: formData.department.trim(),
        // Blank must mean "leave unchanged" — an empty string would wipe the
        // worker's login email.
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim(),
        hireDate: formData.hireDate.trim() || null,
        status: formData.status,
        payRate: formData.payRate.trim() ? Number(formData.payRate.trim()) : null,
        payType: formData.payType || null,
        skills: formData.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        terminationDate: formData.terminationDate.trim() || null,
        emergencyContactName: formData.emergencyContactName.trim() || null,
        emergencyContactPhone: formData.emergencyContactPhone.trim() || null,
        emergencyContactRelation: formData.emergencyContactRelation.trim() || null,
      });
      success('Worker updated successfully');
      router.back();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to update worker. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Worker</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScreenLoading message="Loading worker…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Worker</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load this worker"
          message={loadError}
          onRetry={loadAll}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Worker</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <SelectField
            label="Farm *"
            placeholder="Select a farm"
            value={formData.farmId}
            options={farms}
            onSelect={(v) => updateFormData('farmId', v)}
            error={errors.farmId}
          />

          <TextInputField
            label="First Name *"
            placeholder="e.g. John"
            value={formData.firstName}
            onChangeText={(v) => updateFormData('firstName', v)}
            error={errors.firstName}
          />

          <TextInputField
            label="Middle Name"
            placeholder="Optional"
            value={formData.middleName}
            onChangeText={(v) => updateFormData('middleName', v)}
          />

          <TextInputField
            label="Last Name *"
            placeholder="e.g. Doe"
            value={formData.lastName}
            onChangeText={(v) => updateFormData('lastName', v)}
            error={errors.lastName}
          />

          <TextInputField
            label="Position *"
            placeholder="e.g. Farm Hand"
            value={formData.position}
            onChangeText={(v) => updateFormData('position', v)}
            error={errors.position}
          />

          <TextInputField
            label="Department"
            placeholder="e.g. Dairy"
            value={formData.department}
            onChangeText={(v) => updateFormData('department', v)}
          />

          <TextInputField
            label="Email"
            placeholder="e.g. john@example.com"
            value={formData.email}
            onChangeText={(v) => updateFormData('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <TextInputField
            label="Phone"
            placeholder="e.g. +1 555 0100"
            value={formData.phone}
            onChangeText={(v) => updateFormData('phone', v)}
            keyboardType="phone-pad"
          />

          <TextInputField
            label="Hire Date"
            placeholder="YYYY-MM-DD"
            value={formData.hireDate}
            onChangeText={(v) => updateFormData('hireDate', v)}
            error={errors.hireDate}
          />

          <SelectField
            label="Status"
            placeholder="Select a status"
            value={formData.status}
            options={WORKER_STATUS_OPTIONS}
            onSelect={(v) => updateFormData('status', v)}
          />

          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Employment</Text>

          <TextInputField
            label="Pay Rate"
            placeholder="e.g. 15.50"
            value={formData.payRate}
            onChangeText={(v) => updateFormData('payRate', v)}
            keyboardType="numeric"
            error={errors.payRate}
          />

          <SelectField
            label="Pay Type"
            placeholder="Select a pay type"
            value={formData.payType}
            options={PAY_TYPE_OPTIONS}
            onSelect={(v) => updateFormData('payType', v)}
          />

          <TextInputField
            label="Skills"
            placeholder="Comma-separated, e.g. Milking, Tractor"
            value={formData.skills}
            onChangeText={(v) => updateFormData('skills', v)}
          />

          <TextInputField
            label="Termination Date"
            placeholder="YYYY-MM-DD"
            value={formData.terminationDate}
            onChangeText={(v) => updateFormData('terminationDate', v)}
            error={errors.terminationDate}
          />

          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Emergency Contact</Text>

          <TextInputField
            label="Contact Name"
            placeholder="e.g. Jane Doe"
            value={formData.emergencyContactName}
            onChangeText={(v) => updateFormData('emergencyContactName', v)}
          />

          <TextInputField
            label="Contact Phone"
            placeholder="e.g. +1 555 0101"
            value={formData.emergencyContactPhone}
            onChangeText={(v) => updateFormData('emergencyContactPhone', v)}
            keyboardType="phone-pad"
          />

          <TextInputField
            label="Relationship"
            placeholder="e.g. Spouse"
            value={formData.emergencyContactRelation}
            onChangeText={(v) => updateFormData('emergencyContactRelation', v)}
          />

          <Button
            title="Save Changes"
            onPress={handleSubmit}
            loading={saving}
            disabled={saving}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
