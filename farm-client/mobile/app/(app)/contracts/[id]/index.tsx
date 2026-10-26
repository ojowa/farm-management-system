import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { contractsAPI } from '@/modules/finance';
import { Button, colors } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { RecordTasksCard } from '@/modules/worker/RecordTasksCard';
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
  card: { marginBottom: 16 },
  partyName: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  badge: { backgroundColor: colors.light, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  valueText: { fontSize: 24, fontWeight: '700', color: colors.primary, marginTop: 4 },
  detailSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.light },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  detailValue: { fontSize: 14, color: colors.text, flexShrink: 1, textAlign: 'right' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  termsText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  actions: { marginTop: 20, gap: 12 },
});

interface ContractRecord {
  id: string;
  title?: string;
  buyerSellerName?: string;
  type: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  value?: number | null;
  terms?: string | null;
}

const partyOf = (c: ContractRecord) => c.buyerSellerName || c.title || 'Unnamed contract';

function unwrapOne<T>(payload: any): T | null {
  if (payload?.id) return payload as T;
  if (payload?.data?.id) return payload.data as T;
  return null;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export default function ContractDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const { hasPermission } = usePermission();
  const { colors: tc, isDark } = useAppTheme();

  const canDelete = hasPermission('finance.delete');

  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<ContractRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const dynamicStyles = {
    container: { backgroundColor: tc.background },
    cardSurface: {
      backgroundColor: tc.card,
      borderColor: isDark ? tc.border : 'transparent',
      borderWidth: isDark ? 1 : 0,
    },
    partyName: { color: tc.text },
    badge: { backgroundColor: isDark ? tc.surface : '#F5F5F5' },
    divider: { borderTopColor: isDark ? tc.border : '#F5F5F5' },
    detailLabel: { color: tc.text },
    detailValue: { color: tc.text },
    sectionTitle: { color: tc.textSecondary },
    termsText: { color: tc.text },
  };

  useEffect(() => {
    loadContract();
  }, [id]);

  const loadContract = async () => {
    if (!id) {
      setLoadError('Missing contract id.');
      setLoading(false);
      return;
    }
    try {
      setLoadError(null);
      const response = await contractsAPI.get(id);
      const record = unwrapOne<ContractRecord>(response.data);
      if (!record) {
        setLoadError('Contract not found.');
        return;
      }
      setContract(record);
    } catch (error: any) {
      setLoadError(describeApiError(error, "Couldn't load this contract."));
    } finally {
      setLoading(false);
    }
  };

  const removeContract = useCallback(() => {
    if (!contract) return;
    Alert.alert(
      'Delete Contract',
      `Delete the contract with "${partyOf(contract)}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await contractsAPI.delete(contract.id);
              success('Contract deleted');
              router.back();
            } catch (error: any) {
              showError(describeApiError(error, 'Failed to delete contract.'));
            }
          },
        },
      ]
    );
  }, [contract, success, showError, router]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contract</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScreenLoading message="Loading contract…" />
      </SafeAreaView>
    );
  }

  if (loadError || !contract) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contract</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load this contract"
          message={loadError || 'Contract not found.'}
          onRetry={loadContract}
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
        <Text style={styles.headerTitle}>Contract</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, dynamicStyles.cardSurface]}>
          <Text style={[styles.partyName, dynamicStyles.partyName]}>{partyOf(contract)}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, dynamicStyles.badge]}>
              <Text style={styles.badgeText}>{contract.type || '—'}</Text>
            </View>
            {!!contract.status && (
              <View style={[styles.badge, dynamicStyles.badge]}>
                <Text style={styles.badgeText}>{contract.status}</Text>
              </View>
            )}
          </View>
          {contract.value != null && (
            <Text style={styles.valueText}>{Number(contract.value).toLocaleString()}</Text>
          )}

          <View style={[styles.detailSection, dynamicStyles.divider]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>Start Date</Text>
              <Text style={[styles.detailValue, dynamicStyles.detailValue]}>{formatDate(contract.startDate)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>End Date</Text>
              <Text style={[styles.detailValue, dynamicStyles.detailValue]}>{formatDate(contract.endDate)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>Type</Text>
              <Text style={[styles.detailValue, dynamicStyles.detailValue]}>{contract.type || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>Status</Text>
              <Text style={[styles.detailValue, dynamicStyles.detailValue]}>{contract.status || '—'}</Text>
            </View>
          </View>

          {!!contract.terms && (
            <>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Terms</Text>
              <Text style={[styles.termsText, dynamicStyles.termsText]}>{contract.terms}</Text>
            </>
          )}
        </View>

        <RecordTasksCard moduleKey="contract" recordId={contract.id} recordName={partyOf(contract)} />

        {canDelete && (
          <View style={styles.actions}>
            <Button
              title="Delete Contract"
              variant="secondary"
              onPress={removeContract}
              accessibilityLabel="Delete this contract"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
