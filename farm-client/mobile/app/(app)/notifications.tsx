import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card, colors } from '@/core/ui/UIComponents';
import { notificationsAPI } from '@/modules/notification';
import { socketService, RealtimePayload } from '@/services/socketService';
import { useAppSelector } from '@/modules/auth/hooks/useAuth';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';

const PAGE_SIZE = 20;

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
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  headerAction: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  headerActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  content: { paddingHorizontal: 16, paddingVertical: 12 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterBtnText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  filterBtnTextActive: { color: '#FFFFFF' },
  itemCard: { marginBottom: 10 },
  itemUnread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  itemTitle: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 },
  itemMessage: { fontSize: 13, color: colors.textLight, marginBottom: 6 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTime: { fontSize: 11, color: colors.textLight },
  deleteBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#FEE2E2' },
  deleteBtnText: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  loadMore: { paddingVertical: 14, alignItems: 'center' },
  loadMoreText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: colors.textLight, textAlign: 'center' },
});

const TYPE_ICONS: Record<string, string> = {
  SUCCESS: '✅',
  WARNING: '⚠️',
  ALERT: '🚨',
  INFO: 'ℹ️',
};

interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsScreen() {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const userId = user?.id;
  const { colors: tc, isDark } = useAppTheme();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [busy, setBusy] = useState(false);

  // Keeps the latest list for socket handlers without re-subscribing.
  const itemsRef = useRef<NotificationItem[]>([]);
  const filterRef = useRef(unreadOnly);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { filterRef.current = unreadOnly; }, [unreadOnly]);

  const dynamicStyles = {
    container: { backgroundColor: tc.background },
    cardBackground: {
      backgroundColor: tc.card,
      borderColor: isDark ? tc.border : 'transparent',
      borderWidth: isDark ? 1 : 0,
    },
    filterBtn: { backgroundColor: tc.card, borderColor: tc.border },
    filterBtnText: { color: tc.text },
    itemTitle: { color: tc.text },
    itemMessage: { color: tc.textSecondary },
    itemTime: { color: tc.textSecondary },
    emptyText: { color: tc.text },
    emptySubtext: { color: tc.textSecondary },
  };

  const refreshUnread = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await notificationsAPI.unreadCount(userId);
      setUnreadCount(res.data?.count ?? 0);
    } catch {
      // Non-critical — badge just won't update.
    }
  }, [userId]);

  const load = useCallback(
    async (opts: { reset?: boolean; silent?: boolean } = {}) => {
      if (!userId) return;
      const { reset = false, silent = false } = opts;
      const offset = reset ? 0 : itemsRef.current.length;
      try {
        const params: Record<string, unknown> = { limit: PAGE_SIZE, offset };
        if (filterRef.current) params.unreadOnly = 'true';
        const res = await notificationsAPI.list(userId, params);
        const page: NotificationItem[] = Array.isArray(res.data) ? res.data : [];
        setItems((prev) => (reset ? page : [...prev, ...page.filter((n) => !prev.some((p) => p.id === n.id))]));
        setHasMore(page.length === PAGE_SIZE);
      } catch (err) {
        if (!silent && __DEV__) console.warn('[NotificationsScreen] load failed', err);
        throw err;
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    setLoading(true);
    setItems([]);
    setHasMore(true);
    load({ reset: true }).catch(() => {});
    refreshUnread();
  }, [load, unreadOnly, refreshUnread]);

  // Realtime updates. Handlers are idempotent so a socket echo of our own
  // REST action never double-counts or duplicates a row.
  useEffect(() => {
    if (!userId) return;

    const applyNew = (payload: any) => {
      const incoming = (payload as NotificationItem) ?? null;
      if (!incoming?.id) return;
      // Ignore other users' events the server may have relayed broadly.
      if (incoming.userId && incoming.userId !== userId) return;
      setItems((prev) => {
        if (prev.some((n) => n.id === incoming.id)) return prev;
        if (filterRef.current && incoming.read) return prev;
        return [incoming, ...prev];
      });
      if (!incoming.read) setUnreadCount((c) => c + 1);
    };

    const applyRead = (payload: any) => {
      const updated = (payload as NotificationItem) ?? null;
      if (!updated?.id) return;
      setItems((prev) =>
        prev.map((n) => (n.id === updated.id ? { ...n, read: true } : n))
      );
      refreshUnread();
    };

    const applyAllRead = () => {
      setItems((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
      setUnreadCount(0);
    };

    const applyDeleted = (payload: RealtimePayload) => {
      const id = (payload as { id?: string })?.id;
      if (!id) return;
      setItems((prev) => prev.filter((n) => n.id !== id));
      refreshUnread();
    };

    const unsubs = [
      socketService.on('notification:new', applyNew as any),
      socketService.on('notification:read', applyRead as any),
      socketService.on('notification:all-read', applyAllRead as any),
      socketService.on('notification:deleted', applyDeleted),
    ];
    return () => unsubs.forEach((u) => u());
  }, [userId, refreshUnread]);

  const onRefresh = () => {
    setRefreshing(true);
    load({ reset: true, silent: true }).catch(() => setRefreshing(false));
    refreshUnread();
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      load().catch(() => setLoadingMore(false));
    }
  };

  const markAsRead = async (item: NotificationItem) => {
    if (item.read) return;
    // Optimistic — the socket echo / REST response converges on read: true.
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await notificationsAPI.markAsRead(item.id);
      refreshUnread();
    } catch (err) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: false } : n)));
      setUnreadCount((c) => c + 1);
      Alert.alert('Error', describeApiError(err, 'Failed to mark as read.'));
    }
  };

  const markAllAsRead = async () => {
    if (!userId || busy) return;
    setBusy(true);
    try {
      await notificationsAPI.markAllAsRead(userId);
      setItems((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      Alert.alert('Error', describeApiError(err, 'Failed to mark all as read.'));
    } finally {
      setBusy(false);
    }
  };

  const removeItem = (item: NotificationItem) => {
    Alert.alert('Delete Notification', 'Delete this notification?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const snapshot = itemsRef.current;
          setItems((prev) => prev.filter((n) => n.id !== item.id));
          try {
            await notificationsAPI.delete(item.id);
            refreshUnread();
          } catch (err) {
            setItems(snapshot);
            Alert.alert('Error', describeApiError(err, 'Failed to delete this notification.'));
          }
        },
      },
    ]);
  };

  const openItem = (item: NotificationItem) => {
    markAsRead(item);
    if (item.link) {
      router.push(item.link as any);
    }
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <Text style={styles.headerTitle}>
          Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.headerAction}
            onPress={markAllAsRead}
            disabled={busy}
            accessibilityLabel="Mark all notifications as read"
          >
            <Text style={styles.headerActionText}>
              {busy ? 'Marking…' : 'Mark all read'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        ListHeaderComponent={
          <View style={styles.filterRow}>
            {(['all', 'unread'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setUnreadOnly(f === 'unread')}
                style={[styles.filterBtn, dynamicStyles.filterBtn, (f === 'unread') === unreadOnly && styles.filterBtnActive]}
                accessibilityLabel={`Filter: ${f}`}
              >
                <Text
                  style={[
                    styles.filterBtnText,
                    dynamicStyles.filterBtnText,
                    (f === 'unread') === unreadOnly && styles.filterBtnTextActive,
                  ]}
                >
                  {f === 'all' ? 'All' : 'Unread'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={[styles.emptyText, dynamicStyles.emptyText]}>
                {unreadOnly ? 'No unread notifications' : 'No notifications yet'}
              </Text>
              <Text style={[styles.emptySubtext, dynamicStyles.emptySubtext]}>
                {unreadOnly
                  ? 'You are all caught up'
                  : 'Task assignments, approvals and messages will appear here'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore && items.length > 0 ? (
            <TouchableOpacity style={styles.loadMore} onPress={loadMore} disabled={loadingMore}>
              <Text style={styles.loadMoreText}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </Text>
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item }) => (
          <Card
            style={[styles.itemCard, dynamicStyles.cardBackground, !item.read && styles.itemUnread]}
            accessibilityLabel={`Notification: ${item.title}`}
          >
            <TouchableOpacity onPress={() => openItem(item)} activeOpacity={0.7}>
              <View style={styles.itemHeader}>
                <View style={styles.itemTitleRow}>
                  {!item.read && <View style={styles.unreadDot} />}
                  <Text style={[styles.itemTitle, dynamicStyles.itemTitle]} numberOfLines={1}>
                    {TYPE_ICONS[item.type] ?? 'ℹ️'} {item.title}
                  </Text>
                </View>
              </View>
              <Text style={[styles.itemMessage, dynamicStyles.itemMessage]} numberOfLines={4}>
                {item.message}
              </Text>
              <View style={styles.itemFooter}>
                <Text style={[styles.itemTime, dynamicStyles.itemTime]}>{formatTime(item.createdAt)}</Text>
                <TouchableOpacity
                  onPress={() => removeItem(item)}
                  style={styles.deleteBtn}
                  accessibilityLabel={`Delete notification: ${item.title}`}
                >
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
