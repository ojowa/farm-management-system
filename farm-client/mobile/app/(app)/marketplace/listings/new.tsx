import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { marketplaceAPI } from '@/modules/finance';
import { Button, Card, TextInputField } from '@/core/ui/UIComponents';
import { SelectField, SelectOption } from '@/core/ui/SelectField';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { describeApiError } from '@/core/utils/apiError';

const entityTypes: SelectOption[] = [
  { id: 'crop', label: 'Crop' },
  { id: 'livestock', label: 'Livestock' },
  { id: 'poultry', label: 'Poultry' },
];
const statuses: SelectOption[] = [
  { id: 'ACTIVE', label: 'Active' },
  { id: 'SOLD', label: 'Sold' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export default function NewListingScreen() {
  const router = useRouter();
  const { hasPermission } = usePermission();
  const { success, error: showError } = useToasts();
  const { colors: tc } = useAppTheme();
  const [form, setForm] = useState({ entityType: 'crop', title: '', price: '', quantity: '', unit: '', status: 'ACTIVE', soldDate: '' });
  const [saving, setSaving] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!hasPermission('finance.write')) {
      showError('You do not have permission to create listings.');
      return;
    }
    const price = Number(form.price);
    const quantity = Number(form.quantity);
    if (!form.title.trim() || !Number.isFinite(price) || price < 0 || !Number.isFinite(quantity) || quantity <= 0 || !form.unit.trim()) {
      showError('Enter a title, non-negative price, positive quantity, and unit.');
      return;
    }
    if (form.soldDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.soldDate)) {
      showError('Sold date must use YYYY-MM-DD format.');
      return;
    }
    setSaving(true);
    try {
      await marketplaceAPI.createListing({
        entityType: form.entityType,
        title: form.title.trim(),
        price,
        quantity,
        unit: form.unit.trim(),
        status: form.status,
        soldDate: form.soldDate || undefined,
      });
      success('Listing created successfully');
      router.replace('/marketplace');
    } catch (error) {
      showError(describeApiError(error, 'Failed to create listing.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back to marketplace"><Text style={styles.back}>‹</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>New Listing</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={[styles.card, { backgroundColor: tc.card }]}>
          <SelectField label="Product type *" value={form.entityType} options={entityTypes} onSelect={(value) => update('entityType', value)} />
          <TextInputField label="Title *" placeholder="e.g. Fresh tomatoes" value={form.title} onChangeText={(value) => update('title', value)} />
          <TextInputField label="Price per unit *" placeholder="0.00" keyboardType="numeric" value={form.price} onChangeText={(value) => update('price', value)} />
          <TextInputField label="Quantity *" placeholder="0" keyboardType="numeric" value={form.quantity} onChangeText={(value) => update('quantity', value)} />
          <TextInputField label="Unit *" placeholder="e.g. kg" value={form.unit} onChangeText={(value) => update('unit', value)} />
          <SelectField label="Status" value={form.status} options={statuses} onSelect={(value) => update('status', value)} />
          {form.status === 'SOLD' && <TextInputField label="Sold date" placeholder="YYYY-MM-DD" value={form.soldDate} onChangeText={(value) => update('soldDate', value)} />}
          <View style={styles.actions}>
            <Button title="Cancel" variant="secondary" style={styles.actionButton} onPress={() => router.back()} />
            <Button title="Create Listing" style={styles.actionButton} loading={saving} onPress={submit} />
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
