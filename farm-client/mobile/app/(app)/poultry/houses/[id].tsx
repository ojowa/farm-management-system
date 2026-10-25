import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { farmsAPI } from '@/modules/farm';
import { pensAPI, poultryHousesAPI } from '@/modules/poultry';
import type { Pen, PoultryHouse } from '@/modules/poultry';
import { unwrapList } from '@/modules/poultry/flockChain';
import { Button, Card, TextInputField } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { MenuButton } from '@/core/ui/MenuButton';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';

/**
 * One house, all of its pens: the screen behind tapping a house card.
 *
 * The house is fixed (it comes from the route), so the form only ever asks for
 * a name and a capacity — no house picker, no way to file a pen under the
 * wrong building. Everything here is scoped by `poultryHouseId`.
 */
export default function PoultryHousePensScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useAppTheme();
  const { hasPermission } = usePermission();
  const { success, error: showError } = useToasts();
  const canWrite = hasPermission('poultry.write');
  const canDelete = hasPermission('poultry.delete');

  const [house, setHouse] = useState<PoultryHouse | null>(null);
  const [farmName, setFarmName] = useState('');
  const [pens, setPens] = useState<Pen[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formVisible, setFormVisible] = useState(false);
  const [editingPenId, setEditingPenId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', capacity: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) {
      setLoadError('Missing house id.');
      setLoading(false);
      return;
    }
    try {
      setLoadError(null);
      const [houseResponse, pensResponse] = await Promise.all([
        poultryHousesAPI.get(id),
        pensAPI.list({ poultryHouseId: id, limit: 500 }),
      ]);
      // The house arrives bare or wrapped; either way it must have an id or
      // the whole screen would render a blank header.
      const body: any = houseResponse.data;
      const record: PoultryHouse | null = body?.id ? body : body?.data?.id ? body.data : null;
      if (!record) {
        setLoadError('Poultry house not found.');
        return;
      }
      setHouse(record);
      setPens(unwrapList<Pen>(pensResponse.data));
      void loadFarmName(record.farmId);
    } catch (error) {
      setLoadError(describeApiError(error, "Couldn't load this house and its pens."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  const loadFarmName = async (farmId: string) => {
    if (!farmId) return;
    try {
      const response = await farmsAPI.get(farmId);
      const body: any = response.data;
      setFarmName(body?.name || body?.data?.name || '');
    } catch {
      /* optional label — never block the screen on it */
    }
  };

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openForm = (pen?: Pen) => {
    setEditingPenId(pen?.id ?? null);
    setForm({ name: pen?.name ?? '', capacity: pen?.capacity != null ? String(pen.capacity) : '' });
    setFormError('');
    setFormVisible(true);
  };

  const save = async () => {
    const name = form.name.trim();
    const capacity = Number(form.capacity);
    if (name.length < 1) {
      setFormError('Pen name is required.');
      return;
    }
    if (!Number.isInteger(capacity) || capacity <= 0) {
      setFormError('Capacity must be a positive whole number.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editingPenId) {
        await pensAPI.update(editingPenId, { name, capacity });
        success('Pen updated.');
      } else {
        await pensAPI.create({ poultryHouseId: id, name, capacity });
        success('Pen added.');
      }
      setFormVisible(false);
      await loadData();
    } catch (error) {
      showError(describeApiError(error, 'Failed to save pen.'));
    } finally {
      setSaving(false);
    }
  };

  const deletePen = (pen: Pen) => {
    Alert.alert('Delete pen', `Delete "${pen.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await pensAPI.delete(pen.id);
            success('Pen deleted.');
            await loadData();
          } catch (error) {
            showError(describeApiError(error, 'Failed to delete pen.'));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header title={house?.name || 'Poultry House'} onBack={() => router.push('/poultry/houses')} />
        <ScreenLoading message="Loading pens…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header title="Poultry House" onBack={() => router.push('/poultry/houses')} />
        <StateView
          variant="error"
          title="Couldn't load this house"
          message={loadError}
          onRetry={() => void loadData()}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Header title={house?.name || 'Poultry House'} onBack={() => router.push('/poultry/houses')} />
      <FlatList
        data={pens}
        keyExtractor={(pen) => pen.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadData();
            }}
            tintColor={themeColors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.summary}>
            <Card style={{ backgroundColor: themeColors.card }}>
              <Text style={[styles.houseName, { color: themeColors.text }]}>{house?.name}</Text>
              <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
                {farmName || 'Farm'} · Capacity {house?.capacity ?? '—'} · Pens {pens.length}
              </Text>
              {canWrite && (
                <Button
                  title="Add Pen"
                  variant="secondary"
                  onPress={() => openForm()}
                  style={styles.addButton}
                />
              )}
            </Card>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Pens in this house</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🚪</Text>
            <Text style={[styles.emptyText, { color: themeColors.text }]}>No pens in this house yet.</Text>
            <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
              Pens are what flocks get assigned to.
            </Text>
          </View>
        }
        renderItem={({ item: pen }) => (
          <Card style={[styles.penCard, { backgroundColor: themeColors.card }]}>
            <View style={styles.penCopy}>
              <Text style={[styles.penName, { color: themeColors.text }]}>{pen.name}</Text>
              <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
                Capacity {pen.capacity}
              </Text>
            </View>
            {(canWrite || canDelete) && (
              <View style={styles.penActions}>
                {canWrite && (
                  <TouchableOpacity
                    onPress={() => openForm(pen)}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${pen.name}`}
                  >
                    <Text style={[styles.penAction, { color: themeColors.primary }]}>Edit</Text>
                  </TouchableOpacity>
                )}
                {canDelete && (
                  <TouchableOpacity
                    onPress={() => deletePen(pen)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${pen.name}`}
                  >
                    <Text style={styles.penAction}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Card>
        )}
      />

      <Modal
        visible={formVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFormVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              {editingPenId ? 'Edit Pen' : `Add Pen — ${house?.name || ''}`}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TextInputField
                label="Pen name"
                value={form.name}
                onChangeText={(name) => setForm({ ...form, name })}
                accessibilityLabel="Pen name"
              />
              <TextInputField
                label="Capacity"
                value={form.capacity}
                onChangeText={(capacity) => setForm({ ...form, capacity })}
                keyboardType="numeric"
                accessibilityLabel="Capacity"
              />
              {!!formError && <Text style={styles.error}>{formError}</Text>}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: themeColors.border }]}
                  onPress={() => setFormVisible(false)}
                  disabled={saving}
                >
                  <Text style={{ color: themeColors.text }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: themeColors.primary }]}
                  onPress={() => void save()}
                  disabled={saving}
                  accessibilityRole="button"
                >
                  {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  const { colors: themeColors } = useAppTheme();
  return (
    <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}>
      <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to houses">
        <Text style={styles.back}>‹</Text>
      </TouchableOpacity>
      <MenuButton />
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  headerTitle: { flex: 1, color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  back: { color: '#FFFFFF', fontSize: 32, lineHeight: 34 },
  list: { padding: 16, flexGrow: 1 },
  summary: { marginBottom: 8 },
  houseName: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  meta: { fontSize: 13 },
  addButton: { marginTop: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginTop: 18, marginBottom: 8 },
  penCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 10 },
  penCopy: { flex: 1 },
  penName: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  penActions: { flexDirection: 'row', gap: 14 },
  penAction: { color: '#B91C1C', fontWeight: '600', fontSize: 13 },
  empty: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyIcon: { fontSize: 40, marginBottom: 6 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { maxHeight: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  error: { color: '#B91C1C', marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  cancelButton: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  saveButton: { flex: 1, borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontWeight: '700' },
});
