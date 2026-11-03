import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { contractsAPI } from '@/modules/finance';
import { Button } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';

type Contract = {
  id: string;
  title: string;
  type: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  value?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function ContractEditPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors: themeColors } = useAppTheme();
  const [contract, setContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    status: 'DRAFT',
    startDate: '',
    endDate: '',
    value: '',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await contractsAPI.get(id as string);
      const data = Array.isArray(response.data) ? response.data[0] : response.data;
      setContract(data);
      setFormData({
        title: data.title,
        type: data.type,
        status: data.status,
        startDate: data.startDate,
        endDate: data.endDate || '',
        value: (data.value || 0).toString(),
        notes: data.notes || '',
      });
    } catch (e: any) {
      setError(describeApiError(e, 'Could not load contract.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.type || !formData.startDate) return;
    setSaving(true);
    try {
      await contractsAPI.update(id as string, {
        title: formData.title.trim(),
        type: formData.type,
        status: formData.status,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        value: Number(formData.value) || undefined,
        notes: formData.notes.trim() || null,
      });
      router.push(`/contracts/${id}`);
    } catch (e: any) {
      setError(describeApiError(e, 'Failed to update contract.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this contract?')) return;
    try {
      await contractsAPI.delete(id as string);
      router.push('/contracts');
    } catch (e: any) {
      setError(describeApiError(e, 'Failed to delete contract.'));
    }
  };

  if (loading) return <ScreenLoading message="Loading contract…" />;
  if (error || !contract) return <StateView variant="error" title="Contract not found" message={error || 'Contract not found.'} onRetry={load} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Edit Contract</Text>
          <Text style={styles.subtitle}>Edit contract details</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>Contract Details</Text>
            <View style={[styles.inputGroup, { marginTop: 12 }]}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Title</Text>
              <TextInput
                style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                value={formData.title}
                onChangeText={(v) => setFormData({ ...formData, title: v })}
                placeholder="e.g. Supply Contract"
              />
            </View>
            <View style={[styles.inputGroup, { marginTop: 12 }]}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Type</Text>
              <TextInput
                style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                value={formData.type}
                onChangeText={(v) => setFormData({ ...formData, type: v })}
                placeholder="e.g. Buy"
              />
            </View>
            <View style={[styles.inputGroup, { marginTop: 12 }]}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Status</Text>
              <TextInput
                style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                value={formData.status}
                onChangeText={(v) => setFormData({ ...formData, status: v })}
                placeholder="e.g. DRAFT"
              />
            </View>
            <View style={[styles.inputGroup, { marginTop: 12 }]}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Start Date</Text>
              <TextInput
                style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                keyboardType="numeric"
                value={formData.startDate}
                onChangeText={(v) => setFormData({ ...formData, startDate: v })}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={[styles.inputGroup, { marginTop: 12 }]}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>End Date</Text>
              <TextInput
                style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                keyboardType="numeric"
                value={formData.endDate}
                onChangeText={(v) => setFormData({ ...formData, endDate: v })}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={[styles.inputGroup, { marginTop: 12 }]}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Value</Text>
              <TextInput
                style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                keyboardType="numeric"
                value={formData.value}
                onChangeText={(v) => setFormData({ ...formData, value: v })}
                placeholder="0.00"
              />
            </View>
            <View style={[styles.inputGroup, { marginTop: 12 }]}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Notes</Text>
              <TextInput
                style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                value={formData.notes}
                onChangeText={(v) => setFormData({ ...formData, notes: v })}
                placeholder="Optional notes"
              />
            </View>
            <View style={[styles.actions, { backgroundColor: themeColors.card }]}>
              <TouchableOpacity onPress={() => router.back()} style={[styles.cancelBtn, { backgroundColor: themeColors.border }]} activeOpacity={0.7}>
                <Text style={[styles.cancelText, { color: themeColors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: themeColors.primary }]} activeOpacity={0.7} disabled={saving}>
                <Text style={[styles.saveText, { color: '#FFFFFF' }]}>{saving ? 'Saving…' : 'Save Contract'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 },
  headerCopy: { flex: 1 },
  backText: { color: '#FFFFFF', fontSize: 24 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 3 },
  content: { padding: 16, paddingBottom: 30, gap: 12 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, elevation: 2, shadowColor: '#000000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  cancelText: { fontSize: 15, fontWeight: '600' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  saveText: { fontSize: 15, fontWeight: '700' },
});
