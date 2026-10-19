import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { orgAdminAPI } from '@/modules/settings';
import type { User } from '@/modules/settings';
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
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: colors.primary },
  userName: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 },
  userRole: { fontSize: 14, color: colors.primary, fontWeight: '600', marginBottom: 8 },
  detailSection: { marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.light },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  detailValue: { fontSize: 14, color: colors.text, flexShrink: 1, textAlign: 'right' },
  actions: { marginTop: 20, gap: 12 },
});

function unwrapList<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

const displayName = (u: User) =>
  u.fullName || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || 'User';

const initials = (u: User) =>
  `${(u.firstName ?? '').charAt(0)}${(u.lastName ?? '').charAt(0)}`.toUpperCase() ||
  (u.email ?? '?').charAt(0).toUpperCase();

export default function UserDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const { hasPermission } = usePermission();

  const canManage = hasPermission('users.manage');

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
  }, [id]);

  // There is no GET /org-admin/users/:id — the org's user list is small, so we
  // fetch it and pick this user out (404 shows as the "not found" state below).
  const loadUser = async () => {
    try {
      setLoadError(null);
      const response = await orgAdminAPI.listUsers();
      const found = unwrapList<User>(response.data).find((u) => u.id === id) ?? null;
      if (!found) {
        setLoadError('This user no longer exists in your organization.');
        return;
      }
      setUser(found);
    } catch (error: any) {
      setLoadError(describeApiError(error, "Couldn't load this user."));
    } finally {
      setLoading(false);
    }
  };

  const removeUser = useCallback(() => {
    if (!user) return;
    Alert.alert(
      'Remove User',
      `Remove ${displayName(user)} from this organization? They will lose access immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await orgAdminAPI.removeUser(user.id);
              success('User removed');
              router.back();
            } catch (error: any) {
              showError(describeApiError(error, 'Failed to remove user.'));
            }
          },
        },
      ]
    );
  }, [user, success, showError, router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScreenLoading message="Loading user…" />
      </SafeAreaView>
    );
  }

  if (loadError || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load this user"
          message={loadError || 'User not found.'}
          onRetry={loadUser}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(user)}</Text>
          </View>
          <Text style={styles.userName}>{displayName(user)}</Text>
          <Text style={styles.userRole}>{user.role || 'Member'}</Text>

          <View style={styles.detailSection}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{user.email || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{user.phone || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Role</Text>
              <Text style={styles.detailValue}>{user.role || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Platform Admin</Text>
              <Text style={styles.detailValue}>{user.isPlatformAdmin ? 'Yes' : 'No'}</Text>
            </View>
          </View>
        </View>

        {canManage && (
          <View style={styles.actions}>
            <Button
              title="Remove User"
              variant="secondary"
              onPress={removeUser}
              accessibilityLabel="Remove this user"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
