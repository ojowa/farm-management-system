import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card, colors } from '../../../src/core/ui/UIComponents';
import { inventoryAPI } from '@/modules/inventory';
import { formatCurrencyFixed } from '../../../src/core/utils/currency';
import { unwrapList } from '@/core/utils/listPayload';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { MenuButton } from '@/core/ui/MenuButton';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { describeApiError } from '@/core/utils/apiError';

export default function LowStockScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { colors: tc, isDark } = useAppTheme();

  const loadItems = useCallback(async () => {
    try {
      setLoadError(null);
      const response = await inventoryAPI.lowStock();
      setItems(unwrapList(response?.data));
    } catch (error) {
      setLoadError(describeApiError(error, 'Failed to load low-stock inventory.'));
    }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const onRefresh = () => { setRefreshing(true); loadItems(); };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
        <Header onBack={() => router.push('/inventory')} />
        <ScreenLoading message="Loading low-stock items…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
        <Header onBack={() => router.push('/inventory')} />
        <StateView
          variant="error"
          title="Couldn't load low-stock items"
          message={loadError}
          onRetry={() => void loadItems()}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
      <Header onBack={() => router.push('/inventory')} />

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
              {item.minimumQuantity !== undefined && (
                <View style={styles.itemRow}>
                  <Text style={[styles.itemLabel, { color: tc.textSecondary }]}>Min Required</Text>
                  <Text style={[styles.itemValue, { color: tc.text }]}>
                    {item.minimumQuantity} {item.unit || ''}
                  </Text>
                </View>
              )}
              {(item.farm?.name || item.farmName) && (
                <View style={styles.itemRow}>
                  <Text style={[styles.itemLabel, { color: tc.textSecondary }]}>Farm</Text>
                  <Text style={[styles.itemValue, { color: tc.text }]}>{item.farm?.name || item.farmName}</Text>
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

function Header({ onBack }: { onBack: () => void }) {
  const { colors: tc } = useAppTheme();
  return (
    <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
      <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to inventory">
        <Text style={styles.back}>‹</Text>
      </TouchableOpacity>
      <MenuButton />
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>Low Stock</Text>
        <Text style={styles.headerSubtext}>Items that need restocking</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  back: { color: '#FFFFFF', fontSize: 32, lineHeight: 34 },
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
