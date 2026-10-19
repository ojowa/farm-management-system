import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { contractsAPI } from '@/modules/finance';
import { Card, Button, TextInputField, Modal, colors } from '@/core/ui/UIComponents';
import { SelectField, SelectOption } from '@/core/ui/SelectField';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
import { MenuButton } from '@/core/ui/MenuButton';

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
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  content: { paddingHorizontal: 20, paddingVertical: 16 },
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
  filterScroll: { marginBottom: 12 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  contractCard: { marginBottom: 12 },
  contractTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  contractName: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1 },
  typeBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  typeBadgeText: { fontSize: 10, fontWeight: '600', color: '#1E40AF' },
  statusBadge: { backgroundColor: colors.light, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusBadgeText: { fontSize: 10, fontWeight: '600', color: colors.primary },
  contractValue: { fontSize: 15, fontWeight: '700', color: colors.primary, marginBottom: 2 },
  contractMeta: { fontSize: 12, color: colors.textLight },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalActionButton: { flex: 1 },
});

/** Contracts rows use buyerSellerName at the DB level; older DTOs used title. */
interface ContractRecord {
  id: string;
  title?: string;
  buyerSellerName?: string;
  type: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  value?: number | null;
  terms?: string | null;
}

const partyOf = (c: ContractRecord) => c.buyerSellerName || c.title || 'Unnamed contract';

