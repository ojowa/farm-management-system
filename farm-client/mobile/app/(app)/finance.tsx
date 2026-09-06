import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { offlineFinanceAPI } from '@/services/offlineApi';
import { Card, Button, colors } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { useAppDispatch, useAppSelector } from '@/modules/auth/hooks/useAuth';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
import { transformExpense, transformSale, RawExpense, RawSale } from '@/core/utils/entityTransformers';
import { setFinanceFilter } from '@/store/slices/uiSlice';
import { formatCurrencyFixed } from '@/core/utils/currency';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 20 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 16 },
  summaryContainer: { flexDirection: 'row', gap: 12 },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 8,
  },
  summaryLabel: { fontSize: 11, color: 'rgba(255, 255, 255, 0.8)', marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  filterArea: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  filterRow: { flexDirection: 'row', marginBottom: 8, gap: 8, flexWrap: 'wrap' },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterButtonText: { fontSize: 12, color: colors.textLight },
  filterButtonTextActive: { color: '#FFFFFF' },
  categoryFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  categoryFilterActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  categoryFilterText: { fontSize: 12, color: colors.textLight },
  categoryFilterTextActive: { color: '#FFFFFF' },
  dateFilterContainer: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dateInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.text,
  },
  dateInputFocused: { borderColor: colors.primary },
  clearFilter: { paddingHorizontal: 8, paddingVertical: 6 },
  clearFilterText: { fontSize: 12, color: colors.error, fontWeight: '600' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  transactionCard: { marginBottom: 12 },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: { flex: 1 },
  transactionTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
  transactionDescription: { fontSize: 12, color: colors.textLight },
  transactionIcon: { fontSize: 20, marginRight: 12 },
  transactionAmount: { alignItems: 'flex-end' },
  transactionAmountText: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  transactionAmountPositive: { color: colors.success },
  transactionAmountNegative: { color: colors.error },
  transactionDate: { fontSize: 11, color: colors.textLight },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    minHeight: 300,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: colors.textLight, marginBottom: 20, textAlign: 'center' },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  footerText: { fontSize: 12, color: colors.textLight },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '50%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16, textAlign: 'center' },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  modalItemText: { fontSize: 16, color: colors.text },
  modalItemActive: { color: colors.primary, fontWeight: '600' },
  modalCloseButton: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  modalCloseText: { fontSize: 16, color: colors.primary, fontWeight: '600' },
  filterActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4, marginBottom: 8, gap: 12 },
  applyButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  applyButtonText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
});

interface Transaction {
  id: string;
  title: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  icon: string;
}

type TypeFilter = 'all' | 'income' | 'expense';

const ALL_CATEGORIES = [
  'Crops', 'Livestock', 'Poultry', 'Services', 'Other',
  'Seeds', 'Fertilizer', 'Feed', 'Veterinary', 'Equipment', 'Labor', 'Utilities',
];

const PAGE_SIZE = 20;

const keyExtractor = (item: Transaction) => item.id;

