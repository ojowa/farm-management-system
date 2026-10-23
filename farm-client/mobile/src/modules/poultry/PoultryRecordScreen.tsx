import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { poultryAPI } from '@/modules/poultry';
import type { Flock } from '@/modules/poultry';
import { Button, Card, TextInputField } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { MenuButton } from '@/core/ui/MenuButton';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';

export type RecordField = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'flock';
  required?: boolean;
  integer?: boolean;
  min?: number;
  placeholder?: string;
};

export interface PoultryRecordConfig {
  title: string;
  subtitle: string;
  icon: string;
  searchKeys: string[];
  columns: Array<{ key: string; label: string }>;
  fields: RecordField[];
  validate?: (values: Record<string, string>) => string | null;
  list: (page: number) => Promise<{ data: unknown }>;
  create: (values: Record<string, string>) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
}

type RecordRow = Record<string, unknown> & { id: string };

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const value = payload as { data?: unknown; items?: unknown };
    if (Array.isArray(value.data)) return value.data as T[];
    if (Array.isArray(value.items)) return value.items as T[];
  }
  return [];
}

function displayValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  }
  return String(value);
}

function todayAsDateInput(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

export function PoultryRecordScreen({ config }: { config: PoultryRecordConfig }) {
  const router = useRouter();
  const { colors: themeColors } = useAppTheme();
  const { hasPermission } = usePermission();
  const { success, error: showError } = useToasts();
  const canWrite = hasPermission('poultry.write');
  const canDelete = hasPermission('poultry.delete');
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const loadingMoreRef = useRef(false);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [flockLoadError, setFlockLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [expandedPicker, setExpandedPicker] = useState<string | null>(null);

  const loadRecords = useCallback(async (requestedPage = 1, append = false) => {
    try {
      setLoadError(null);
      const response = await config.list(requestedPage);
      const payload = response.data as { totalPages?: number; pagination?: { totalPages?: number } };
      const nextRecords = unwrapList<RecordRow>(response.data);
      setRecords((current) => append ? [...current, ...nextRecords] : nextRecords);
      setPage(requestedPage);
      setTotalPages(payload?.totalPages ?? payload?.pagination?.totalPages ?? 1);
    } catch (error) {
      setLoadError(describeApiError(error, `Failed to load ${config.title.toLowerCase()}.`));
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [config]);

  const loadMoreRecords = useCallback(() => {
    if (loadingMoreRef.current || page >= totalPages) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    void loadRecords(page + 1, true);
  }, [loadRecords, page, totalPages]);

  const loadFlocks = useCallback(async () => {
    try {
      setFlockLoadError(null);
      const response = await poultryAPI.list({ page: 1, limit: 100 });
      setFlocks(unwrapList<Flock>(response.data));
    } catch (error) {
      setFlockLoadError(describeApiError(error, 'Unable to load flocks for this form.'));
    }
  }, []);

  useEffect(() => {
    void loadRecords(1, false);
    void loadFlocks();
  }, [loadRecords, loadFlocks]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;
    return records.filter((record) => {
      const flock = flocks.find((item) => item.id === record.flockId);
      const searchText = config.searchKeys
        .map((key) => (key === 'flockId' ? flock?.batchCode : record[key]))
        .filter((value) => value != null)
        .join(' ')
        .toLowerCase();
      return searchText.includes(query);
    });
  }, [config.searchKeys, flocks, records, search]);

  const startCreate = () => {
    const initialValues: Record<string, string> = {};
    config.fields.forEach((field) => {
      initialValues[field.key] =
        field.type === 'date' && field.required ? todayAsDateInput() : '';
    });
    setForm(initialValues);
    setFormError('');
    setShowForm(true);
  };

  const submit = async () => {
    const customError = config.validate?.(form);
    if (customError) {
      setFormError(customError);
      return;
    }
    for (const field of config.fields) {
      const value = form[field.key]?.trim() || '';
      if (field.required && !value) {
        setFormError(`${field.label} is required.`);
        return;
      }
      if (field.type === 'date' && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        setFormError(`${field.label} must use YYYY-MM-DD.`);
        return;
      }
      if (field.type === 'number' && value) {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue) || numericValue < (field.min ?? 0)) {
          setFormError(`${field.label} must be at least ${field.min ?? 0}.`);
          return;
        }
        if (field.integer && !Number.isInteger(numericValue)) {
          setFormError(`${field.label} must be a whole number.`);
          return;
        }
      }
    }

    setSaving(true);
    setFormError('');
    try {
      await config.create(form);
      setShowForm(false);
      success(`${config.title} record added.`);
      await loadRecords(1, false);
    } catch (error) {
      showError(describeApiError(error, `Failed to add ${config.title.toLowerCase()}.`));
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = (record: RecordRow) => {
    Alert.alert(
      `Delete ${config.title.toLowerCase()} record`,
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await config.remove(record.id);
              success('Record deleted.');
              await loadRecords();
            } catch (error) {
              showError(describeApiError(error, 'Failed to delete record.'));
            }
          },
        },
      ]
    );
  };

  const getRecordValue = (record: RecordRow, key: string) => {
    if (key === 'flockId') {
      return flocks.find((flock) => flock.id === record.flockId)?.batchCode || 'Flock';
    }
    return displayValue(record[key]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header title={config.title} />
        <ScreenLoading message={`Loading ${config.title.toLowerCase()}…`} />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header title={config.title} />
        <StateView
          variant="error"
          title={`Couldn't load ${config.title.toLowerCase()}`}
          message={loadError}
          onRetry={() => void loadRecords()}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Header title={config.title} />
      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>{config.subtitle}</Text>
        <TextInputField
          label="Search"
          placeholder={`Search ${config.title.toLowerCase()}…`}
          value={search}
          onChangeText={setSearch}
          accessibilityLabel={`Search ${config.title.toLowerCase()}`}
        />
        {canWrite && (
          <Button title={`Add ${config.title} Record`} onPress={startCreate} />
        )}
      </View>
      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadRecords(1, false);
            }}
            tintColor={themeColors.primary}
          />
        }
        onEndReached={loadMoreRecords}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={themeColors.primary} /> : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{config.icon}</Text>
            <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
              {search ? 'No matching records' : `No ${config.title.toLowerCase()} records yet`}
            </Text>
            {!search && canWrite && (
              <Button title="Add first record" onPress={startCreate} />
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Card style={[styles.recordCard, { backgroundColor: themeColors.card }]}>
            {config.columns.map((column) => (
              <View key={column.key} style={styles.recordRow}>
                <Text style={[styles.recordLabel, { color: themeColors.textSecondary }]}>
                  {column.label}
                </Text>
                <Text style={[styles.recordValue, { color: themeColors.text }]}>
                  {getRecordValue(item, column.key)}
                </Text>
              </View>
            ))}
            {canDelete && (
              <TouchableOpacity
                onPress={() => deleteRecord(item)}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${config.title.toLowerCase()} record`}
                style={[styles.deleteButton, { borderTopColor: themeColors.border }]}
              >
                <Text style={styles.deleteText}>Delete record</Text>
              </TouchableOpacity>
            )}
          </Card>
        )}
      />
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modal, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Add {config.title} Record
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {config.fields.map((field) => (
                <View key={field.key} style={styles.field}>
                  {field.type === 'flock' ? (
                    <>
                      <Text style={[styles.label, { color: themeColors.text }]}>{field.label}</Text>
                      <TouchableOpacity
                        style={[
                          styles.pickerButton,
                          { borderColor: themeColors.border, backgroundColor: themeColors.inputBg },
                        ]}
                        onPress={() =>
                          setExpandedPicker(expandedPicker === field.key ? null : field.key)
                        }
                        accessibilityRole="button"
                        accessibilityLabel={field.label}
                      >
                        <Text style={{ color: themeColors.text }}>
                          {flocks.find((flock) => flock.id === form[field.key])?.batchCode ||
                            field.placeholder ||
                            'Select a flock'}
                        </Text>
                        <Text style={{ color: themeColors.textSecondary }}>⌄</Text>
                      </TouchableOpacity>
                      {expandedPicker === field.key && (
                        <View style={[styles.options, { borderColor: themeColors.border }]}>
                          {!field.required && (
                            <TouchableOpacity
                              style={[styles.option, { borderBottomColor: themeColors.border }]}
                              onPress={() => {
                                setForm({ ...form, [field.key]: '' });
                                setExpandedPicker(null);
                              }}
                            >
                              <Text style={{ color: themeColors.text }}>No flock</Text>
                            </TouchableOpacity>
                          )}
                          {flocks.map((flock) => (
                            <TouchableOpacity
                              key={flock.id}
                              style={[styles.option, { borderBottomColor: themeColors.border }]}
                              onPress={() => {
                                setForm({ ...form, [field.key]: flock.id });
                                setExpandedPicker(null);
                              }}
                            >
                              <Text style={{ color: themeColors.text }}>{flock.batchCode}</Text>
                            </TouchableOpacity>
                          ))}
                          {flocks.length === 0 && (
                            <Text style={[styles.hint, { color: themeColors.textSecondary }]}>
                              No flocks available.
                            </Text>
                          )}
                        </View>
                      )}
                    </>
                  ) : (
                    <TextInputField
                      label={field.label}
                      placeholder={field.placeholder || (field.type === 'date' ? 'YYYY-MM-DD' : '')}
                      value={form[field.key] || ''}
                      onChangeText={(value) => setForm({ ...form, [field.key]: value })}
                      keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                      accessibilityLabel={field.label}
                    />
                  )}
                </View>
              ))}
              {flockLoadError && (
                <TouchableOpacity onPress={() => void loadFlocks()}>
                  <Text style={styles.error}>{flockLoadError} Tap to retry.</Text>
                </TouchableOpacity>
              )}
              {!!formError && <Text style={styles.error}>{formError}</Text>}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: themeColors.border }]}
                  onPress={() => setShowForm(false)}
                  disabled={saving}
                >
                  <Text style={{ color: themeColors.text }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: themeColors.primary }]}
                  onPress={() => void submit()}
                  disabled={saving}
                  accessibilityRole="button"
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitText}>Save Record</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Header({ title }: { title: string }) {
  const { colors: themeColors } = useAppTheme();
  const router = useRouter();
  return (
    <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}>
      <TouchableOpacity
        onPress={() => router.push('/poultry')}
        accessibilityRole="button"
        accessibilityLabel="Back to poultry"
      >
        <Text style={styles.back}>‹</Text>
      </TouchableOpacity>
      <MenuButton />
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 14,
  },
  back: { color: '#FFFFFF', fontSize: 32, lineHeight: 34 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  subtitle: { fontSize: 14, marginBottom: 6 },
  list: { padding: 16, paddingTop: 4, flexGrow: 1 },
  recordCard: { padding: 14, marginBottom: 12 },
  recordRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 },
  recordLabel: { fontSize: 13, flex: 1 },
  recordValue: { fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' },
  deleteButton: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  deleteText: { color: '#B91C1C', fontWeight: '600', textAlign: 'right' },
  empty: { flex: 1, minHeight: 250, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modal: { maxHeight: '90%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  field: { marginBottom: 2 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  pickerButton: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  options: { borderWidth: 1, borderRadius: 8, marginBottom: 12, maxHeight: 150 },
  option: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  hint: { padding: 12 },
  error: { color: '#B91C1C', fontSize: 13, marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 12 },
  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButton: { flex: 1, paddingVertical: 13, borderRadius: 8, alignItems: 'center' },
  submitText: { color: '#FFFFFF', fontWeight: '700' },
});
