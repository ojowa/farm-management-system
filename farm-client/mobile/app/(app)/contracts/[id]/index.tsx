import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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
  createdAt: string;
  updatedAt: string;
};

export default function ContractDetailPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors: themeColors } = useAppTheme();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await contractsAPI.get(id as string);
      const data = Array.isArray(response.data) ? response.data[0] : response.data;
      setContract(data);
    } catch (e: any) {
      setError(describeApiError(e, 'Could not load contract.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading) return <ScreenLoading message="Loading contract…" />;
  if (error || !contract) return <StateView variant="error" title="Contract not found" message={error || 'Contract not found.'} onRetry={load} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{contract.title}</Text>
          <Text style={styles.subtitle}>{contract.type}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <View style={styles.cardCopy}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>Contract Details</Text>
            <View style={styles.row}>
              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Type</Text>
              <Text style={[styles.fieldValue, { color: themeColors.text }]}>{contract.type}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Status</Text>
              <Text style={[styles.statusBadge, { color: themeColors.text }]}>{contract.status}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Start Date</Text>
              <Text style={[styles.fieldValue, { color: themeColors.text }]}>{contract.startDate ? new Date(contract.startDate).toLocaleDateString() : '—'}</Text>
            </View>
            {contract.endDate && (
              <View style={styles.row}>
                <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>End Date</Text>
                <Text style={[styles.fieldValue, { color: themeColors.text }]}>{new Date(contract.endDate).toLocaleDateString()}</Text>
              </View>
            )}
            {contract.value != null && (
              <View style={styles.row}>
                <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Value</Text>
                <Text style={[styles.fieldValue, { color: themeColors.text, fontWeight: '700' }]}>{formatCurrency(contract.value)}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => router.push(`/contracts/${contract.id}/edit`)} style={[styles.editBtn, { backgroundColor: themeColors.primary }]} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Edit contract">
            <Text style={[styles.editBtnText, { color: '#FFFFFF' }]}>Edit Contract</Text>
          </TouchableOpacity>
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
  cardCopy: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  fieldLabel: { fontSize: 13 },
  fieldValue: { fontSize: 15, fontWeight: '600' },
  statusBadge: { fontSize: 15, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  editBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  editBtnText: { fontSize: 15, fontWeight: '700' },
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}
