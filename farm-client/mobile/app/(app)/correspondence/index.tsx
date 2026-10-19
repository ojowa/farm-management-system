import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { correspondenceAPI } from '@/modules/communication';
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
  filterContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12, gap: 8 },
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
  corrCard: { marginBottom: 12 },
  corrTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  corrTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1 },
  typeBadge: { backgroundColor: colors.light, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  typeBadgeText: { fontSize: 10, fontWeight: '600', color: colors.primary },
  corrMeta: { fontSize: 13, color: colors.textLight, marginBottom: 2 },
  corrRef: { fontSize: 12, color: colors.textLight, fontStyle: 'italic' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalActionButton: { flex: 1 },
});

/**
 * The correspondence rows the API returns may use either the DB field names
 * (title/referenceNumber/archivedAt) or a mapped DTO (subject/archived). Read
 * both so the screen never blanks on a naming difference.
 */
interface CorrespondenceRecord {
  id: string;
  title?: string;
  subject?: string;
  type: string;
  category?: string;
  status: string;
  priority?: string;
  from?: string;
  to?: string;
  content?: string;
  referenceNumber?: string;
  archived?: boolean;
  archivedAt?: string | null;
  receivedDate?: string | null;
  createdAt: string;
}

const subjectOf = (c: CorrespondenceRecord) => c.title || c.subject || 'Untitled';
const isArchived = (c: CorrespondenceRecord) =>
  c.status === 'ARCHIVED' || c.archivedAt != null || c.archived === true;

const TYPE_OPTIONS: SelectOption[] = [
  { id: 'INCOMING', label: 'Incoming' },
  { id: 'OUTGOING', label: 'Outgoing' },
  { id: 'INTERNAL', label: 'Internal' },
];
const CATEGORY_OPTIONS: SelectOption[] = [
  { id: 'MEMO', label: 'Memo' },
  { id: 'LETTER', label: 'Letter' },
  { id: 'REPORT', label: 'Report' },
  { id: 'NOTICE', label: 'Notice' },
  { id: 'OTHER', label: 'Other' },
];
const PRIORITY_OPTIONS: SelectOption[] = [
  { id: 'LOW', label: 'Low' },
  { id: 'NORMAL', label: 'Normal' },
  { id: 'HIGH', label: 'High' },
  { id: 'URGENT', label: 'Urgent' },
];

const ARCHIVE_FILTERS = ['all', 'active', 'archived'] as const;
type ArchiveFilter = (typeof ARCHIVE_FILTERS)[number];

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

interface CreateForm {
  title: string;
  type: string;
  category: string;
  priority: string;
  from: string;
  to: string;
  content: string;
}

