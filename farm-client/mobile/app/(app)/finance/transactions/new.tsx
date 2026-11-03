import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { farmsAPI } from '@/modules/farm';
import { budgetsAPI, currencyAPI, financeAPI } from '@/modules/finance';
import { Button, Card, TextInputField } from '@/core/ui/UIComponents';
import { SelectField, SelectOption } from '@/core/ui/SelectField';
import { ScreenLoading } from '@/core/ui/feedback';
import { useAppSelector } from '@/modules/auth/hooks/useAuth';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { describeApiError } from '@/core/utils/apiError';
import { unwrapList } from '@/core/utils/listPayload';
import { useToasts } from '@/core/hooks/useToasts';

type TransactionType = 'expense' | 'sale';
type FarmOption = { id: string; name: string };
type FormValues = {
  title: string;
  item: string;
  amount: string;
  quantity: string;
  price: string;
  date: string;
  farmId: string;
  currency: string;
  budgetCategoryId: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const typeOptions: SelectOption[] = [
  { id: 'expense', label: 'Expense' },
  { id: 'sale', label: 'Sale' },
];

export default function NewTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; farmId?: string; title?: string; item?: string; amount?: string; quantity?: string; price?: string; date?: string }>();
  const selectedFarmId = useAppSelector((state) => state.ui.selectedFarmId);
  const { colors: tc } = useAppTheme();
  const { success, error: showError } = useToasts();
  const initialType: TransactionType = params.type === 'sale' ? 'sale' : 'expense';
  const [type, setType] = useState<TransactionType>(initialType);
  const [form, setForm] = useState<FormValues>({
    title: params.title || '',
    item: params.item || '',
    amount: params.amount || '',
    quantity: params.quantity || '',
    price: params.price || '',
    date: params.date || today(),
    farmId: params.farmId || selectedFarmId || '',
    currency: 'USD',
    budgetCategoryId: '',
  });
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [currencyOptions, setCurrencyOptions] = useState<SelectOption[]>([{ id: 'USD', label: 'USD' }]);
  const [budgetOptions, setBudgetOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadOptions = async () => {
      try {
        const [farmResult, currencyResult, budgetResult] = await Promise.allSettled([
          farmsAPI.list({ limit: 100 }),
          currencyAPI.list(),
          budgetsAPI.list(),
        ]);
        if (!active) return;
        if (farmResult.status === 'rejected') throw farmResult.reason;
        const farmRows = unwrapList<FarmOption>(farmResult.value.data);
        setFarms(farmRows);
        if (!form.farmId && selectedFarmId) setForm((prev) => ({ ...prev, farmId: selectedFarmId }));
        if (currencyResult.status === 'fulfilled') {
          const rows = unwrapList<{ code: string; symbol?: string | null }>(currencyResult.value.data);
          if (rows.length) setCurrencyOptions(rows.map((currency) => ({
            id: currency.code,
            label: `${currency.code}${currency.symbol ? ` ${currency.symbol}` : ''}`,
          })));
        } else {
          showError(describeApiError(currencyResult.reason, 'Could not load currencies; USD remains available.'));
        }
        if (budgetResult.status === 'fulfilled') {
          const rows = unwrapList<any>(budgetResult.value.data);
          setBudgetOptions(rows.flatMap((budget) => (budget.categories || []).map((category: any) => ({
            id: category.id,
            label: `${budget.name} · ${category.name}`,
          }))));
        } else {
          showError(describeApiError(budgetResult.reason, 'Could not load budget categories.'));
        }
      } catch (error) {
        showError(describeApiError(error, 'Could not load farms.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadOptions();
    return () => { active = false; };
  }, []);

  const farmOptions = useMemo(() => farms.map(({ id, name }) => ({ id, label: name })), [farms]);
  const update = (field: keyof FormValues, value: string) => setForm((prev) => ({ ...prev, [field]: value }));
  const total = (Number(form.quantity) || 0) * (Number(form.price) || 0);

  const submit = async () => {
    if (!form.farmId) {
      showError('Select a farm before saving this transaction.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) || Number.isNaN(Date.parse(form.date))) {
      showError('Enter a valid date in YYYY-MM-DD format.');
      return;
    }
    if (type === 'expense') {
      if (form.title.trim().length < 2 || !Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) {
        showError('Enter an expense title and an amount greater than zero.');
        return;
      }
    } else if (form.item.trim().length < 2 || !Number.isFinite(Number(form.quantity)) || Number(form.quantity) <= 0 || !Number.isFinite(Number(form.price)) || Number(form.price) < 0) {
      showError('Enter an item, a positive quantity, and a valid unit price.');
      return;
    }

    setSaving(true);
    try {
      if (type === 'expense') {
        await financeAPI.createExpense({
          farmId: form.farmId,
          title: form.title.trim(),
          amount: Number(form.amount),
          currency: form.currency || 'USD',
          date: form.date,
          budgetCategoryId: form.budgetCategoryId || undefined,
        });
      } else {
        await financeAPI.createSale({
          farmId: form.farmId,
          item: form.item.trim(),
          quantity: Number(form.quantity),
          price: Number(form.price),
          total,
          date: form.date,
          currency: form.currency || 'USD',
        });
      }
      success(type === 'expense' ? 'Expense added successfully' : 'Sale recorded successfully');
      router.replace('/finance/list');
    } catch (error) {
      showError(describeApiError(error, 'Failed to create transaction.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ScreenLoading message="Loading transaction form…" />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back to transactions">
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Transaction</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={[styles.card, { backgroundColor: tc.card }]}>
          <SelectField label="Transaction type" value={type} options={typeOptions} onSelect={(value) => setType(value as TransactionType)} />
          <SelectField label="Farm *" placeholder="Select a farm" value={form.farmId} options={farmOptions} onSelect={(value) => update('farmId', value)} />
          {type === 'expense' ? (
            <>
              <TextInputField label="Title *" placeholder="e.g. Fertilizer purchase" value={form.title} onChangeText={(value) => update('title', value)} />
              <TextInputField label="Amount *" placeholder="0.00" keyboardType="numeric" value={form.amount} onChangeText={(value) => update('amount', value)} />
              <SelectField label="Budget category" placeholder="No category" value={form.budgetCategoryId} options={budgetOptions} onSelect={(value) => update('budgetCategoryId', value)} />
            </>
          ) : (
            <>
              <TextInputField label="Item *" placeholder="e.g. Fresh tomatoes" value={form.item} onChangeText={(value) => update('item', value)} />
              <TextInputField label="Quantity *" placeholder="0" keyboardType="numeric" value={form.quantity} onChangeText={(value) => update('quantity', value)} />
              <TextInputField label="Unit price *" placeholder="0.00" keyboardType="numeric" value={form.price} onChangeText={(value) => update('price', value)} />
              <Text style={[styles.total, { color: tc.text }]}>Total: {total.toFixed(2)}</Text>
            </>
          )}
          <SelectField label="Currency" value={form.currency} options={currencyOptions} onSelect={(value) => update('currency', value)} />
          <TextInputField label="Date *" placeholder="YYYY-MM-DD" value={form.date} onChangeText={(value) => update('date', value)} />
          <View style={styles.actions}>
            <Button title="Cancel" variant="secondary" style={styles.actionButton} onPress={() => router.back()} />
            <Button title={type === 'expense' ? 'Save Expense' : 'Record Sale'} style={styles.actionButton} loading={saving} onPress={submit} />
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
  total: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1 },
});
