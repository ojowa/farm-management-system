import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { contractsAPI } from '@/modules/finance';
import { Button, Card, TextInputField } from '@/core/ui/UIComponents';
import { SelectField, SelectOption } from '@/core/ui/SelectField';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { describeApiError } from '@/core/utils/apiError';

const types: SelectOption[] = [{ id: 'Buy', label: 'Buy' }, { id: 'Sell', label: 'Sell' }];

export default function NewContractScreen() {
  const router = useRouter();
  const { hasPermission } = usePermission();
  const { success, error: showError } = useToasts();
  const { colors: tc } = useAppTheme();
  const [form, setForm] = useState({ type: 'Sell', buyerSellerName: '', startDate: '', endDate: '', value: '', terms: '' });
  const [saving, setSaving] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!hasPermission('finance.write')) {
      showError('You do not have permission to create contracts.');
      return;
    }
    if (!form.buyerSellerName.trim()) {
      showError('Counterparty name is required.');
      return;
    }
    if (form.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.startDate)) {
      showError('Start date must use YYYY-MM-DD format.');
      return;
    }
    if (form.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.endDate)) {
      showError('End date must use YYYY-MM-DD format.');
      return;
    }
    if (form.value && (!Number.isFinite(Number(form.value)) || Number(form.value) < 0)) {
      showError('Contract value must be zero or greater.');
      return;
    }
    setSaving(true);
    try {
      await contractsAPI.create({
        type: form.type,
        buyerSellerName: form.buyerSellerName.trim(),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        value: form.value ? Number(form.value) : undefined,
        terms: form.terms.trim() || undefined,
      });
      success('Contract created successfully');
      router.replace('/contracts');
    } catch (error) {
      showError(describeApiError(error, 'Failed to create contract.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back to contracts"><Text style={styles.back}>‹</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Add Contract</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={[styles.card, { backgroundColor: tc.card }]}>
          <SelectField label="Contract type *" value={form.type} options={types} onSelect={(value) => update('type', value)} />
          <TextInputField label="Counterparty name *" placeholder="e.g. ABC Suppliers Ltd" value={form.buyerSellerName} onChangeText={(value) => update('buyerSellerName', value)} />
          <TextInputField label="Start date" placeholder="YYYY-MM-DD" value={form.startDate} onChangeText={(value) => update('startDate', value)} />
          <TextInputField label="End date" placeholder="YYYY-MM-DD" value={form.endDate} onChangeText={(value) => update('endDate', value)} />
          <TextInputField label="Contract value" placeholder="0.00" keyboardType="numeric" value={form.value} onChangeText={(value) => update('value', value)} />
          <TextInputField label="Terms" placeholder="Contract terms and conditions" value={form.terms} onChangeText={(value) => update('terms', value)} />
          <View style={styles.actions}>
            <Button title="Cancel" variant="secondary" style={styles.actionButton} onPress={() => router.back()} />
            <Button title="Create Contract" style={styles.actionButton} loading={saving} onPress={submit} />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 18 },
  back: { color: '#FFFFFF', fontSize: 32, lineHeight: 34 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 32 },
  card: { padding: 16 },
  actions: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1 },
});