export default function FinanceScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const financeFilter = useAppSelector((s) => s.ui.filters.finance);
  const { error: showError } = useToasts();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [dateFromDraft, setDateFromDraft] = useState(financeFilter.dateFrom || '');
  const [dateToDraft, setDateToDraft] = useState(financeFilter.dateTo || '');

  const fetchTransactions = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        setLoadError(null);
        const params: any = { page: pageNum, limit: PAGE_SIZE };
        if (financeFilter.type !== 'all') params.type = financeFilter.type;
        if (financeFilter.category) params.category = financeFilter.category;
        if (financeFilter.dateFrom) params.dateFrom = financeFilter.dateFrom;
        if (financeFilter.dateTo) params.dateTo = financeFilter.dateTo;

        const response = await offlineFinanceAPI.list(params);
        const rawItems: any[] = response?.data || [];
        const items: Transaction[] = rawItems.map((item) =>
          item.item !== undefined || item.quantity !== undefined
            ? transformSale(item as RawSale)
            : transformExpense(item as RawExpense)
        );

        if (append) {
          setTransactions((prev) => [...prev, ...items]);
        } else {
          setTransactions(items);
        }

        setHasMore(items.length === PAGE_SIZE);
      } catch (error: any) {
        const message = describeApiError(error, 'Failed to load transactions.');
        setLoadError(message);
        if (!loading) showError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [loading, showError, financeFilter.type, financeFilter.category, financeFilter.dateFrom, financeFilter.dateTo]
  );

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchTransactions(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financeFilter.type, financeFilter.category, financeFilter.dateFrom, financeFilter.dateTo]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await fetchTransactions(1, false);
  }, [fetchTransactions]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTransactions(nextPage, true);
  }, [page, loadingMore, hasMore, loading, fetchTransactions]);

  const { totalIncome, totalExpense, netProfit } = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = Math.abs(
      transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)
    );

    const netProfit = totalIncome - totalExpense;

    return { totalIncome, totalExpense, netProfit };
  }, [transactions]);

  const activeFilterCount =
    (financeFilter.category ? 1 : 0) +
    (financeFilter.dateFrom ? 1 : 0) +
    (financeFilter.dateTo ? 1 : 0);

  const applyDateFilters = () => {
    dispatch(setFinanceFilter({
      dateFrom: dateFromDraft || null,
      dateTo: dateToDraft || null,
    }));
  };

  const clearAllFilters = () => {
    setDateFromDraft('');
    setDateToDraft('');
    dispatch(setFinanceFilter({ type: 'all', category: null, dateFrom: null, dateTo: null }));
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerText}>Loading more…</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💰</Text>
      <Text style={styles.emptyText}>No Transactions</Text>
      <Text style={styles.emptySubtext}>
        Start recording your farm income and expenses
      </Text>
      <Button title="Add Transaction" onPress={() => router.push('/finance/add')} />
    </View>
  );

  const renderItem = useCallback(({ item: transaction }: { item: Transaction }) => (
    <Card style={styles.transactionCard}>
      <TouchableOpacity onPress={() => router.push(`/finance/${transaction.id}`)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`${transaction.title}, ${transaction.type === 'income' ? 'income' : 'expense'} of ${formatCurrencyFixed(transaction.amount)}`}>
        <View style={styles.transactionRow}>
          <Text style={styles.transactionIcon}>{transaction.icon}</Text>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionTitle}>{transaction.title}</Text>
            <Text style={styles.transactionDescription}>{transaction.description}</Text>
          </View>
          <View style={styles.transactionAmount}>
            <Text
              style={[
                styles.transactionAmountText,
                transaction.type === 'income'
                  ? styles.transactionAmountPositive
                  : styles.transactionAmountNegative,
              ]}
            >
              {transaction.type === 'income' ? '+' : '-'}{formatCurrencyFixed(transaction.amount)}
            </Text>
            <Text style={styles.transactionDate}>{transaction.date}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  ), [router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Finance</Text>
        </View>
        <ScreenLoading message="Loading transactions…" />
      </SafeAreaView>
    );
  }

  if (loadError && transactions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Finance</Text>
        </View>
        <StateView
          variant="error"
          title="Couldn't load your transactions"
          message={loadError}
          onRetry={() => { setPage(1); fetchTransactions(1, false); }}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Finance</Text>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={styles.summaryValue}>+{formatCurrencyFixed(totalIncome)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Expense</Text>
            <Text style={styles.summaryValue}>-{formatCurrencyFixed(totalExpense)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Net Profit</Text>
            <Text style={styles.summaryValue}>{formatCurrencyFixed(netProfit)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.filterArea}>
        <View style={styles.filterRow}>
          {(['all', 'income', 'expense'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, financeFilter.type === f && styles.filterButtonActive]}
              onPress={() => dispatch(setFinanceFilter({ type: f }))}
              accessibilityRole="button"
              accessibilityLabel={f}
              accessibilityState={{ selected: financeFilter.type === f }}
            >
              <Text style={[styles.filterButtonText, financeFilter.type === f && styles.filterButtonTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.categoryFilterButton, financeFilter.category && styles.categoryFilterActive]}
            onPress={() => setShowCategoryModal(true)}
            accessibilityRole="button"
            accessibilityLabel={financeFilter.category ? `Category: ${financeFilter.category}` : 'Filter by category'}
          >
            <Text style={[styles.categoryFilterText, financeFilter.category && styles.categoryFilterTextActive]}>
              {financeFilter.category || 'Category'}
            </Text>
            <Text style={[styles.categoryFilterText, financeFilter.category && styles.categoryFilterTextActive]}>▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          <View style={styles.dateFilterContainer}>
            <TextInput
              style={[styles.dateInput, dateFromDraft ? styles.dateInputFocused : null]}
              placeholder="From YYYY-MM-DD"
              placeholderTextColor={colors.textLight}
              value={dateFromDraft}
              onChangeText={setDateFromDraft}
              accessibilityLabel="Start date"
            />
            <TextInput
              style={[styles.dateInput, dateToDraft ? styles.dateInputFocused : null]}
              placeholder="To YYYY-MM-DD"
              placeholderTextColor={colors.textLight}
              value={dateToDraft}
              onChangeText={setDateToDraft}
              accessibilityLabel="End date"
            />
          </View>
        </View>

        <View style={styles.filterActions}>
          {activeFilterCount > 0 && (
            <TouchableOpacity onPress={clearAllFilters} accessibilityRole="button" accessibilityLabel="Clear all filters">
              <Text style={styles.clearFilterText}>Clear all</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.applyButton} onPress={applyDateFilters} accessibilityRole="button" accessibilityLabel="Apply date filters">
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCategoryModal(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Filter by Category</Text>
              <ScrollView>
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    dispatch(setFinanceFilter({ category: null }));
                    setShowCategoryModal(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="All Categories"
                >
                  <Text style={[styles.modalItemText, !financeFilter.category && styles.modalItemActive]}>
                    All Categories
                  </Text>
                </TouchableOpacity>
                {ALL_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={styles.modalItem}
                    onPress={() => {
                      dispatch(setFinanceFilter({ category: cat }));
                      setShowCategoryModal(false);
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.modalItemText, financeFilter.category === cat && styles.modalItemActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowCategoryModal(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <FlatList
        data={transactions}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </SafeAreaView>
  );
}
