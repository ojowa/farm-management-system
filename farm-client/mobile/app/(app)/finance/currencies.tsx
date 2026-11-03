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
import { currencyAPI } from '@/modules/finance';
import { Button } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';

type Currency = {
  code: string;
  name: string;
  symbol: string | null;
  updatedAt: string;
};

export default function CurrenciesScreen() {
  const router = useRouter();
  const { colors: themeColors } = useAppTheme();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', symbol: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await currencyAPI.list();
      setCurrencies(response.data || []);
    } catch (e: any) {
      setError(describeApiError(e, 'Could not load currencies.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.name.trim()) return;
    setSaving(true);
    try {
      if (editingCode) {
        await currencyAPI.update(editingCode, { name: formData.name.trim(), symbol: formData.symbol.trim() || null });
      } else {
        await currencyAPI.create({ code: formData.code.trim().toUpperCase(), name: formData.name.trim(), symbol: formData.symbol.trim() || null });
      }
      setShowForm(false);
      setEditingCode(null);
      setFormData({ code: '', name: '', symbol: '' });
      load();
    } catch (e: any) {
      setError(describeApiError(e, 'Failed to save currency.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!window.confirm(`Delete currency ${code}?`)) return;
    try {
      await currencyAPI.delete(code);
      load();
    } catch (e: any) {
      setError(describeApiError(e, 'Failed to delete currency.'));
    }
  };

  if (loading) return <ScreenLoading message="Loading currencies…" />;
  if (error && currencies.length === 0)
    return <StateView variant="error" title="Couldn't load currencies" message={error} onRetry={load} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}>
        <MenuButton />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Currencies</Text>
          <Text style={styles.subtitle}>Manage currency registry</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <View style={styles.cardCopy}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>Currency Registry</Text>
            <Text style={[styles.description, { color: themeColors.textSecondary }]}>Manage organization currency codes</Text>
          </View>
          <TouchableOpacity style={[styles.cardAction]} onPress={() => setShowForm(true)} accessibilityRole="button" accessibilityLabel="Add currency">
            <Text style={[styles.cardTitle, { color: themeColors.primary, fontWeight: '700' }]}>+ Add Currency</Text>
          </TouchableOpacity>
        </View>
        {currencies.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyIcon]}>💱</Text>
            <Text style={[styles.emptyText, { color: themeColors.text }]}>No currencies yet</Text>
            <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>Add your first currency</Text>
            <Button title="Add Currency" onPress={() => setShowForm(true)} />
          </View>
        ) : (
          <FlatList
            data={currencies}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.row, { backgroundColor: themeColors.card }]}
                accessibilityRole="button"
                accessibilityLabel={`Currency ${item.code}`}
              >
                <View style={styles.rowContent}>
                  <View style={styles.codeBadge}><Text style={styles.codeText}>{item.code}</Text></View>
                  <Text style={[styles.rowTitle, { color: themeColors.text }]}>{item.name}</Text>
                  <Text style={[styles.rowSubtitle, { color: themeColors.textSecondary }]}>{item.symbol || '—'}</Text>
                </View>
                <TouchableOpacity style={[styles.deleteBtn]} onPress={() => handleDelete(item.code)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`Delete ${item.code}`}>
                  <Text style={[styles.deleteText, { color: themeColors.error }]}>🗑️</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.listContent}
          />
        )}
      </ScrollView>
      {/* Add / Edit Currency Dialog */}
      {showForm && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
          <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: themeColors.overlay }]} activeOpacity={1} onPress={() => setShowForm(false)}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: themeColors.text }]}>{editingCode ? 'Edit Currency' : 'Add Currency'}</Text>
                  <TouchableOpacity onPress={() => setShowForm(false)} activeOpacity={0.7}>
                    <Text style={[styles.closeText, { color: themeColors.textSecondary }]}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.modalBody}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Code</Text>
                    <TextInput
                      style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                      maxLength={3}
                      value={formData.code}
                      onChangeText={(v) => setFormData({ ...formData, code: v.toUpperCase() })}
                      placeholder="USD"
                      editable={!editingCode}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Name</Text>
                    <TextInput
                      style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                      value={formData.name}
                      onChangeText={(v) => setFormData({ ...formData, name: v })}
                      placeholder="e.g. United States Dollar"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Symbol</Text>
                    <TextInput
                      style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                      maxLength={5}
                      value={formData.symbol}
                      onChangeText={(v) => setFormData({ ...formData, symbol: v })}
                      placeholder="e.g. $"
                    />
                  </View>
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => setShowForm(false)} style={[styles.cancelBtn, { backgroundColor: themeColors.border }]} activeOpacity={0.7}>
                    <Text style={[styles.cancelText, { color: themeColors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: themeColors.primary }]} activeOpacity={0.7} disabled={saving}>
                    <Text style={[styles.saveText, { color: '#FFFFFF' }]}>{saving ? 'Saving…' : editingCode ? 'Save Currency' : 'Add Currency'}</Text>
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
  codeBadge: { backgroundColor: 'rgba(22, 163, 74, 0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  codeText: { fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowSubtitle: { fontSize: 13 },
  deleteBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  deleteText: { fontSize: 20 },
  separator: { height: StyleSheet.hairlineWidth },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '55%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
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
