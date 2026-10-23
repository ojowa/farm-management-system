import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Modal, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { inventoryAPI } from '@/modules/inventory';
import { unwrapList } from '@/core/utils/listPayload';
import { Button, Card } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { MenuButton } from '@/core/ui/MenuButton';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { usePermission } from '@/core/hooks/usePermission';
import { farmsAPI } from '@/modules/farm';

interface InventoryItem {
  id: string;
  farmId: string;
  name: string;
  category?: string;
  quantity: number;
  minimumQuantity?: number | null;
  unit?: string | null;
  farmName?: string | null;
  farm?: { name: string } | null;
}

export default function InventoryListScreen() {
  const router = useRouter();
  const { colors: themeColors } = useAppTheme();
  const { hasPermission } = usePermission();
  const canWrite = hasPermission('farm.write');
  const canDelete = hasPermission('farm.delete');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [farms, setFarms] = useState<Array<{ id: string; name: string }>>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ farmId: '', name: '', category: '', quantity: '', unit: '', minimumQuantity: '0' });
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

  const openForm = async (item?: InventoryItem) => {
    try {
      const response = await farmsAPI.list({ limit: 100 });
      const farmList = unwrapList<{ id: string; name: string }>(response.data);
      setFarms(farmList);
      setEditingItem(item || null);
      setForm(item
        ? { farmId: item.farmId, name: item.name, category: item.category || '', quantity: String(item.quantity), unit: item.unit || '', minimumQuantity: String(item.minimumQuantity ?? 0) }
        : { farmId: farmList[0]?.id || '', name: '', category: '', quantity: '', unit: '', minimumQuantity: '0' });
      setShowForm(true);
    } catch (error) {
      Alert.alert('Could not load farms', describeApiError(error));
    }
  };

  const saveItem = async () => {
    const quantity = Number(form.quantity);
    const minimumQuantity = Number(form.minimumQuantity);
    if ((!editingItem && !form.farmId) || !form.name.trim() || !form.category.trim() ||
      !Number.isFinite(quantity) || quantity < 0 || !form.unit.trim() ||
      !Number.isFinite(minimumQuantity) || minimumQuantity < 0) {
      Alert.alert('Invalid inventory item', 'Provide the farm, name, category, non-negative quantity, unit, and minimum quantity.');
      return;
    }
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      quantity,
      unit: form.unit.trim(),
      minimumQuantity,
      ...(editingItem ? {} : { farmId: form.farmId }),
    };
    setSaving(true);
    try {
      if (editingItem) await inventoryAPI.update(editingItem.id, payload);
      else await inventoryAPI.create(payload);
      setShowForm(false);
      await loadItems();
    } catch (error) {
      Alert.alert('Could not save inventory item', describeApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = (item: InventoryItem) => {
    Alert.alert('Delete inventory item', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await inventoryAPI.delete(item.id);
          await loadItems();
        } catch (error) {
          Alert.alert('Could not delete item', describeApiError(error));
        }
      } },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header onAdd={canWrite ? () => void openForm() : undefined} />
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
            {item.minimumQuantity != null && (
              <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
                Minimum quantity: {item.minimumQuantity} {item.unit || ''}
              </Text>
            )}
            {(canWrite || canDelete) && (
              <View style={styles.actions}>
                {canWrite && <TouchableOpacity onPress={() => void openForm(item)}><Text style={styles.action}>Edit</Text></TouchableOpacity>}
                {canDelete && <TouchableOpacity onPress={() => deleteItem(item)}><Text style={[styles.action, styles.delete]}>Delete</Text></TouchableOpacity>}
              </View>
            )}
          </Card>
        )}
      />
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>{editingItem ? 'Edit inventory item' : 'Add inventory item'}</Text>
            {!editingItem && (
              <View style={styles.farms}>
                {farms.map((farm) => (
                  <TouchableOpacity key={farm.id} onPress={() => setForm((current) => ({ ...current, farmId: farm.id }))} style={[styles.farmChip, { backgroundColor: form.farmId === farm.id ? themeColors.primary : themeColors.background }]}>
                    <Text style={{ color: form.farmId === farm.id ? '#fff' : themeColors.text }}>{farm.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {(['name', 'category', 'quantity', 'unit', 'minimumQuantity'] as const).map((field) => (
              <TextInput
                key={field}
                value={form[field]}
                onChangeText={(value) => setForm((current) => ({ ...current, [field]: value }))}
                placeholder={field === 'minimumQuantity' ? 'Minimum quantity' : field[0].toUpperCase() + field.slice(1)}
                keyboardType={field === 'quantity' || field === 'minimumQuantity' ? 'numeric' : 'default'}
                placeholderTextColor={themeColors.textSecondary}
                style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]}
              />
            ))}
            <Button title={editingItem ? 'Save changes' : 'Create item'} onPress={saveItem} loading={saving} disabled={saving} />
            <Button title="Cancel" onPress={() => setShowForm(false)} variant="secondary" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Header({ onAdd }: { onAdd?: () => void }) {
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
      {onAdd && <TouchableOpacity onPress={onAdd} accessibilityLabel="Add inventory item"><Text style={styles.add}>+</Text></TouchableOpacity>}
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
  add: { color: '#FFFFFF', fontSize: 26, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 18, marginTop: 12 },
  action: { color: '#2563EB', fontWeight: '700' },
  delete: { color: '#DC2626' },
  modalBackdrop: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 18 },
  modal: { borderRadius: 14, padding: 18, gap: 10 },
  modalTitle: { fontSize: 19, fontWeight: '700', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 11 },
  farms: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  farmChip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
});
