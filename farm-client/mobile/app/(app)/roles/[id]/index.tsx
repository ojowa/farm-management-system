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
import { useAppTheme } from '@/core/theme/ThemeContext';

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
  permChipSelected: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  permChipText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  emptyPerms: { fontSize: 14, color: colors.textLight, fontStyle: 'italic' },
  categoryHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 4,
  },
  editActions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  actions: { marginTop: 20, gap: 12 },
});

interface Role {
  id: string;
  name: string;
  description?: string;
  organizationId?: string | null;
  permissions?: any[];
  permissionIds?: string[];
}

function unwrapOne<T>(payload: any): T | null {
  if (payload?.id) return payload as T;
  if (payload?.data?.id) return payload.data as T;
  return null;
}

/** A permission may arrive as a plain string, a RolePermission row, or an expanded object. */
const permLabel = (p: any): string => {
  if (typeof p === 'string') return p;
  // RolePermission row: { permissionId, permission: { id, name, ... } }.
  if (p?.permission && typeof p.permission === 'object') {
    return p.permission.name || p.permissionId || '';
  }
  return p?.name || p?.key || String(p?.permissionId ?? p?.id ?? '');
};

export default function RoleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const { hasPermission } = usePermission();
  const { colors: tc, isDark } = useAppTheme();

  const canManage = hasPermission('organization.manage');

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Permission editor (POST /roles/:id/permissions — org custom roles only).
  const [editingPerms, setEditingPerms] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [catalog, setCatalog] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);

  const dynamicStyles = {
    container: { backgroundColor: tc.background },
    cardSurface: {
      backgroundColor: tc.card,
      borderColor: isDark ? tc.border : 'transparent',
      borderWidth: isDark ? 1 : 0,
    },
    roleName: { color: tc.text },
    roleDescription: { color: tc.textSecondary },
    sectionTitle: { color: tc.textSecondary },
    permChip: { backgroundColor: isDark ? tc.surface : '#F5F5F5' },
    permChipText: { color: tc.text },
    emptyPerms: { color: tc.textSecondary },
  };

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

  // Pre-check the role's current permissions and open the editor, loading the
  // org's catalog (GET /permissions already excludes platform permissions).
  const openPermEditor = async () => {
    if (!role) return;
    const current = (role.permissions ?? [])
      .map((p: any) => p?.permission?.id || p?.permissionId)
      .filter(Boolean);
    setSelected(new Set(current));
    setEditingPerms(true);
    if (catalog.length) return;
    setCatalogLoading(true);
    try {
      const response = await orgAdminAPI.listPermissions();
      const payload: any = response.data;
      const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
      setCatalog(rows.filter((p: any) => p && typeof p.id === 'string'));
    } catch (error: any) {
      showError(describeApiError(error, "Couldn't load the permission catalog."));
      setEditingPerms(false);
    } finally {
      setCatalogLoading(false);
    }
  };

  const togglePermission = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const savePermissions = async () => {
    if (!role) return;
    setSavingPerms(true);
    try {
      await orgAdminAPI.setPermissions(role.id, Array.from(selected));
      success('Permissions updated');
      setEditingPerms(false);
      await loadRole();
    } catch (error: any) {
      // Server explains the rule (system role, platform permission, ...).
      showError(describeApiError(error, 'Failed to update permissions.'));
    } finally {
      setSavingPerms(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
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
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
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
  // Only the org's OWN custom roles are editable — server rejects system roles.
  const isCustomRole = !!role.organizationId;
  const canEditPerms = canManage && isCustomRole;

  // Catalog grouped by category for the edit view.
  const groupedCatalog: Array<[string, any[]]> = [];
  {
    const byCategory: Record<string, any[]> = {};
    for (const perm of catalog) {
      const category = perm.category || 'General';
      if (!byCategory[category]) byCategory[category] = [];
      byCategory[category].push(perm);
    }
    for (const entry of Object.entries(byCategory)) groupedCatalog.push(entry);
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Role Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, dynamicStyles.cardSurface]}>
          <Text style={[styles.roleName, dynamicStyles.roleName]}>{role.name}</Text>
          {!!role.description && <Text style={[styles.roleDescription, dynamicStyles.roleDescription]}>{role.description}</Text>}

          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>
            {editingPerms
              ? `Edit permissions (${selected.size} of ${catalog.length})`
              : `Permissions (${permissions.length || role.permissionIds?.length || 0})`}
          </Text>

          {editingPerms ? (
            <View>
              {catalogLoading ? (
                <Text style={[styles.emptyPerms, dynamicStyles.emptyPerms]}>Loading permission catalog…</Text>
              ) : groupedCatalog.length === 0 ? (
                <Text style={[styles.emptyPerms, dynamicStyles.emptyPerms]}>No permissions available.</Text>
              ) : (
                groupedCatalog.map(([category, perms]) => (
                  <View key={category}>
                    <Text style={[styles.categoryHeader, dynamicStyles.sectionTitle]}>{category}</Text>
                    {perms.map((perm: any) => {
                      const checked = selected.has(perm.id);
                      return (
                        <TouchableOpacity
                          key={perm.id}
                          style={[styles.permChip, dynamicStyles.permChip, checked && styles.permChipSelected]}
                          onPress={() => togglePermission(perm.id)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked }}
                          accessibilityLabel={perm.name}
                        >
                          <Text style={[styles.permChipText, dynamicStyles.permChipText]}>
                            {checked ? '✓ ' : '○ '}
                            {perm.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))
              )}
              <View style={styles.editActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() => setEditingPerms(false)}
                  accessibilityLabel="Cancel permission editing"
                />
                <Button
                  title="Save"
                  style={{ flex: 1 }}
                  loading={savingPerms}
                  onPress={savePermissions}
                  accessibilityLabel="Save role permissions"
                />
              </View>
            </View>
          ) : permissions.length > 0 ? (
            permissions.map((p, index) => (
              <View key={p?.permission?.id ?? p?.permissionId ?? index} style={[styles.permChip, dynamicStyles.permChip]}>
                <Text style={[styles.permChipText, dynamicStyles.permChipText]}>{permLabel(p)}</Text>
              </View>
            ))
          ) : role.permissionIds && role.permissionIds.length > 0 ? (
            role.permissionIds.map((pid) => (
              <View key={pid} style={[styles.permChip, dynamicStyles.permChip]}>
                <Text style={[styles.permChipText, dynamicStyles.permChipText]}>{pid}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyPerms, dynamicStyles.emptyPerms]}>No permissions attached to this role.</Text>
          )}
        </View>

        {canManage && !editingPerms && (
          <View style={styles.actions}>
            {canEditPerms && (
              <Button
                title="Edit permissions"
                onPress={openPermEditor}
                accessibilityLabel="Edit role permissions"
              />
            )}
            <Button
              title="Delete Role"
              variant="secondary"
              onPress={deleteRole}
              accessibilityLabel="Delete this role"
            />
          </View>
        )}
        {canManage && !editingPerms && !isCustomRole && (
          <Text style={[styles.emptyPerms, dynamicStyles.emptyPerms, { marginTop: 12 }]}>
            System role — permissions are managed by the platform.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
