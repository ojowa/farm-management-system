import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { inventoryAPI } from '@/modules/inventory';
import { unwrapList } from '@/core/utils/listPayload';
import { Card } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { MenuButton } from '@/core/ui/MenuButton';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';

interface InventoryItem {
  id: string;
  name: string;
  category?: string;
  quantity: number;
  minQuantity?: number | null;
  unit?: string | null;
  farmName?: string | null;
  farm?: { name: string } | null;
}

export default function InventoryListScreen() {
  const router = useRouter();
  const { colors: themeColors } = useAppTheme();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    try {
      setLoadError(null);
      const response = await inventoryAPI.list({ limit: 100 });
      setItems(unwrapList<InventoryItem>(response.data));
    } catch (error) {
      setLoadError(describeApiError(error, 'Failed to load inventory items.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header />
        <ScreenLoading message="Loading inventory…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header />
        <StateView
          variant="error"
          title="Couldn't load inventory"
          message={loadError}
          onRetry={() => void loadItems()}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Header />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadItems();
            }}
            tintColor={themeColors.primary}
          />
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: themeColors.textSecondary }]}>No inventory items found.</Text>
        }
        renderItem={({ item }) => (
          <Card style={[styles.card, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.itemName, { color: themeColors.text }]}>{item.name}</Text>
            <View style={styles.details}>
              <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
                {item.category || 'Uncategorized'}
              </Text>
              <Text style={[styles.quantity, { color: themeColors.text }]}>
                {item.quantity} {item.unit || ''}
              </Text>
            </View>
            {(item.farm?.name || item.farmName) && (
              <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
                Farm: {item.farm?.name || item.farmName}
              </Text>
            )}
            {item.minQuantity != null && (
              <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
                Minimum quantity: {item.minQuantity} {item.unit || ''}
              </Text>
            )}
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

function Header() {
  const router = useRouter();
  const { colors: themeColors } = useAppTheme();
  return (
    <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Back to inventory"
        onPress={() => router.push('/inventory')}
      >
        <Text style={styles.back}>‹</Text>
      </TouchableOpacity>
      <MenuButton />
      <Text style={styles.headerTitle}>All Items</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  back: { color: '#FFFFFF', fontSize: 32, lineHeight: 34 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', flex: 1 },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  card: { padding: 15 },
  itemName: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  details: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: 13, marginTop: 5 },
  quantity: { fontSize: 14, fontWeight: '600' },
  empty: { textAlign: 'center', paddingVertical: 40 },
});
