import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { budgetsAPI } from '@/modules/finance';
import { unwrapList } from '@/core/utils/listPayload';
import { Button, Card, colors } from '@/core/ui/UIComponents';
import { MenuButton } from '@/core/ui/MenuButton';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';

type Budget = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  categories?: Array<{ id: string; name: string; budgetAmount: number; spentAmount: number }>;
};

export default function BudgetsScreen() {
  const router = useRouter();
  const { colors: themeColors } = useAppTheme();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [activeBudget, setActiveBudget] = useState<Budget | null>(null);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryAmount, setCategoryAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await budgetsAPI.list();
      setBudgets(unwrapList<Budget>(response.data));
    } catch (loadError) {
      setError(describeApiError(loadError, 'Could not load budgets.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const createBudget = async () => {
    if (!name.trim() || !startDate || !endDate || Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate))) {
      Alert.alert('Required information', 'Enter a name and valid start and end dates (YYYY-MM-DD).');
      return;
    }
    if (Date.parse(endDate) < Date.parse(startDate)) {
      Alert.alert('Invalid date range', 'The end date must be on or after the start date.');
      return;
    }
    setSaving(true);
    try {
      await budgetsAPI.create({ name: name.trim(), startDate, endDate });
      setShowBudgetForm(false);
      setName('');
      setStartDate('');
      setEndDate('');
      await load();
    } catch (createError) {
      Alert.alert('Could not create budget', describeApiError(createError));
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async () => {
    const amount = Number(categoryAmount);
    if (!activeBudget || !categoryName.trim() || !Number.isFinite(amount) || amount < 0) {
      Alert.alert('Invalid category', 'Enter a category name and a non-negative budget amount.');
      return;
    }
    setSaving(true);
    try {
      await budgetsAPI.addCategory(activeBudget.id, { name: categoryName.trim(), budgetAmount: amount });
      setShowCategoryForm(false);
      setCategoryName('');
      setCategoryAmount('');
      await load();
    } catch (createError) {
      Alert.alert('Could not add category', describeApiError(createError));
    } finally {
      setSaving(false);
    }
  };

  const refreshBudget = async (budget: Budget) => {
    try {
      await budgetsAPI.refresh(budget.id);
      await load();
      Alert.alert('Budget refreshed', 'Actual spending has been recalculated from recorded expenses.');
    } catch (refreshError) {
      Alert.alert('Could not refresh budget', describeApiError(refreshError));
    }
  };

  if (loading) {
    return <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}><Header onBack={() => router.back()} /><ScreenLoading message="Loading budgets…" /></SafeAreaView>;
  }
  if (error) {
    return <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}><Header onBack={() => router.back()} /><StateView variant="error" title="Couldn't load budgets" message={error} onRetry={() => void load()} retryLabel="Retry" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Header onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
      >
        <Button title="Create budget" onPress={() => setShowBudgetForm(true)} />
        {budgets.length === 0 ? (
          <Text style={[styles.empty, { color: themeColors.textSecondary }]}>No budgets yet.</Text>
        ) : budgets.map((budget) => (
          <Card key={budget.id} style={[styles.card, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.budgetName, { color: themeColors.text }]}>{budget.name}</Text>
            <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
              {new Date(budget.startDate).toLocaleDateString()} – {new Date(budget.endDate).toLocaleDateString()}
            </Text>
            {(budget.categories || []).map((category) => (
              <View key={category.id} style={styles.category}>
                <Text style={[styles.meta, { color: themeColors.text }]}>{category.name}</Text>
                <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
                  {category.spentAmount || 0} / {category.budgetAmount}
                </Text>
              </View>
            ))}
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => { setActiveBudget(budget); setShowCategoryForm(true); }}>
                <Text style={styles.action}>Add category</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void refreshBudget(budget)}>
                <Text style={styles.action}>Refresh actuals</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}
      </ScrollView>
      <FormModal
        visible={showBudgetForm}
        title="Create budget"
        onClose={() => setShowBudgetForm(false)}
      >
        <TextInput value={name} onChangeText={setName} placeholder="Budget name" style={styles.input} />
        <TextInput value={startDate} onChangeText={setStartDate} placeholder="Start date (YYYY-MM-DD)" style={styles.input} />
        <TextInput value={endDate} onChangeText={setEndDate} placeholder="End date (YYYY-MM-DD)" style={styles.input} />
        <Button title="Save budget" onPress={createBudget} loading={saving} disabled={saving} />
      </FormModal>
      <FormModal
        visible={showCategoryForm}
        title="Add budget category"
        onClose={() => setShowCategoryForm(false)}
      >
        <TextInput value={categoryName} onChangeText={setCategoryName} placeholder="Category name" style={styles.input} />
        <TextInput value={categoryAmount} onChangeText={setCategoryAmount} placeholder="Budget amount" keyboardType="decimal-pad" style={styles.input} />
        <Button title="Add category" onPress={addCategory} loading={saving} disabled={saving} />
      </FormModal>
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  const { colors: themeColors } = useAppTheme();
  return <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}><TouchableOpacity onPress={onBack}><Text style={styles.back}>‹</Text></TouchableOpacity><MenuButton /><Text style={styles.title}>Budgets</Text></View>;
}

function FormModal({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const { colors: themeColors } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modal, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.modalTitle, { color: themeColors.text }]}>{title}</Text>
          {children}
          <Button title="Cancel" onPress={onClose} variant="secondary" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  back: { color: '#FFFFFF', fontSize: 32 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  content: { padding: 16, gap: 12 },
  card: { padding: 16 },
  budgetName: { fontSize: 17, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 6 },
  category: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  action: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  empty: { textAlign: 'center', padding: 32 },
  modalBackdrop: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 18 },
  modal: { borderRadius: 14, padding: 18, gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text },
});
