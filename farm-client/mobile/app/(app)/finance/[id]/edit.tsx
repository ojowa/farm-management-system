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
import { offlineFinanceAPI } from '../../../../src/services/offlineApi';
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
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: colors.text },
  typeContainer: { flexDirection: 'row', gap: 12 },
  typeOption: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  typeOptionIncome: { backgroundColor: '#E8F5E9', borderColor: colors.success },
  typeOptionExpense: { backgroundColor: '#FFEBEE', borderColor: colors.error },
  typeIcon: { fontSize: 24, marginBottom: 4 },
  typeLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  typeLabelIncome: { color: colors.success },
  typeLabelExpense: { color: colors.error },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { fontSize: 13, color: colors.text },
  categoryTextActive: { color: '#FFFFFF' },
  errorText: { color: colors.error, fontSize: 12, marginTop: 4 },
  submitButton: { marginTop: 20 },
});

const INCOME_CATEGORIES = ['Crops', 'Livestock', 'Poultry', 'Services', 'Other'];
const EXPENSE_CATEGORIES = ['Seeds', 'Fertilizer', 'Feed', 'Veterinary', 'Equipment', 'Labor', 'Utilities', 'Other'];

interface FormData {
  title: string;
  description: string;
  type: 'income' | 'expense';
  category: string;
  amount: string;
  date: string;
}

interface FormErrors {
  title?: string;
  category?: string;
  amount?: string;
  date?: string;
}

interface TransactionData {
  id: string;
  title: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  icon: string;
}

export default function EditTransactionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transaction, setTransaction] = useState<TransactionData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    type: 'income',
    category: '',
    amount: '',
    date: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const categories = formData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    fetchTransaction();
  }, [id]);

  const fetchTransaction = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setLoadError(null);
      const response = await offlineFinanceAPI.get(id);
      const data = response.data.data || response.data;
      setTransaction(data);
      setFormData({
        title: data.title || '',
        description: data.description || '',
        type: data.type || 'income',
        category: data.category || '',
        amount: Math.abs(data.amount)?.toString() || '',
        date: data.date || '',
      });
    } catch (error: any) {
      const message = describeApiError(error, 'Failed to load transaction.');
      setLoadError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    const cat = formData.category.toLowerCase();
    if (formData.type === 'income') {
      if (cat.includes('crop')) return '🌾';
      if (cat.includes('livestock')) return '🐄';
      if (cat.includes('poultry')) return '🐔';
      return '💵';
    }
    if (cat.includes('seed')) return '🌱';
    if (cat.includes('fertil')) return '🧪';
    if (cat.includes('feed')) return '🌾';
    if (cat.includes('vet')) return '💊';
    if (cat.includes('equip')) return '🔧';
    if (cat.includes('labor')) return '👷';
    if (cat.includes('util')) return '⚡';
    return '💸';
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.category) newErrors.category = 'Please select a category';
    if (!formData.amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    }
    if (!formData.date.trim()) {
      newErrors.date = 'Date is required';
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.date)) {
        newErrors.date = 'Use YYYY-MM-DD format';
      } else if (isNaN(Date.parse(formData.date))) {
        newErrors.date = 'Invalid date';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !id) return;
    setSubmitting(true);
    try {
      const amount = Number(formData.amount);
      const data = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        category: formData.category,
        amount: formData.type === 'expense' ? -amount : amount,
        date: formData.date,
        icon: getIcon(),
      };
      await offlineFinanceAPI.update(id, data);
      success('Transaction updated successfully');
      router.back();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to update transaction.'));
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

  const handleTypeChange = (type: 'income' | 'expense') => {
    setFormData((prev) => ({ ...prev, type, category: '' }));
    if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Transaction</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScreenLoading message="Loading transaction…" />
      </SafeAreaView>
    );
  }

  if (loadError || !transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Transaction</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load transaction"
          message={loadError || 'Transaction not found'}
          onRetry={fetchTransaction}
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
        <Text style={styles.headerTitle}>Edit Transaction</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.formGroup}>
            <Text style={styles.label}>Type *</Text>
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  formData.type === 'income' && styles.typeOptionIncome,
                ]}
                onPress={() => handleTypeChange('income')}
              >
                <Text style={styles.typeIcon}>📈</Text>
                <Text
                  style={[
                    styles.typeLabel,
                    formData.type === 'income' && styles.typeLabelIncome,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  formData.type === 'expense' && styles.typeOptionExpense,
                ]}
                onPress={() => handleTypeChange('expense')}
              >
                <Text style={styles.typeIcon}>📉</Text>
                <Text
                  style={[
                    styles.typeLabel,
                    formData.type === 'expense' && styles.typeLabelExpense,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Title *"
              placeholder="e.g. Maize Sale"
              value={formData.title}
              onChangeText={(v) => updateFormData('title', v)}
              error={errors.title}
            />
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Description"
              placeholder="Optional description"
              value={formData.description}
              onChangeText={(v) => updateFormData('description', v)}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.categoryContainer}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryOption,
                    formData.category === cat && styles.categoryOptionActive,
                  ]}
                  onPress={() => updateFormData('category', cat)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      formData.category === cat && styles.categoryTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Amount ($) *"
              placeholder="0.00"
              value={formData.amount}
              onChangeText={(v) => updateFormData('amount', v)}
              keyboardType="numeric"
              error={errors.amount}
            />
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Date *"
              placeholder="YYYY-MM-DD"
              value={formData.date}
              onChangeText={(v) => updateFormData('date', v)}
              error={errors.date}
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