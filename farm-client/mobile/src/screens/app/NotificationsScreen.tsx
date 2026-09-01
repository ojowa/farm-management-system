import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, colors } from '../../components/common/UIComponents';
import { notificationsAPI } from '../../services/api';
import { useAppSelector } from '../../hooks/useAuth';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  INFO: 'ℹ️',
  WARNING: '⚠️',
  ALERT: '🚨',
  SUCCESS: '✅',
};

const TYPE_COLORS: Record<string, string> = {
  INFO: '#3B82F6',
  WARNING: '#F59E0B',
  ALERT: '#EF4444',
  SUCCESS: '#10B981',
};

export default function NotificationsScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setError(null);
      const [listRes, countRes] = await Promise.all([
        notificationsAPI.list(user.id, { limit: 50 }),
        notificationsAPI.unreadCount(user.id),
      ]);
      setNotifications(listRes.data || []);
      setUnreadCount(countRes.data.count || 0);
    } catch {
      setError('Failed to load notifications. Pull to retry.');
    }
    finally { setLoading(false); setRefreshing(false); }
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      await notificationsAPI.markAllAsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          Notifications {unreadCount > 0 && <Text style={styles.count}>({unreadCount})</Text>}
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} accessibilityLabel="Mark all notifications as read">
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : notifications.length === 0 ? (
        <Card>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        </Card>
      ) : (
        notifications.map((n) => (
          <TouchableOpacity key={n.id} onPress={() => !n.isRead && handleMarkAsRead(n.id)}>
            <Card style={!n.isRead ? { ...styles.notifCard, ...styles.unreadCard } : styles.notifCard}>
              <View style={styles.notifRow}>
                <Text style={styles.notifIcon}>{TYPE_ICONS[n.type] || '📌'}</Text>
                <View style={styles.notifContent}>
                  <Text style={[styles.notifTitle, !n.isRead && styles.unreadTitle]} numberOfLines={1}>
                    {n.title}
                  </Text>
                  <Text style={styles.notifMessage} numberOfLines={2}>{n.message}</Text>
                  <Text style={styles.notifTime}>{formatDate(n.createdAt)}</Text>
                </View>
                {!n.isRead && <View style={styles.unreadDot} />}
              </View>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  count: { fontSize: 14, color: '#6B7280', fontWeight: 'normal' },
  markAll: { fontSize: 13, color: '#10B981', fontWeight: '600' },
  errorText: { fontSize: 14, color: '#EF4444', textAlign: 'center', marginBottom: 12 },
  loadingText: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: '#9CA3AF' },
  notifCard: { marginBottom: 8 },
  unreadCard: { borderLeftWidth: 3, borderLeftColor: '#10B981' },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  notifIcon: { fontSize: 20, marginTop: 2 },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, color: '#6B7280' },
  unreadTitle: { fontWeight: '700', color: '#111827' },
  notifMessage: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  notifTime: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginTop: 6 },
});
