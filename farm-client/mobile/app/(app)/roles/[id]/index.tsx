import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { orgAdminAPI } from '@/modules/settings';
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
  roleName: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 },
  roleDescription: { fontSize: 14, color: colors.textLight, marginBottom: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8,
  },
  permChip: {
    backgroundColor: colors.light,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  permChipText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  emptyPerms: { fontSize: 14, color: colors.textLight, fontStyle: 'italic' },
  actions: { marginTop: 20, gap: 12 },
});

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: any[];
  permissionIds?: string[];
}

function unwrapOne<T>(payload: any): T | null {
  if (payload?.id) return payload as T;
  if (payload?.data?.id) return payload.data as T;
  return null;
}

/** A permission may arrive as a plain string or an expanded object. */
const permLabel = (p: any): string =>
  typeof p === 'string' ? p : p?.name || p?.permission || p?.key || String(p?.id ?? '');

export default function RoleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const { hasPermission } = usePermission();

  const canManage = hasPermission('organization.manage');

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadRole();
  }, [id]);

  const loadRole = async () => {
    if (!id) {
      setLoadError('Missing role id.');
      setLoading(false);
      return;
    }
    try {
      setLoadError(null);
      const response = await orgAdminAPI.getRole(id);
      const record = unwrapOne<Role>(response.data);
      if (!record) {
        setLoadError('Role not found.');
        return;
      }
      setRole(record);
    } catch (error: any) {
      setLoadError(describeApiError(error, "Couldn't load this role."));
    } finally {
      setLoading(false);
    }
  };

  const deleteRole = useCallback(() => {
    if (!role) return;
    Alert.alert(
      'Delete Role',
      `Delete the "${role.name}" role? Users assigned to it will keep their other roles.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await orgAdminAPI.deleteRole(role.id);
              success('Role deleted');
              router.back();
            } catch (error: any) {
              showError(describeApiError(error, 'Failed to delete role.'));
            }
          },
        },
      ]
    );
  }, [role, success, showError, router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Role Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScreenLoading message="Loading role…" />
      </SafeAreaView>
    );
  }

  if (loadError || !role) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Role Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load this role"
          message={loadError || 'Role not found.'}
          onRetry={loadRole}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  const permissions: any[] = role.permissions ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Role Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.roleName}>{role.name}</Text>
          {!!role.description && <Text style={styles.roleDescription}>{role.description}</Text>}

          <Text style={styles.sectionTitle}>
            Permissions ({permissions.length || role.permissionIds?.length || 0})
          </Text>
          {permissions.length > 0 ? (
            permissions.map((p, index) => (
              <View key={p?.id ?? index} style={styles.permChip}>
                <Text style={styles.permChipText}>{permLabel(p)}</Text>
              </View>
            ))
          ) : role.permissionIds && role.permissionIds.length > 0 ? (
            role.permissionIds.map((pid) => (
              <View key={pid} style={styles.permChip}>
                <Text style={styles.permChipText}>{pid}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyPerms}>No permissions attached to this role.</Text>
          )}
        </View>

        {canManage && (
          <View style={styles.actions}>
            <Button
              title="Delete Role"
              variant="secondary"
              onPress={deleteRole}
              accessibilityLabel="Delete this role"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
