import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { financeAPI } from '../../../../src/services/api';
import { Card, Button, colors } from '../../../../src/components/common/UIComponents';
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
  card: { marginBottom: 16 },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconCircleIncome: { backgroundColor: '#E8F5E9' },
  iconCircleExpense: { backgroundColor: '#FFEBEE' },
  iconText: { fontSize: 28 },
  titleContainer: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 },
  category: { fontSize: 14, color: colors.textLight },
  amountContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  amountLabel: { fontSize: 12, color: colors.textLight, marginBottom: 4 },
  amountValue: { fontSize: 28, fontWeight: '700' },
  amountPositive: { color: colors.success },
  amountNegative: { color: colors.error },
  detailsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.light,
    paddingTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  detailLabel: { fontSize: 14, color: colors.textLight },
  detailValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  typeBadgeIncome: { backgroundColor: '#E8F5E9' },
  typeBadgeExpense: { backgroundColor: '#FFEBEE' },
  typeBadgeText: { fontSize: 12, fontWeight: '600' },
  typeBadgeTextIncome: { color: colors.success },
  typeBadgeTextExpense: { color: colors.error },
  descriptionSection: {
    borderTopWidth: 1,
    borderTopColor: colors.light,
    paddingTop: 16,
    marginTop: 8,
  },
  descriptionLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  descriptionText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: { flex: 1 },
  deleteButtonAction: { flex: 1, backgroundColor: colors.error },
});

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

export default function TransactionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<TransactionData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransaction();
  }, [id]);

  const fetchTransaction = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setLoadError(null);
      const response = await financeAPI.get(id);
      setTransaction(response.data.data || response.data);
    } catch (error: any) {
      const message = describeApiError(error, 'Failed to load transaction.');
      setLoadError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!transaction) return;
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete "${transaction.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!transaction) return;
    try {
      await financeAPI.delete(transaction.id);
      success('Transaction deleted successfully');
      router.back();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to delete transaction.'));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transaction Details</Text>
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
          <Text style={styles.headerTitle}>Transaction Details</Text>
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

  const isIncome = transaction.type === 'income';
  const absAmount = Math.abs(transaction.amount);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <View style={styles.iconRow}>
            <View
              style={[
                styles.iconCircle,
                isIncome ? styles.iconCircleIncome : styles.iconCircleExpense,
              ]}
            >
              <Text style={styles.iconText}>{transaction.icon}</Text>
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{transaction.title}</Text>
              <Text style={styles.category}>{transaction.category}</Text>
            </View>
          </View>

          <View style={[styles.typeBadge, isIncome ? styles.typeBadgeIncome : styles.typeBadgeExpense]}>
            <Text
              style={[
                styles.typeBadgeText,
                isIncome ? styles.typeBadgeTextIncome : styles.typeBadgeTextExpense,
              ]}
            >
              {isIncome ? 'Income' : 'Expense'}
            </Text>
          </View>

          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text
              style={[
                styles.amountValue,
                isIncome ? styles.amountPositive : styles.amountNegative,
              ]}
            >
              {isIncome ? '+' : '-'}${absAmount.toFixed(2)}
            </Text>
          </View>

          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{transaction.date}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>{isIncome ? 'Income' : 'Expense'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{transaction.category}</Text>
            </View>
          </View>

          {transaction.description ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.descriptionText}>{transaction.description}</Text>
            </View>
          ) : null}
        </Card>

        <View style={styles.actionsContainer}>
          <Button
            title="Edit"
            onPress={() => router.push(`/finance/${transaction.id}/edit`)}
            style={styles.actionButton}
          />
          <Button
            title="Delete"
            onPress={handleDelete}
            style={styles.deleteButtonAction}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}