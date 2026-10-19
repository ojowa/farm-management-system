import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { correspondenceAPI } from '@/modules/communication';
import { Button, colors } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';

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
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', flex: 1, textAlign: 'center' },
  backButton: { padding: 8 },
  backButtonText: { color: '#FFFFFF', fontSize: 16 },
  content: { paddingHorizontal: 20, paddingVertical: 16 },
  card: { marginBottom: 16 },
  subject: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  badge: { backgroundColor: colors.light, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  refText: { fontSize: 12, color: colors.textLight, fontStyle: 'italic', marginBottom: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  detailValue: { fontSize: 14, color: colors.text, flexShrink: 1, textAlign: 'right' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  contentText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  attachmentRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.light,
    borderRadius: 8,
    marginBottom: 8,
  },
  attachmentText: { fontSize: 13, color: colors.text },
  actions: { marginTop: 20, gap: 12 },
});

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
  attachments?: { id: string; fileName: string }[];
}

const subjectOf = (c: CorrespondenceRecord) => c.title || c.subject || 'Untitled';
const isArchived = (c: CorrespondenceRecord) =>
  c.status === 'ARCHIVED' || c.archivedAt != null || c.archived === true;

function unwrapOne<T>(payload: any): T | null {
  if (payload?.id) return payload as T;
  if (payload?.data?.id) return payload.data as T;
  return null;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export default function CorrespondenceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const { hasPermission } = usePermission();

  const canWrite = hasPermission('hr.write');
  const canDelete = hasPermission('hr.delete');

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<CorrespondenceRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadItem();
  }, [id]);

  const loadItem = async () => {
    if (!id) {
      setLoadError('Missing correspondence id.');
      setLoading(false);
      return;
    }
    try {
      setLoadError(null);
      const response = await correspondenceAPI.get(id);
      const record = unwrapOne<CorrespondenceRecord>(response.data);
      if (!record) {
        setLoadError('Correspondence not found.');
        return;
      }
      setItem(record);
    } catch (error: any) {
      setLoadError(describeApiError(error, "Couldn't load this correspondence."));
    } finally {
      setLoading(false);
    }
  };

  const toggleArchive = useCallback(async () => {
    if (!item) return;
    try {
      if (isArchived(item)) {
        await correspondenceAPI.unarchive(item.id);
        success('Correspondence restored');
      } else {
        await correspondenceAPI.archive(item.id);
        success('Correspondence archived');
      }
      loadItem();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to update the archive status.'));
    }
  }, [item, success, showError]);

  const removeItem = useCallback(() => {
    if (!item) return;
    Alert.alert(
      'Delete Correspondence',
      `Delete "${subjectOf(item)}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await correspondenceAPI.delete(item.id);
              success('Correspondence deleted');
              router.back();
            } catch (error: any) {
              showError(describeApiError(error, 'Failed to delete correspondence.'));
            }
          },
        },
      ]
    );
  }, [item, success, showError, router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Correspondence</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScreenLoading message="Loading…" />
      </SafeAreaView>
    );
  }

  if (loadError || !item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Correspondence</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load this correspondence"
          message={loadError || 'Not found.'}
          onRetry={loadItem}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  const archived = isArchived(item);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Correspondence</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.subject}>{subjectOf(item)}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.type || '—'}</Text>
            </View>
            {!!item.category && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.category}</Text>
              </View>
            )}
            {!!item.priority && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.priority}</Text>
              </View>
            )}
            {archived && (
              <View style={[styles.badge, { backgroundColor: '#F3F4F6' }]}>
                <Text style={[styles.badgeText, { color: '#6B7280' }]}>Archived</Text>
              </View>
            )}
          </View>
          {!!item.referenceNumber && <Text style={styles.refText}>Ref: {item.referenceNumber}</Text>}

          <View style={{ marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.light }}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>From</Text>
              <Text style={styles.detailValue}>{item.from || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>To</Text>
              <Text style={styles.detailValue}>{item.to || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>{item.status || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(item.receivedDate ?? item.createdAt)}</Text>
            </View>
          </View>

          {!!item.content && (
            <>
              <Text style={styles.sectionTitle}>Content</Text>
              <Text style={styles.contentText}>{item.content}</Text>
            </>
          )}

          {(item.attachments?.length ?? 0) > 0 && (
            <>
              <Text style={styles.sectionTitle}>Attachments ({item.attachments!.length})</Text>
              {item.attachments!.map((a) => (
                <View key={a.id} style={styles.attachmentRow}>
                  <Text style={styles.attachmentText}>📎 {a.fileName}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {(canWrite || canDelete) && (
          <View style={styles.actions}>
            {canWrite && (
              <Button
                title={archived ? 'Restore' : 'Archive'}
                onPress={toggleArchive}
                accessibilityLabel={archived ? 'Restore this correspondence' : 'Archive this correspondence'}
              />
            )}
            {canDelete && (
              <Button
                title="Delete"
                variant="secondary"
                onPress={removeItem}
                accessibilityLabel="Delete this correspondence"
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
