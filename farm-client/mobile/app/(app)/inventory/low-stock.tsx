import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, colors } from '../../../src/core/ui/UIComponents';
import { inventoryAPI } from '@/modules/inventory';
import { formatCurrencyFixed } from '../../../src/core/utils/currency';
import { unwrapList } from '@/core/utils/listPayload';
import { useAppTheme } from '@/core/theme/ThemeContext';

const LOW_STOCK_THRESHOLD = 10;

export default function LowStockScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { colors: tc, isDark } = useAppTheme();

  const loadItems = useCallback(async () => {
    try {
      const res = await inventoryAPI.list();
      // GET /inventory answers `{ data, total, page, totalPages }`. The old
      // `res.data.items || res.data || []` fell through both object branches
      // (`items` is undefined, `res.data` is the paginated object) and handed
      // `.filter` a non-array, which threw — silently swallowed by the empty
      // catch, rendering a permanent "No low stock items".
      const list = unwrapList(res?.data);
      const lowStock = list.filter(
        (item: any) => item.quantity <= (item.minQuantity ?? LOW_STOCK_THRESHOLD)
      );
      setItems(lowStock);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const onRefresh = () => { setRefreshing(true); loadItems(); };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <Text style={styles.headerTitle}>Low Stock Alerts</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <Text style={styles.headerTitle}>Low Stock Alerts</Text>
        <Text style={styles.headerSubtext}>Items that need restocking</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Card style={[styles.summaryCard, { backgroundColor: tc.card }]}>
          <Text style={[styles.summaryText, { color: tc.textSecondary }]}>Items below minimum quantity</Text>
          <Text style={styles.summaryCount}>{items.length}</Text>
        </Card>

        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={[styles.emptyText, { color: tc.text }]}>All stocked up</Text>
            <Text style={[styles.emptySubtext, { color: tc.textSecondary }]}>No inventory items are below minimum quantity</Text>
          </View>
        ) : (
          items.map((item) => (
            <Card key={item.id} style={[styles.itemCard, { backgroundColor: tc.card }]}>
              <View style={styles.itemHeader}>
                <Text style={[styles.itemName, { color: tc.text }]}>{item.name}</Text>
                <View style={styles.lowBadge}>
                  <Text style={styles.lowBadgeText}>Low Stock</Text>
                </View>
              </View>
              <View style={styles.itemRow}>
                <Text style={[styles.itemLabel, { color: tc.textSecondary }]}>Category</Text>
                <Text style={[styles.itemValue, { color: tc.text }]}>{item.category}</Text>
              </View>
              <View style={styles.itemRow}>
                <Text style={[styles.itemLabel, { color: tc.textSecondary }]}>Quantity</Text>
                <Text style={[styles.itemValue, { color: '#F44336' }]}>
                  {item.quantity} {item.unit || ''}
                </Text>
              </View>
              {item.minQuantity !== undefined && (
                <View style={styles.itemRow}>
                  <Text style={[styles.itemLabel, { color: tc.textSecondary }]}>Min Required</Text>
                  <Text style={[styles.itemValue, { color: tc.text }]}>
                    {item.minQuantity} {item.unit || ''}
                  </Text>
                </View>
              )}
              {item.farmName && (
                <View style={styles.itemRow}>
                  <Text style={[styles.itemLabel, { color: tc.textSecondary }]}>Farm</Text>
                  <Text style={[styles.itemValue, { color: tc.text }]}>{item.farmName}</Text>
                </View>
              )}
              {item.costPerUnit !== undefined && (
                <View style={styles.itemRow}>
                  <Text style={[styles.itemLabel, { color: tc.textSecondary }]}>Cost/Unit</Text>
                  <Text style={[styles.itemValue, { color: tc.text }]}>{formatCurrencyFixed(item.costPerUnit, 2)}</Text>
                </View>
              )}
            </Card>
          ))
        )}

        <TouchableOpacity style={styles.addButton} onPress={() => Alert.alert('Coming Soon', 'Adding items from mobile will be available in a future update.')}>
          <Text style={styles.addButtonText}>+ Add Item</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  headerSubtext: { fontSize: 14, color: '#FFFFFF', opacity: 0.8, marginTop: 4 },
  content: { paddingHorizontal: 16, paddingVertical: 12 },
  summaryCard: { marginBottom: 16 },
  summaryText: { fontSize: 14, color: colors.textLight, textAlign: 'center' },
  summaryCount: { fontSize: 28, fontWeight: '700', color: '#F44336', textAlign: 'center', marginTop: 4 },
  itemCard: { marginBottom: 12 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  itemName: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
  lowBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  lowBadgeText: { fontSize: 11, fontWeight: '600', color: '#DC2626' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  itemLabel: { fontSize: 13, color: colors.textLight },
  itemValue: { fontSize: 13, fontWeight: '500', color: colors.text },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: colors.textLight, textAlign: 'center' },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
