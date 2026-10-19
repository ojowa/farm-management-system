import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { orgAdminAPI } from '@/modules/settings';
import { Card, Button, TextInputField, Modal, colors } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
import { MenuButton } from '@/core/ui/MenuButton';
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
  roleCard: { marginBottom: 12 },
  roleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roleInfo: { flex: 1, paddingRight: 8 },
  roleName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  roleDescription: { fontSize: 13, color: colors.textLight },
  permBadge: {
    backgroundColor: colors.light,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  permBadgeText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalActionButton: { flex: 1 },
});

/** The org-admin roles endpoint is untyped in the client; model the shape the
 * server returns (role + its permissions when expanded). */
interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: any[];
  permissionIds?: string[];
}

function unwrapList<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

const permCount = (role: Role) => role.permissions?.length ?? role.permissionIds?.length ?? 0;

export default function RolesScreen() {
  const router = useRouter();
  const { success, error: showError } = useToasts();
  const { hasPermission } = usePermission();
  const { colors: tc, isDark } = useAppTheme();

  // Server: POST/PUT/DELETE /org-admin/roles require organization.manage;
  // reads use organization.read (the sidebar gates on role.read OR
  // organization.read, exactly like admin).
  const canManage = hasPermission('organization.manage');

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();

  const dynamicStyles = {
    container: { backgroundColor: tc.background },
    cardBackground: {
      backgroundColor: tc.card,
      borderColor: isDark ? tc.border : 'transparent',
      borderWidth: isDark ? 1 : 0,
    },
    emptyText: { color: tc.text },
    emptySubtext: { color: tc.textSecondary },
    roleName: { color: tc.text },
    roleDescription: { color: tc.textSecondary },
    permBadge: { backgroundColor: isDark ? tc.surface : '#F5F5F5' },
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoadError(null);
      const response = await orgAdminAPI.listRoles();
      setRoles(unwrapList<Role>(response.data));
    } catch (error: any) {
      setLoadError(describeApiError(error, "Couldn't load roles."));
    } finally {
      setLoading(false);
    }
  };

  const filteredRoles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return roles;
    return roles.filter((r) => `${r.name} ${r.description ?? ''}`.toLowerCase().includes(query));
  }, [roles, search]);

  const submitCreate = async () => {
    if (!name.trim()) {
      setNameError('Role name is required');
      return;
    }
    setCreating(true);
    try {
      await orgAdminAPI.createRole({ name: name.trim(), description: description.trim() || undefined });
      success('Role created successfully');
      setCreateOpen(false);
      setName('');
      setDescription('');
      loadRoles();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to create role. Please try again.'));
    } finally {
      setCreating(false);
    }
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setNameError(undefined);
  };

  const renderItem = useCallback(
    ({ item }: { item: Role }) => (
      <Card style={[styles.roleCard, dynamicStyles.cardBackground]}>
        <TouchableOpacity onPress={() => router.push(`/roles/${item.id}`)} activeOpacity={0.7}>
          <View style={styles.roleRow}>
            <View style={styles.roleInfo}>
              <Text style={[styles.roleName, dynamicStyles.roleName]}>{item.name}</Text>
              {!!item.description && <Text style={[styles.roleDescription, dynamicStyles.roleDescription]}>{item.description}</Text>}
            </View>
            <View style={[styles.permBadge, dynamicStyles.permBadge]}>
              <Text style={styles.permBadgeText}>{permCount(item)} perms</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Card>
    ),
    [router, dynamicStyles]
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <MenuButton />
          <Text style={styles.headerTitle}>Roles</Text>
        </View>
        <ScreenLoading message="Loading roles…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <MenuButton />
          <Text style={styles.headerTitle}>Roles</Text>
        </View>
        <StateView
          variant="error"
          title="Couldn't load roles"
          message={loadError}
          onRetry={loadRoles}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <MenuButton />
        <Text style={styles.headerTitle}>Roles</Text>
        {canManage && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setCreateOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Create new role"
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <TextInputField
          placeholder="Search roles…"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          containerStyle={{ marginBottom: 4 }}
          accessibilityLabel="Search roles"
        />
      </View>

      <FlatList
        data={filteredRoles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No Roles Found</Text>
            <Text style={[styles.emptySubtext, dynamicStyles.emptySubtext]}>
              {search ? 'No roles match your search' : 'Create a role to define what your team can do'}
            </Text>
            {!search && canManage && (
              <Button
                title="Create Role"
                onPress={() => setCreateOpen(true)}
                accessibilityLabel="Create your first role"
              />
            )}
          </View>
        }
      />

      <Modal visible={createOpen} onClose={closeCreate} title="Create Role">
        <TextInputField
          label="Role Name *"
          placeholder="e.g. Farm Supervisor"
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (nameError) setNameError(undefined);
          }}
          error={nameError}
        />
        <TextInputField
          label="Description"
          placeholder="What this role is for"
          value={description}
          onChangeText={setDescription}
        />
        <View style={styles.modalActions}>
          <Button title="Cancel" variant="secondary" style={styles.modalActionButton} onPress={closeCreate} />
          <Button
            title="Create Role"
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
