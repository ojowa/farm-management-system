import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { farmsAPI } from '@/modules/farm';
import { pensAPI, poultryHousesAPI } from '@/modules/poultry';
import type { Pen, PoultryHouse } from '@/modules/poultry';
import { Button, Card, TextInputField } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { MenuButton } from '@/core/ui/MenuButton';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';

interface Farm {
  id: string;
  name: string;
}

type FormKind = 'house' | 'pen' | null;

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const value = payload as { data?: unknown; items?: unknown };
    if (Array.isArray(value.data)) return value.data as T[];
    if (Array.isArray(value.items)) return value.items as T[];
  }
  return [];
}

export default function PoultryHousesScreen() {
  const router = useRouter();
  const { colors: themeColors } = useAppTheme();
  const { hasPermission } = usePermission();
  const { success, error: showError } = useToasts();
  const canWrite = hasPermission('poultry.write');
  const canDelete = hasPermission('poultry.delete');
  const [houses, setHouses] = useState<PoultryHouse[]>([]);
  const [pens, setPens] = useState<Pen[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [formKind, setFormKind] = useState<FormKind>(null);
  const [form, setForm] = useState({ name: '', farmId: '', poultryHouseId: '', capacity: '' });
  const [expandedPicker, setExpandedPicker] = useState<'farmId' | 'poultryHouseId' | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoadError(null);
      const [housesResponse, pensResponse, farmsResponse] = await Promise.all([
        poultryHousesAPI.list({ page: 1, limit: 100 }),
        pensAPI.list({ page: 1, limit: 200 }),
        farmsAPI.list({ page: 1, limit: 100 }),
      ]);
      setHouses(unwrapList<PoultryHouse>(housesResponse.data));
      setPens(unwrapList<Pen>(pensResponse.data));
      setFarms(unwrapList<Farm>(farmsResponse.data));
    } catch (error) {
      setLoadError(describeApiError(error, 'Failed to load poultry houses and pens.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const farmNames = useMemo(
    () => new Map(farms.map((farm) => [farm.id, farm.name])),
    [farms]
  );
  const filteredHouses = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return houses;
    return houses.filter((house) => {
      const housePens = pens.filter((pen) => pen.poultryHouseId === house.id);
      return (
        house.name.toLowerCase().includes(query) ||
        (farmNames.get(house.farmId) || '').toLowerCase().includes(query) ||
        housePens.some((pen) => pen.name.toLowerCase().includes(query))
      );
    });
  }, [farmNames, houses, pens, search]);

  const openForm = (kind: Exclude<FormKind, null>) => {
    setForm({ name: '', farmId: '', poultryHouseId: '', capacity: '' });
    setFormError('');
    setExpandedPicker(null);
    setFormKind(kind);
  };

  const save = async () => {
    const name = form.name.trim();
    const capacity = Number(form.capacity);
    if (name.length < (formKind === 'house' ? 2 : 1)) {
      setFormError(formKind === 'house' ? 'House name must be at least 2 characters.' : 'Pen name is required.');
      return;
    }
    if ((formKind === 'house' && !form.farmId) || (formKind === 'pen' && !form.poultryHouseId)) {
      setFormError(formKind === 'house' ? 'Select a farm.' : 'Select a poultry house.');
      return;
    }
    if (!Number.isInteger(capacity) || capacity <= 0) {
      setFormError('Capacity must be a positive whole number.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (formKind === 'house') {
        await poultryHousesAPI.create({ farmId: form.farmId, name, capacity });
      } else {
        await pensAPI.create({ poultryHouseId: form.poultryHouseId, name, capacity });
      }
      setFormKind(null);
      success(formKind === 'house' ? 'Poultry house added.' : 'Pen added.');
      await loadData();
    } catch (error) {
      showError(describeApiError(error, 'Failed to save poultry location.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteHouse = (house: PoultryHouse) => {
    Alert.alert('Delete poultry house', `Delete "${house.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await poultryHousesAPI.delete(house.id);
            success('Poultry house deleted.');
            await loadData();
          } catch (error) {
            showError(describeApiError(error, 'Failed to delete poultry house.'));
          }
        },
      },
    ]);
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
        <Header onBack={() => router.push('/poultry')} />
        <ScreenLoading message="Loading houses and pens…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header onBack={() => router.push('/poultry')} />
        <StateView
          variant="error"
          title="Couldn't load houses and pens"
          message={loadError}
          onRetry={() => void loadData()}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Header onBack={() => router.push('/poultry')} />
      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
          Organize poultry housing, capacity, and pens.
        </Text>
        <TextInputField
          label="Search houses and pens"
          placeholder="Search by house, farm, or pen"
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Search houses and pens"
        />
        {canWrite && (
          <View style={styles.addActions}>
            <Button title="Add House" onPress={() => openForm('house')} />
            <Button title="Add Pen" variant="secondary" onPress={() => openForm('pen')} />
          </View>
        )}
      </View>
      <FlatList
        data={filteredHouses}
        keyExtractor={(house) => house.id}
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
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏠</Text>
            <Text style={[styles.emptyText, { color: themeColors.text }]}>
              {search ? 'No matching houses or pens.' : 'No poultry houses yet.'}
            </Text>
          </View>
        }
        renderItem={({ item: house }) => {
          const housePens = pens.filter((pen) => pen.poultryHouseId === house.id);
          return (
            <Card
              style={[styles.houseCard, { backgroundColor: themeColors.card }]}
              onPress={() => router.push(`/poultry/houses/${house.id}`)}
              accessibilityLabel={`Manage pens in ${house.name}`}
            >
              <View style={styles.houseHeading}>
                <View style={styles.houseCopy}>
                  <Text style={[styles.houseName, { color: themeColors.text }]}>{house.name}</Text>
                  <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
                    {farmNames.get(house.farmId) || 'Farm'} · Capacity {house.capacity}
                  </Text>
                  <Text style={[styles.manageLink, { color: themeColors.primary }]}>
                    Manage pens ({housePens.length}) ›
                  </Text>
                </View>
                {canDelete && (
                  <TouchableOpacity
                    onPress={() => deleteHouse(house)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${house.name}`}
                  >
                    <Text style={styles.delete}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={[styles.penDivider, { borderTopColor: themeColors.border }]}>
                <Text style={[styles.penHeading, { color: themeColors.text }]}>Pens ({housePens.length})</Text>
                {housePens.map((pen) => (
                  <View key={pen.id} style={styles.penRow}>
                    <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
                      {pen.name} · Capacity {pen.capacity}
                    </Text>
                    {canDelete && (
                      <TouchableOpacity
                        onPress={() => deletePen(pen)}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${pen.name}`}
                      >
                        <Text style={styles.delete}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {housePens.length === 0 && (
                  <Text style={[styles.meta, { color: themeColors.textSecondary }]}>No pens added.</Text>
                )}
              </View>
            </Card>
          );
        }}
      />
      <Modal
        visible={formKind !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setFormKind(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Add {formKind === 'house' ? 'Poultry House' : 'Pen'}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {formKind === 'house' ? (
                <SelectField
                  label="Farm"
                  selected={farms.find((farm) => farm.id === form.farmId)?.name}
                  expanded={expandedPicker === 'farmId'}
                  onToggle={() => setExpandedPicker(expandedPicker === 'farmId' ? null : 'farmId')}
                  options={farms.map((farm) => ({ id: farm.id, label: farm.name }))}
                  onSelect={(farmId) => {
                    setForm({ ...form, farmId });
                    setExpandedPicker(null);
                  }}
                />
              ) : (
                <SelectField
                  label="Poultry house"
                  selected={houses.find((house) => house.id === form.poultryHouseId)?.name}
                  expanded={expandedPicker === 'poultryHouseId'}
                  onToggle={() =>
                    setExpandedPicker(expandedPicker === 'poultryHouseId' ? null : 'poultryHouseId')
                  }
                  options={houses.map((house) => ({
                    id: house.id,
                    label: `${house.name} · ${farmNames.get(house.farmId) || 'Farm'}`,
                  }))}
                  onSelect={(poultryHouseId) => {
                    setForm({ ...form, poultryHouseId });
                    setExpandedPicker(null);
                  }}
                />
              )}
              <TextInputField
                label={formKind === 'house' ? 'House name' : 'Pen name'}
                value={form.name}
                onChangeText={(name) => setForm({ ...form, name })}
                accessibilityLabel={formKind === 'house' ? 'House name' : 'Pen name'}
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
                  onPress={() => setFormKind(null)}
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

function Header({ onBack }: { onBack: () => void }) {
  const { colors: themeColors } = useAppTheme();
  return (
    <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}>
      <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to poultry">
        <Text style={styles.back}>‹</Text>
      </TouchableOpacity>
      <MenuButton />
      <Text style={styles.headerTitle}>Houses & Pens</Text>
    </View>
  );
}

function SelectField({
  label,
  selected,
  expanded,
  onToggle,
  options,
  onSelect,
}: {
  label: string;
  selected?: string;
  expanded: boolean;
  onToggle: () => void;
  options: Array<{ id: string; label: string }>;
  onSelect: (id: string) => void;
}) {
  const { colors: themeColors } = useAppTheme();
  return (
    <View style={styles.selectGroup}>
      <Text style={[styles.label, { color: themeColors.text }]}>{label}</Text>
      <TouchableOpacity
        onPress={onToggle}
        style={[styles.selectButton, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={{ color: themeColors.text }}>{selected || `Select ${label.toLowerCase()}`}</Text>
        <Text style={{ color: themeColors.textSecondary }}>⌄</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={[styles.optionList, { borderColor: themeColors.border }]}>
          {options.length ? options.map((option) => (
            <TouchableOpacity
              key={option.id}
              onPress={() => onSelect(option.id)}
              style={[styles.option, { borderBottomColor: themeColors.border }]}
            >
              <Text style={{ color: themeColors.text }}>{option.label}</Text>
            </TouchableOpacity>
          )) : (
            <Text style={[styles.option, { color: themeColors.textSecondary }]}>No options available</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  headerTitle: { flex: 1, color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  back: { color: '#FFFFFF', fontSize: 32, lineHeight: 34 },
  content: { padding: 16, paddingBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 12 },
  addActions: { flexDirection: 'row', gap: 10, marginTop: 2, marginBottom: 8 },
  list: { padding: 16, paddingTop: 4, flexGrow: 1 },
  houseCard: { padding: 16, marginBottom: 12 },
  houseHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  houseCopy: { flex: 1 },
  houseName: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  manageLink: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  meta: { fontSize: 13 },
  penDivider: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingTop: 12 },
  penHeading: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  penRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  delete: { color: '#B91C1C', fontWeight: '600', fontSize: 13 },
  empty: { minHeight: 250, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { maxHeight: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  selectGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  selectButton: { minHeight: 46, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionList: { borderWidth: 1, borderRadius: 8, marginTop: 6, maxHeight: 150 },
  option: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  error: { color: '#B91C1C', marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  cancelButton: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  saveButton: { flex: 1, borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontWeight: '700' },
});
