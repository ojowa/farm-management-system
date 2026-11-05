import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
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
import { MenuButton } from '@/core/ui/MenuButton';
import { financeAPI } from '@/modules/finance';
import { Button } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { describeApiError } from '@/core/utils/apiError';
import { formatCurrencyWithCode } from '@/core/utils/currency';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { useAppSelector } from '@/modules/auth/hooks/useAuth';

type Salary = {
  id: string;
  workerName: string;
  amount: number;
  currency: string;
  amountInBase: number;
  date: string;
  payType: string;
  period: string;
  createdAt: string;
};

const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function SalaryScreen() {
  const router = useRouter();
  const { colors: themeColors } = useAppTheme();
  const selectedFarmId = useAppSelector((state) => state.ui.selectedFarmId);
  const currency = useAppSelector((state) => state.auth.currency || '');
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ workerName: '', amount: '', currency, payType: 'Monthly', period: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await financeAPI.listExpenses();
      const rows = Array.isArray(response.data) ? response.data : [];
      const salaryRows = rows.filter((r: any) => r.title?.toLowerCase().includes('salary'));
      const mapped: Salary[] = salaryRows.map((r: any) => ({
        id: r.id,
        workerName: r.title,
        amount: r.amount,
        currency: r.currency || currency,
        amountInBase: r.amountInBase || r.amount,
        date: r.date,
        payType: r.payType || 'Monthly',
        period: r.period || '',
        createdAt: r.createdAt,
      }));
      setSalaries(mapped);
    } catch (e: any) {
      setError(describeApiError(e, 'Could not load salaries.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!formData.workerName || !formData.amount || !formData.period) return;
    if (!selectedFarmId) {
      setError('Select a farm before recording a salary payment.');
      return;
    }
    setSaving(true);
    try {
      await financeAPI.createExpense({
        farmId: selectedFarmId,
        title: formData.workerName,
        amount: Number(formData.amount),
        currency: formData.currency || currency,
        date: new Date().toISOString().slice(0, 10),
      });
      setShowForm(false);
      setFormData({ workerName: '', amount: '', currency, payType: 'Monthly', period: '' });
      load();
    } catch (e: any) {
      setError(describeApiError(e, 'Failed to record salary.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this salary record?')) return;
    try {
      await financeAPI.deleteExpense(id);
      load();
    } catch (e: any) {
      setError(describeApiError(e, 'Failed to delete salary.'));
    }
  };

  if (loading) return <ScreenLoading message="Loading salaries…" />;
  if (error && salaries.length === 0)
    return <StateView variant="error" title="Couldn't load salaries" message={error} onRetry={load} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}>
        <MenuButton />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Salary</Text>
          <Text style={styles.subtitle}>Salary payments to workers</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <View style={styles.cardCopy}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>Salary Payments</Text>
            <Text style={[styles.description, { color: themeColors.textSecondary }]}>Record and review salary payments to workers</Text>
          </View>
          <TouchableOpacity style={[styles.cardAction]} onPress={() => setShowForm(true)} accessibilityRole="button" accessibilityLabel="Add salary">
            <Text style={[styles.cardTitle, { color: themeColors.primary, fontWeight: '700' }]}>+ Record Salary</Text>
          </TouchableOpacity>
        </View>
        {salaries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyIcon]}>💵</Text>
            <Text style={[styles.emptyText, { color: themeColors.text }]}>No salary records</Text>
            <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>Record your first salary payment</Text>
            <Button title="Record Salary" onPress={() => setShowForm(true)} />
          </View>
        ) : (
          <FlatList
            data={salaries}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.row, { backgroundColor: themeColors.card }]}
                accessibilityRole="button"
                accessibilityLabel={`Salary ${item.workerName}`}
              >
                <View style={styles.rowContent}>
                  <View style={styles.rowInfo}>
                    <Text style={[styles.rowTitle, { color: themeColors.text }]}>{item.workerName}</Text>
                    <Text style={[styles.rowSubtitle, { color: themeColors.textSecondary }]}>{item.period || 'No period'} • {item.payType || 'Monthly'}</Text>
                  </View>
                  <View style={styles.rowAmount}>
                    <Text style={[styles.rowAmountText, { color: themeColors.success }]}>{formatCurrencyWithCode(item.amount, item.currency)}</Text>
                    <Text style={[styles.rowDate, { color: themeColors.textSecondary }]}>{item.date ? new Date(item.date).toLocaleDateString() : ''}</Text>
                  </View>
                </View>
                <TouchableOpacity style={[styles.deleteBtn]} onPress={() => handleDelete(item.id)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`Delete ${item.workerName}`}>
                  <Text style={[styles.deleteText, { color: themeColors.error }]}>🗑️</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.listContent}
          />
        )}
      </ScrollView>
      {/* Add Salary Dialog */}
      {showForm && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
          <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: themeColors.overlay }]} activeOpacity={1} onPress={() => setShowForm(false)}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: themeColors.text }]}>Record Salary</Text>
                  <TouchableOpacity onPress={() => setShowForm(false)} activeOpacity={0.7}>
                    <Text style={[styles.closeText, { color: themeColors.textSecondary }]}>✕</Text>
                  </TouchableOpacity>
                </View>
                {error && <Text style={[styles.errorText, { color: themeColors.error }]}>{error}</Text>}
                <View style={styles.modalBody}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Worker Name</Text>
                    <TextInput
                      style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                      value={formData.workerName}
                      onChangeText={(e) => setFormData({ ...formData, workerName: e })}
                      placeholder="e.g. John Doe"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Amount</Text>
                    <TextInput
                      style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                      keyboardType="numeric"
                      value={formData.amount}
                      onChangeText={(v) => setFormData({ ...formData, amount: v })}
                      placeholder="0.00"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Currency</Text>
                    <TextInput
                      style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                      value={formData.currency}
                      onChangeText={(v) => setFormData({ ...formData, currency: v })}
                      placeholder="e.g. USD"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Period</Text>
                    <TextInput
                      style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                      value={formData.period}
                      onChangeText={(v) => setFormData({ ...formData, period: v })}
                      placeholder="e.g. November 2026"
                    />
                  </View>
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => setShowForm(false)} style={[styles.cancelBtn, { backgroundColor: themeColors.border }]} activeOpacity={0.7}>
                    <Text style={[styles.cancelText, { color: themeColors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: themeColors.primary }]} activeOpacity={0.7} disabled={saving}>
                    <Text style={[styles.saveText, { color: '#FFFFFF' }]}>{saving ? 'Saving…' : 'Record Salary'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 },
  headerCopy: { flex: 1 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#FFFFFF', fontSize: 13, marginTop: 3, opacity: 0.85 },
  content: { padding: 16, paddingBottom: 30, gap: 12 },
  card: { minHeight: 82, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 2, shadowColor: '#000000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardCopy: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  description: { fontSize: 13 },
  cardAction: { marginTop: 4, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'rgba(22, 163, 74, 0.1)', borderRadius: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40, minHeight: 300 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptySubtext: { fontSize: 14, marginBottom: 20, textAlign: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 },
  rowContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowSubtitle: { fontSize: 13 },
  rowAmount: { alignItems: 'flex-end' },
  rowAmountText: { fontSize: 15, fontWeight: '700' },
  rowDate: { fontSize: 12 },
  deleteBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  deleteText: { fontSize: 20 },
  separator: { height: StyleSheet.hairlineWidth },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '55%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  errorText: { fontSize: 13, marginBottom: 12 },
  closeText: { fontSize: 22 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  modalBody: { paddingHorizontal: 4 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  cancelText: { fontSize: 15, fontWeight: '600' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  saveText: { fontSize: 15, fontWeight: '700' },
});
