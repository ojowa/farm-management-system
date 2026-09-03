import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, colors } from '../../components/common/UIComponents';
import { messagesAPI } from '../../services/api';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../hooks/useAuth';

interface Message {
  id: string;
  subject: string;
  body: string;
  senderId: string;
  senderName: string;
  priority: string;
  createdAt: string;
  isRead?: boolean;
  readAt?: string;
  recipients?: Array<{ id: string; recipientId: string; recipientName: string; isRead: boolean }>;
}

type ScreenView = 'inbox' | 'sent' | 'compose' | 'message';

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#9CA3AF',
  NORMAL: '#3B82F6',
  HIGH: '#F59E0B',
  URGENT: '#EF4444',
};

export default function MessagesScreen() {
  const { user } = useAuth();
  const { canCreate } = usePermission();
  const canSend = canCreate('messaging');

  const [view, setView] = useState<ScreenView>('inbox');
  const [inbox, setInbox] = useState<Message[]>([]);
  const [sent, setSent] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Compose
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [inboxRes, sentRes, unreadRes] = await Promise.all([
        messagesAPI.inbox(),
        messagesAPI.sent(),
        messagesAPI.unreadCount(),
      ]);
      setInbox(inboxRes.data);
      setSent(sentRes.data);
      setUnreadCount(unreadRes.data.count);
    } catch {
      setError('Failed to load messages. Pull to retry.');
    }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const openMessage = async (msg: Message) => {
    try {
      const { data } = await messagesAPI.get(msg.id);
      setSelected(data);
      setView('message');
      if (!msg.isRead) setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      Alert.alert('Error', 'Failed to load message');
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      Alert.alert('Error', 'Subject and body are required');
      return;
    }
    setSaving(true);
    try {
      await messagesAPI.send({ subject: subject.trim(), body: body.trim(), priority });
      Alert.alert('Success', 'Message sent');
      setSubject('');
      setBody('');
      setPriority('NORMAL');
      setView('sent');
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to send');
    } finally { setSaving(false); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await messagesAPI.delete(id);
            setSelected(null);
            setView('inbox');
            await loadData();
          } catch { Alert.alert('Error', 'Failed to delete'); }
        }
      },
    ]);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    if (date.toISOString().split('T')[0] === now.toISOString().split('T')[0]) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          Messages {unreadCount > 0 && <Text style={styles.unreadBadge}>({unreadCount})</Text>}
        </Text>
        {canSend && view !== 'compose' && (
          <TouchableOpacity onPress={() => { setView('compose'); setSelected(null); }} accessibilityLabel="Compose new message">
            <Text style={styles.composeBtn}>+ Compose</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Tabs */}
      {view !== 'compose' && view !== 'message' && (
        <View style={styles.tabs}>
          {(['inbox', 'sent'] as const).map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => { setView(v); setSelected(null); }}
              style={[styles.tab, view === v && styles.activeTab]}
            >
              <Text style={[styles.tabText, view === v && styles.activeTabText]}>
                {v === 'inbox' ? `Inbox${unreadCount > 0 ? ` (${unreadCount})` : ''}` : 'Sent'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : view === 'compose' ? (
        /* Compose */
        <Card>
          <Text style={styles.sectionTitle}>New Message</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="Subject"
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={body}
            onChangeText={setBody}
            placeholder="Type your message..."
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <View style={styles.priorityRow}>
            <Text style={styles.label}>Priority:</Text>
            {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setPriority(p)}
                style={[styles.priorityBtn, priority === p && { backgroundColor: PRIORITY_COLORS[p] + '20' }]}
              >
                <Text style={[styles.priorityBtnText, priority === p && { color: PRIORITY_COLORS[p] }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.composeActions}>
            <Button title="Cancel" variant="secondary" onPress={() => setView('inbox')} />
            <Button title="Send" onPress={handleSend} loading={saving} />
          </View>
        </Card>
      ) : view === 'message' && selected ? (
        /* View Message */
        <Card>
          <View style={styles.messageHeader}>
            <TouchableOpacity onPress={() => setView('inbox')}>
              <Text style={styles.backBtn}>← Back</Text>
            </TouchableOpacity>
            {selected.senderId === user?.id && (
              <TouchableOpacity onPress={() => handleDelete(selected.id)}>
                <Text style={styles.deleteBtn}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.messageSubject}>{selected.subject}</Text>
          <View style={styles.messageMeta}>
            <Text style={styles.messageFrom}>From: {selected.senderName}</Text>
            <Text style={styles.messageDate}>{formatDate(selected.createdAt)}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[selected.priority] + '20' }]}>
              <Text style={[styles.priorityBadgeText, { color: PRIORITY_COLORS[selected.priority] }]}>{selected.priority}</Text>
            </View>
          </View>
          <Text style={styles.messageBody}>{selected.body}</Text>
          {selected.recipients && selected.recipients.length > 0 && (
            <View style={styles.recipientsSection}>
              <Text style={styles.recipientsLabel}>
                Sent to: {selected.recipients.map((r) => r.recipientName).join(', ')}
              </Text>
            </View>
          )}
        </Card>
      ) : (
        /* Message List */
        <View>
          {(view === 'inbox' ? inbox : sent).length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>{view === 'inbox' ? 'No messages yet' : 'No sent messages'}</Text>
            </Card>
          ) : (
            (view === 'inbox' ? inbox : sent).map((msg) => (
              <TouchableOpacity key={msg.id} onPress={() => openMessage(msg)}>
                <Card style={styles.messageCard}>
                  <View style={styles.messageListItem}>
                    <View style={styles.messageListContent}>
                      <View style={styles.messageListHeader}>
                        {!msg.isRead && <View style={styles.unreadDot} />}
                        <Text style={[styles.messageListSubject, !msg.isRead && styles.unreadSubject]} numberOfLines={1}>
                          {msg.subject}
                        </Text>
                        <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[msg.priority] + '20' }]}>
                          <Text style={[styles.priorityBadgeText, { color: PRIORITY_COLORS[msg.priority] }]}>{msg.priority}</Text>
                        </View>
                      </View>
                      <Text style={styles.messageListMeta}>
                        {view === 'inbox' ? `From: ${msg.senderName}` : `To: ${msg.recipients?.[0]?.recipientName || '—'}`}
                        {' · '}{formatDate(msg.createdAt)}
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  unreadBadge: { fontSize: 14, color: '#6B7280' },
  composeBtn: { fontSize: 14, color: '#10B981', fontWeight: '600' },
  errorText: { fontSize: 14, color: '#EF4444', textAlign: 'center', marginBottom: 12 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6' },
  activeTab: { backgroundColor: '#D1FAE5' },
  tabText: { fontSize: 14, color: '#6B7280' },
  activeTabText: { color: '#065F46', fontWeight: '600' },
  loadingText: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 12, backgroundColor: '#fff' },
  textArea: { height: 120, textAlignVertical: 'top' },
  priorityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  label: { fontSize: 14, color: '#374151' },
  priorityBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6' },
  priorityBtnText: { fontSize: 12, color: '#6B7280' },
  composeActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: { fontSize: 14, color: '#10B981' },
  deleteBtn: { fontSize: 14, color: '#EF4444' },
  messageSubject: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  messageMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  messageFrom: { fontSize: 14, color: '#6B7280' },
  messageDate: { fontSize: 14, color: '#9CA3AF' },
  messageBody: { fontSize: 15, color: '#374151', lineHeight: 22 },
  recipientsSection: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12, marginTop: 16 },
  recipientsLabel: { fontSize: 12, color: '#9CA3AF' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', paddingVertical: 40 },
  messageCard: { marginBottom: 8 },
  messageListItem: { flexDirection: 'row', alignItems: 'center' },
  messageListContent: { flex: 1 },
  messageListHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  messageListSubject: { fontSize: 14, color: '#111827', flex: 1 },
  unreadSubject: { fontWeight: '600' },
  messageListMeta: { fontSize: 12, color: '#9CA3AF' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  priorityBadgeText: { fontSize: 10, fontWeight: '600' },
});