export default function CorrespondenceScreen() {
  const router = useRouter();
  const { success, error: showError } = useToasts();
  const { hasPermission } = usePermission();

  // Server: GET /correspondence is hr.read; create/update hr.write.
  const canWrite = hasPermission('hr.write');

  const [items, setItems] = useState<CorrespondenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    title: '',
    type: 'INCOMING',
    category: 'OTHER',
    priority: 'NORMAL',
    from: '',
    to: '',
    content: '',
  });
  const [titleError, setTitleError] = useState<string | undefined>();

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoadError(null);
      const response = await correspondenceAPI.list();
      setItems(unwrapList<CorrespondenceRecord>(response.data));
    } catch (error: any) {
      setLoadError(describeApiError(error, "Couldn't load correspondence."));
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((c) => {
      if (archiveFilter === 'active' && isArchived(c)) return false;
      if (archiveFilter === 'archived' && !isArchived(c)) return false;
      if (query) {
        const haystack = `${subjectOf(c)} ${c.from ?? ''} ${c.to ?? ''} ${c.referenceNumber ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [items, search, archiveFilter]);

  const submitCreate = async () => {
    if (!form.title.trim()) {
      setTitleError('Subject is required');
      return;
    }
    setCreating(true);
    try {
      await correspondenceAPI.create({
        title: form.title.trim(),
        type: form.type,
        category: form.category,
        priority: form.priority,
        from: form.from.trim() || undefined,
        to: form.to.trim() || undefined,
        content: form.content.trim() || undefined,
      });
      success('Correspondence created successfully');
      setCreateOpen(false);
      setForm((prev) => ({ ...prev, title: '', from: '', to: '', content: '' }));
      loadItems();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to create correspondence. Please try again.'));
    } finally {
      setCreating(false);
    }
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setTitleError(undefined);
  };

  const renderItem = useCallback(
    ({ item }: { item: CorrespondenceRecord }) => {
      const date = formatDate(item.receivedDate ?? item.createdAt);
      return (
        <Card style={styles.corrCard}>
          <TouchableOpacity onPress={() => router.push(`/correspondence/${item.id}`)} activeOpacity={0.7}>
            <View style={styles.corrTopRow}>
              <Text style={styles.corrTitle}>{subjectOf(item)}</Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{item.type || '—'}</Text>
              </View>
              {isArchived(item) && (
                <View style={[styles.typeBadge, { backgroundColor: '#F3F4F6' }]}>
                  <Text style={[styles.typeBadgeText, { color: '#6B7280' }]}>Archived</Text>
                </View>
              )}
            </View>
            {!!item.referenceNumber && <Text style={styles.corrRef}>Ref: {item.referenceNumber}</Text>}
            <Text style={styles.corrMeta}>
              {[item.from, item.to].filter(Boolean).join(' → ') || 'No parties listed'}
              {date ? ` · ${date}` : ''}
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
          <Text style={styles.headerTitle}>Correspondence</Text>
        </View>
        <ScreenLoading message="Loading correspondence…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <MenuButton />
          <Text style={styles.headerTitle}>Correspondence</Text>
        </View>
        <StateView
          variant="error"
          title="Couldn't load correspondence"
          message={loadError}
          onRetry={loadItems}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MenuButton />
        <Text style={styles.headerTitle}>Correspondence</Text>
        {canWrite && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setCreateOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Create new correspondence"
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <TextInputField
          placeholder="Search correspondence…"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          containerStyle={{ marginBottom: 12 }}
          accessibilityLabel="Search correspondence"
        />
        <View style={styles.filterContainer}>
          {ARCHIVE_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, archiveFilter === f && styles.filterButtonActive]}
              onPress={() => setArchiveFilter(f)}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${f} correspondence`}
              accessibilityState={{ selected: archiveFilter === f }}
            >
              <Text style={[styles.filterButtonText, archiveFilter === f && styles.filterButtonTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✉️</Text>
            <Text style={styles.emptyText}>No Correspondence Found</Text>
            <Text style={styles.emptySubtext}>
              {search || archiveFilter !== 'all'
                ? 'Nothing matches the current filters'
                : 'Record incoming and outgoing letters, memos and notices'}
            </Text>
            {!search && archiveFilter === 'all' && canWrite && (
              <Button
                title="New Correspondence"
                onPress={() => setCreateOpen(true)}
                accessibilityLabel="Create your first correspondence"
              />
            )}
          </View>
        }
      />

      <Modal visible={createOpen} onClose={closeCreate} title="New Correspondence">
        <TextInputField
          label="Subject *"
          placeholder="e.g. Water supply maintenance"
          value={form.title}
          onChangeText={(v) => {
            setForm((prev) => ({ ...prev, title: v }));
            if (titleError) setTitleError(undefined);
          }}
          error={titleError}
        />
        <SelectField
          label="Type"
          placeholder="Select a type"
          value={form.type}
          options={TYPE_OPTIONS}
          onSelect={(v) => setForm((prev) => ({ ...prev, type: v }))}
        />
        <SelectField
          label="Category"
          placeholder="Select a category"
          value={form.category}
          options={CATEGORY_OPTIONS}
          onSelect={(v) => setForm((prev) => ({ ...prev, category: v }))}
        />
        <SelectField
          label="Priority"
          placeholder="Select a priority"
          value={form.priority}
          options={PRIORITY_OPTIONS}
          onSelect={(v) => setForm((prev) => ({ ...prev, priority: v }))}
        />
        <TextInputField
          label="From"
          placeholder="Sender"
          value={form.from}
          onChangeText={(v) => setForm((prev) => ({ ...prev, from: v }))}
        />
        <TextInputField
          label="To"
          placeholder="Recipient"
          value={form.to}
          onChangeText={(v) => setForm((prev) => ({ ...prev, to: v }))}
        />
        <TextInputField
          label="Content"
          placeholder="Letter or memo body"
          value={form.content}
          onChangeText={(v) => setForm((prev) => ({ ...prev, content: v }))}
        />
        <View style={styles.modalActions}>
          <Button title="Cancel" variant="secondary" style={styles.modalActionButton} onPress={closeCreate} />
          <Button
            title="Save"
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