const TYPE_OPTIONS: SelectOption[] = [
  { id: 'BUY', label: 'Buy' },
  { id: 'SELL', label: 'Sell' },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function unwrapList<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function formatValue(value?: number | null) {
  if (value == null || isNaN(Number(value))) return null;
  return Number(value).toLocaleString();
}

interface CreateForm {
  type: string;
  buyerSellerName: string;
  value: string;
  startDate: string;
  endDate: string;
  terms: string;
}

export default function ContractsScreen() {
  const router = useRouter();
  const { success, error: showError } = useToasts();
  const { hasPermission } = usePermission();

  // Server: GET /contracts is finance.read; create/update finance.write.
  const canWrite = hasPermission('finance.write');

  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    type: 'SELL',
    buyerSellerName: '',
    value: '',
    startDate: '',
    endDate: '',
    terms: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateForm, string>>>({});

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoadError(null);
      const response = await contractsAPI.list();
      setContracts(unwrapList<ContractRecord>(response.data));
    } catch (error: any) {
      setLoadError(describeApiError(error, "Couldn't load contracts."));
    } finally {
      setLoading(false);
    }
  };

  // Status values differ across server versions (e.g. CANCELLED vs TERMINATED),
  // so the filter chips are built from the data actually returned.
  const statusFilters = useMemo(() => {
    const distinct = Array.from(new Set(contracts.map((c) => c.status).filter(Boolean)));
    return ['all', ...distinct];
  }, [contracts]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contracts.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (query && !`${partyOf(c)} ${c.type}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [contracts, search, statusFilter]);

  const validate = (): boolean => {
    const errors: Partial<Record<keyof CreateForm, string>> = {};
    if (!form.buyerSellerName.trim()) errors.buyerSellerName = 'Counterparty is required';
    const value = Number(form.value);
    if (!form.value.trim() || isNaN(value) || value < 0) errors.value = 'Enter a valid amount';
    if (!form.startDate.trim() || !DATE_RE.test(form.startDate.trim()) || isNaN(Date.parse(form.startDate.trim())))
      errors.startDate = 'Use YYYY-MM-DD';
    if (form.endDate.trim() && (!DATE_RE.test(form.endDate.trim()) || isNaN(Date.parse(form.endDate.trim()))))
      errors.endDate = 'Use YYYY-MM-DD';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitCreate = async () => {
    if (!validate()) return;
    setCreating(true);
    try {
      await contractsAPI.create({
        type: form.type,
        buyerSellerName: form.buyerSellerName.trim(),
        value: Number(form.value),
        startDate: form.startDate.trim(),
        endDate: form.endDate.trim() || undefined,
        terms: form.terms.trim() || undefined,
      });
      success('Contract created successfully');
      setCreateOpen(false);
      setForm((prev) => ({ ...prev, buyerSellerName: '', value: '', startDate: '', endDate: '', terms: '' }));
      loadContracts();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to create contract. Please try again.'));
    } finally {
      setCreating(false);
    }
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setFormErrors({});
  };

  const updateForm = (field: keyof CreateForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const renderItem = useCallback(
    ({ item }: { item: ContractRecord }) => {
      const value = formatValue(item.value);
      const start = formatDate(item.startDate);
      const end = formatDate(item.endDate);
      return (
        <Card style={styles.contractCard}>
          <TouchableOpacity onPress={() => router.push(`/contracts/${item.id}`)} activeOpacity={0.7}>
            <View style={styles.contractTopRow}>
              <Text style={styles.contractName}>{partyOf(item)}</Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{item.type || '—'}</Text>
              </View>
              {!!item.status && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{item.status}</Text>
                </View>
              )}
            </View>
            {value && <Text style={styles.contractValue}>{value}</Text>}
            <Text style={styles.contractMeta}>
              {start ? `${start}${end ? ` – ${end}` : ''}` : 'No dates set'}
            </Text>
          </TouchableOpacity>
        </Card>
      );
    },
    [router]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <MenuButton />
          <Text style={styles.headerTitle}>Contracts</Text>
        </View>
        <ScreenLoading message="Loading contracts…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <MenuButton />
          <Text style={styles.headerTitle}>Contracts</Text>
        </View>
        <StateView
          variant="error"
          title="Couldn't load contracts"
          message={loadError}
          onRetry={loadContracts}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MenuButton />
        <Text style={styles.headerTitle}>Contracts</Text>
        {canWrite && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setCreateOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Create new contract"
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <TextInputField
          placeholder="Search contracts…"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          containerStyle={{ marginBottom: 12 }}
          accessibilityLabel="Search contracts"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {statusFilters.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterButton, statusFilter === f && styles.filterButtonActive]}
                onPress={() => setStatusFilter(f)}
                accessibilityRole="button"
                accessibilityLabel={f === 'all' ? 'Filter all contracts' : `Filter ${f.toLowerCase()} contracts`}
                accessibilityState={{ selected: statusFilter === f }}
              >
                <Text style={[styles.filterButtonText, statusFilter === f && styles.filterButtonTextActive]}>
                  {f === 'all' ? 'All' : f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>No Contracts Found</Text>
            <Text style={styles.emptySubtext}>
              {search || statusFilter !== 'all'
                ? 'Nothing matches the current filters'
                : 'Record buy and sell agreements with your buyers and suppliers'}
            </Text>
            {!search && statusFilter === 'all' && canWrite && (
              <Button
                title="New Contract"
                onPress={() => setCreateOpen(true)}
                accessibilityLabel="Create your first contract"
              />
            )}
          </View>
        }
      />

      <Modal visible={createOpen} onClose={closeCreate} title="New Contract">
        <SelectField
          label="Type"
          placeholder="Select a type"
          value={form.type}
          options={TYPE_OPTIONS}
          onSelect={(v) => updateForm('type', v)}
        />
        <TextInputField
          label="Buyer / Supplier *"
          placeholder="e.g. Green Grocers Ltd"
          value={form.buyerSellerName}
          onChangeText={(v) => updateForm('buyerSellerName', v)}
          error={formErrors.buyerSellerName}
        />
        <TextInputField
          label="Value *"
          placeholder="e.g. 25000"
          value={form.value}
          onChangeText={(v) => updateForm('value', v)}
          keyboardType="numeric"
          error={formErrors.value}
        />
        <TextInputField
          label="Start Date *"
          placeholder="YYYY-MM-DD"
          value={form.startDate}
          onChangeText={(v) => updateForm('startDate', v)}
          error={formErrors.startDate}
        />
        <TextInputField
          label="End Date"
          placeholder="YYYY-MM-DD"
          value={form.endDate}
          onChangeText={(v) => updateForm('endDate', v)}
          error={formErrors.endDate}
        />
        <TextInputField
          label="Terms"
          placeholder="Optional terms"
          value={form.terms}
          onChangeText={(v) => updateForm('terms', v)}
        />
        <View style={styles.modalActions}>
          <Button title="Cancel" variant="secondary" style={styles.modalActionButton} onPress={closeCreate} />
          <Button
            title="Create Contract"
            style={styles.modalActionButton}
            loading={creating}
            disabled={creating}
            onPress={submitCreate}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
