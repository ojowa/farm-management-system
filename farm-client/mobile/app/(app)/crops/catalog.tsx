import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { offlineCropsAPI } from '@/modules/crop';
import type { Crop } from '@/modules/crop';
import { Button, Card } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { MenuButton } from '@/core/ui/MenuButton';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';

/**
 * The organisation's crop catalog: every crop name the org can plant, managed
 * in one place. The records list at /crops/list shows what has been planted;
 * this screen manages the vocabulary itself — add, rename, remove.
 *
 * Writes go through `offlineCropsAPI` so a rename queued on a bad connection
 * syncs later instead of being lost. Reads fall back to the plain API.
 */
export default function CropCatalogScreen() {
  const router = useRouter();
  const { colors: themeColors } = useAppTheme();
  const { hasPermission } = usePermission();
  const { success, error: showError } = useToasts();
  const canWrite = hasPermission('crop.write');
  const canDelete = hasPermission('crop.delete');

  const [crops, setCrops] = useState<Crop[]>([]);
  // How many cycles plant each crop — advisory only; the server is the
  // authority and answers a delete of an in-use crop with 409.
  const [usage, setUsage] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  /** The catalog arrives bare or wrapped in `data` / `crops` / `items`. */
  const unwrapList = <T,>(payload: unknown): T[] => {
    if (Array.isArray(payload)) return payload as T[];
    if (payload && typeof payload === 'object') {
      const body = payload as { data?: unknown; crops?: unknown; items?: unknown };
      const value = body.data ?? body.crops ?? body.items;
      if (Array.isArray(value)) return value as T[];
    }
    return [];
  };

  const loadData = useCallback(async () => {
    try {
      setLoadError(null);
      const [cropsResponse, cyclesResponse] = await Promise.all([
        offlineCropsAPI.list({ limit: 500 }),
        offlineCropsAPI.listCycles({ limit: 500 }),
      ]);
      setCrops(unwrapList<Crop>(cropsResponse?.data ?? cropsResponse));
      const counts = new Map<string, number>();
      unwrapList<{ cropId?: string }>(cyclesResponse?.data ?? cyclesResponse).forEach((cycle) => {
        if (!cycle?.cropId) return;
        counts.set(cycle.cropId, (counts.get(cycle.cropId) || 0) + 1);
      });
      setUsage(counts);
    } catch (error) {
      setLoadError(describeApiError(error, "Couldn't load the crop catalog."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = (() => {
    const query = search.trim().toLowerCase();
    if (!query) return crops;
    return crops.filter((crop) => crop?.name?.toLowerCase().includes(query));
  })();

  const openForm = (crop?: Crop) => {
    setEditingId(crop?.id ?? null);
    setFormName(crop?.name ?? '');
    setFormError('');
    setFormVisible(true);
  };

  const save = async () => {
    const name = formName.trim();
    // Mirrors the server's createCropSchema: at least 2 characters.
    if (name.length < 2) {
      setFormError('Crop name must be at least 2 characters');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editingId) {
        await offlineCropsAPI.update(editingId, { name });
        success('Crop renamed.');
      } else {
        await offlineCropsAPI.create({ name });
        success('Crop added.');
      }
      setFormVisible(false);
      await loadData();
    } catch (error) {
      // 409 = the name already exists in this organisation. Keep the dialog
      // open so the name can be corrected rather than losing the typing.
      const serverMessage = (error as any)?.response?.data?.message;
      setFormError(serverMessage || describeApiError(error, 'Failed to save crop.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteCrop = (crop: Crop) => {
    const used = usage.get(crop.id) || 0;
    const warning =
      used > 0
        ? `"${crop.name}" is planted in ${used} crop cycle${used === 1 ? '' : 's'} and may not be removable.`
        : 'This cannot be undone.';
    Alert.alert('Delete crop', `${warning}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await offlineCropsAPI.delete(crop.id);
            success('Crop deleted.');
            await loadData();
          } catch (error) {
            // 409 from the server when cycles still reference this crop.
            const serverMessage = (error as any)?.response?.data?.message;
            showError(serverMessage || describeApiError(error, 'Failed to delete crop.'));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header title="Crop Catalog" onBack={() => router.push('/crops')} />
        <ScreenLoading message="Loading crops…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header title="Crop Catalog" onBack={() => router.push('/crops')} />
        <StateView
          variant="error"
          title="Couldn't load the catalog"
          message={loadError}
          onRetry={() => {
            setLoading(true);
            void loadData();
          }}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Header title="Crop Catalog" onBack={() => router.push('/crops')} />

      <FlatList
        data={filtered}
        keyExtractor={(crop) => crop.id}
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
          <View>
            <Text style={[styles.intro, { color: themeColors.textSecondary }]}>
              Every crop your organisation plants — {crops.length} in the catalog. Add, rename, or
              remove them here.
            </Text>
            <View style={[styles.searchBox, { backgroundColor: themeColors.card }]}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search crops"
                placeholderTextColor={themeColors.textSecondary}
                style={[styles.searchInput, { color: themeColors.text }]}
                accessibilityLabel="Search crops"
                autoCorrect={false}
              />
            </View>
            {canWrite && (
              <Button
                title="Add Crop"
                variant="secondary"
                onPress={() => openForm()}
                style={styles.addButton}
              />
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🌾</Text>
            <Text style={[styles.emptyText, { color: themeColors.text }]}>
              {search ? 'No crops match your search.' : 'No crops yet.'}
            </Text>
            {!search && canWrite && (
              <Button title="Add Crop" variant="secondary" onPress={() => openForm()} />
            )}
          </View>
        }
        renderItem={({ item: crop }) => {
          const count = usage.get(crop.id) || 0;
          return (
            <Card style={[styles.cropCard, { backgroundColor: themeColors.card }]}>
              <View style={styles.cropCopy}>
                <Text style={[styles.cropName, { color: themeColors.text }]}>{crop.name}</Text>
                <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
                  {count} {count === 1 ? 'cycle' : 'cycles'}
                </Text>
              </View>
              {(canWrite || canDelete) && (
                <View style={styles.actions}>
                  {canWrite && (
                    <TouchableOpacity
                      onPress={() => openForm(crop)}
                      accessibilityRole="button"
                      accessibilityLabel={`Rename ${crop.name}`}
                    >
                      <Text style={[styles.action, { color: themeColors.primary }]}>Rename</Text>
                    </TouchableOpacity>
                  )}
                  {canDelete && (
                    <TouchableOpacity
                      onPress={() => deleteCrop(crop)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${crop.name}`}
                    >
                      <Text style={styles.action}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </Card>
          );
        }}
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
              {editingId ? 'Rename Crop' : 'Add Crop'}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Crop name</Text>
              <TextInput
                value={formName}
                onChangeText={setFormName}
                placeholder="e.g. Maize"
                placeholderTextColor={themeColors.textSecondary}
                style={[
                  styles.input,
                  { color: themeColors.text, borderColor: themeColors.border },
                ]}
                accessibilityLabel="Crop name"
                autoCapitalize="words"
                autoCorrect={false}
                autoFocus
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
                  <Text style={styles.saveText}>{editingId ? 'Save Crop' : 'Create Crop'}</Text>
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
      <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to crops">
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  headerTitle: { flex: 1, color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  back: { color: '#FFFFFF', fontSize: 32, lineHeight: 34 },
  list: { padding: 16, flexGrow: 1 },
  intro: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
  searchBox: {
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchInput: { paddingVertical: 12, fontSize: 15 },
  addButton: { marginBottom: 14 },
  cropCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 10 },
  cropCopy: { flex: 1 },
  cropName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  meta: { fontSize: 13 },
  actions: { flexDirection: 'row', gap: 14 },
  action: { color: '#B91C1C', fontWeight: '600', fontSize: 13 },
  empty: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 40, marginBottom: 4 },
  emptyText: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: {
    maxHeight: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 10,
  },
  error: { color: '#B91C1C', marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  cancelButton: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  saveButton: { flex: 1, borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontWeight: '700' },
});
