import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, colors } from '../../components/common/UIComponents';
import { correspondenceAPI } from '../../services/api';
import { usePermission } from '../../hooks/usePermission';

interface Correspondence {
  id: string;
  referenceNumber: string;
  title: string;
  type: string;
  category: string;
  from?: string;
  to?: string;
  content?: string;
  status: string;
  priority: string;
  receivedDate?: string;
  createdByName: string;
  archivedAt?: string;
  attachments: any[];
  createdAt: string;
}

type ScreenView = 'list' | 'detail' | 'create';

const TYPE_LABELS: Record<string, string> = { INCOMING: 'In', OUTGOING: 'Out', INTERNAL: 'Int' };
const STATUS_COLORS: Record<string, string> = { DRAFT: '#9CA3AF', SENT: '#3B82F6', RECEIVED: '#10B981', ARCHIVED: '#8B5CF6' };
const PRIORITY_COLORS: Record<string, string> = { LOW: '#9CA3AF', NORMAL: '#3B82F6', HIGH: '#F59E0B', URGENT: '#EF4444' };

export default function CorrespondenceScreen() {
  const { canCreate, canDelete } = usePermission();
  const canWrite = canCreate('correspondence');
  const canDeleteItem = canDelete('correspondence');

  const [view, setView] = useState<ScreenView>('list');
  const [items, setItems] = useState<Correspondence[]>([]);
  const [selected, setSelected] = useState<Correspondence | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [saving, setSaving] = useState(false);

  // Create form
  const [form, setForm] = useState({
    title: '', type: 'INCOMING', category: 'OTHER', from: '', to: '', content: '', status: 'DRAFT', priority: 'NORMAL',
  });

  const loadData = useCallback(async () => {
    try {
      const params: any = {};
      if (filter === 'archived') params.archived = 'true';
      else if (filter === 'active') params.archived = 'false';
      const res = await correspondenceAPI.list(params);
      setItems(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const openDetail = async (item: Correspondence) => {
    try {
      const { data } = await correspondenceAPI.get(item.id);
      setSelected(data);
      setView('detail');
    } catch {
      setSelected(item);
      setView('detail');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await correspondenceAPI.archive(id);
      Alert.alert('Success', 'Archived');
      setSelected(null);
      setView('list');
      await loadData();
    } catch { Alert.alert('Error', 'Failed to archive'); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await correspondenceAPI.delete(id);
            setSelected(null);
            setView('list');
            await loadData();
          } catch { Alert.alert('Error', 'Failed to delete'); }
        }
      },
    ]);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { Alert.alert('Error', 'Title is required'); return; }
    setSaving(true);
    try {
      await correspondenceAPI.create({
        ...form,
        from: form.from || null,
        to: form.to || null,
        content: form.content || null,
      });
      Alert.alert('Success', 'Created');
      setForm({ title: '', type: 'INCOMING', category: 'OTHER', from: '', to: '', content: '', status: 'DRAFT', priority: 'NORMAL' });
      setView('list');
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

  return (
    <SafeAreaView style={styles.container}>
    <ScrollView
      style={{flex: 1}}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {view === 'list' && (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Correspondence</Text>
            {canWrite && <TouchableOpacity onPress={() => setView('create')}><Text style={styles.addBtn}>+ New</Text></TouchableOpacity>}
          </View>

          <View style={styles.tabs}>
            {(['all', 'active', 'archived'] as const).map((f) => (
              <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.tab, filter === f && styles.activeTab]}>
                <Text style={[styles.tabText, filter === f && styles.activeTabText]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : items.length === 0 ? (
            <Card><Text style={styles.emptyText}>No correspondence found</Text></Card>
          ) : (
            items.map((item) => (
              <TouchableOpacity key={item.id} onPress={() => openDetail(item)}>
                <Card style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.refNum}>{item.referenceNumber}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={styles.itemMeta}>
                    <Text style={styles.metaText}>{TYPE_LABELS[item.type] || item.type}</Text>
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={styles.metaText}>{item.from || '—'} → {item.to || '—'}</Text>
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
                  </View>
                  {item.archivedAt && <Text style={styles.archivedBadge}>📦 Archived</Text>}
                </Card>
              </TouchableOpacity>
            ))
          )}
        </>
      )}

      {view === 'create' && (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setView('list')}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity>
            <Text style={styles.title}>New Correspondence</Text>
          </View>
          <Card>
            <TextInput style={styles.input} value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} placeholder="Title *" />
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.chipRow}>
                  {['INCOMING', 'OUTGOING', 'INTERNAL'].map((t) => (
                    <TouchableOpacity key={t} onPress={() => setForm({ ...form, type: t })} style={[styles.chip, form.type === t && styles.activeChip]}>
                      <Text style={[styles.chipText, form.type === t && styles.activeChipText]}>{TYPE_LABELS[t]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>Priority</Text>
                <View style={styles.chipRow}>
                  {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((p) => (
                    <TouchableOpacity key={p} onPress={() => setForm({ ...form, priority: p })} style={[styles.chip, form.priority === p && { backgroundColor: PRIORITY_COLORS[p] + '20' }]}>
                      <Text style={[styles.chipText, form.priority === p && { color: PRIORITY_COLORS[p] }]}>{p.slice(0, 4)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.halfInput]} value={form.from} onChangeText={(t) => setForm({ ...form, from: t })} placeholder="From" />
              <TextInput style={[styles.input, styles.halfInput]} value={form.to} onChangeText={(t) => setForm({ ...form, to: t })} placeholder="To" />
            </View>
            <TextInput style={[styles.input, styles.textArea]} value={form.content} onChangeText={(t) => setForm({ ...form, content: t })} placeholder="Content / notes" multiline numberOfLines={4} textAlignVertical="top" />
            <View style={styles.actions}>
              <Button title="Cancel" variant="secondary" onPress={() => setView('list')} />
              <Button title="Create" onPress={handleCreate} loading={saving} />
            </View>
          </Card>
        </>
      )}

      {view === 'detail' && selected && (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => { setView('list'); setSelected(null); }}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity>
            {canWrite && <TouchableOpacity onPress={() => handleArchive(selected.id)}><Text style={styles.archiveBtn}>Archive</Text></TouchableOpacity>}
          </View>
          <Card>
            <Text style={styles.refNum}>{selected.referenceNumber}</Text>
            <Text style={styles.detailTitle}>{selected.title}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selected.status] + '20' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[selected.status] }]}>{selected.status}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: PRIORITY_COLORS[selected.priority] + '20' }]}>
                <Text style={[styles.statusText, { color: PRIORITY_COLORS[selected.priority] }]}>{selected.priority}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: '#EFF6FF' }]}>
                <Text style={[styles.statusText, { color: '#3B82F6' }]}>{TYPE_LABELS[selected.type]}</Text>
              </View>
            </View>
            <View style={styles.detailMeta}>
              <Text style={styles.metaItem}>From: {selected.from || '—'}</Text>
              <Text style={styles.metaItem}>To: {selected.to || '—'}</Text>
              <Text style={styles.metaItem}>By: {selected.createdByName}</Text>
              <Text style={styles.metaItem}>Date: {formatDate(selected.createdAt)}</Text>
              {selected.receivedDate && <Text style={styles.metaItem}>Received: {formatDate(selected.receivedDate)}</Text>}
            </View>
            {selected.content && (
              <View style={styles.contentBox}>
                <Text style={styles.contentText}>{selected.content}</Text>
              </View>
            )}
            {selected.attachments?.length > 0 && (
              <View style={styles.attachSection}>
                <Text style={styles.attachTitle}>Attachments ({selected.attachments.length})</Text>
                {selected.attachments.map((a: any) => (
                  <Text key={a.id} style={styles.attachItem}>📎 {a.fileName}</Text>
                ))}
              </View>
            )}
            {canDeleteItem && (
              <TouchableOpacity onPress={() => handleDelete(selected.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            )}
          </Card>
        </>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  addBtn: { fontSize: 14, color: '#10B981', fontWeight: '600' },
  backBtn: { fontSize: 14, color: '#10B981' },
  archiveBtn: { fontSize: 14, color: '#8B5CF6' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6' },
  activeTab: { backgroundColor: '#D1FAE5' },
  tabText: { fontSize: 14, color: '#6B7280' },
  activeTabText: { color: '#065F46', fontWeight: '600' },
  loadingText: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
  emptyText: { textAlign: 'center', color: '#9CA3AF', paddingVertical: 40 },
  itemCard: { marginBottom: 8 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  refNum: { fontSize: 11, fontFamily: 'monospace', color: '#9CA3AF' },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#6B7280' },
  metaDot: { fontSize: 12, color: '#D1D5DB' },
  archivedBadge: { fontSize: 11, color: '#8B5CF6', marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 12, backgroundColor: '#fff' },
  textArea: { height: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  halfInput: { flex: 1 },
  label: { fontSize: 14, color: '#374151', marginBottom: 6 },
  chipRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#F3F4F6' },
  activeChip: { backgroundColor: '#D1FAE5' },
  chipText: { fontSize: 12, color: '#6B7280' },
  activeChipText: { color: '#065F46', fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  detailTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginTop: 4, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  detailMeta: { marginBottom: 12 },
  metaItem: { fontSize: 14, color: '#374151', marginBottom: 4 },
  contentBox: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12, marginBottom: 12 },
  contentText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  attachSection: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12, marginBottom: 12 },
  attachTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  attachItem: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  deleteBtn: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12, marginTop: 8 },
  deleteBtnText: { fontSize: 14, color: '#EF4444' },
});
