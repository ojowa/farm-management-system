import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { orgAdminAPI } from '@/modules/settings';
import type { User } from '@/modules/settings';
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
  userCard: { marginBottom: 12 },
  userRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userInfo: { flex: 1, paddingRight: 8 },
  userName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  userEmail: { fontSize: 13, color: colors.textLight },
  roleBadge: {
    backgroundColor: colors.light,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalActionButton: { flex: 1 },
});

function unwrapList<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

const displayName = (u: User) => u.fullName || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || 'User';

// GET /org-admin/users serialises Prisma's `select: { role: true }`, so `role`
// arrives as the related Role object ({ id, name }) or null — unlike the
// session user's role, which is a plain string. Rendering the object inside
// <Text> crashes, so normalise to its name here (the admin portal reads
// user.role?.name for the same reason).
const roleLabel = (role: unknown): string =>
  typeof role === 'string' ? role : ((role as any)?.name ?? '');

interface InviteForm {
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
}

export default function UsersScreen() {
  const router = useRouter();
  const { success, error: showError } = useToasts();
  const { hasPermission } = usePermission();
  const { colors: tc, isDark } = useAppTheme();

  const dynamicStyles = {
    container: {
      backgroundColor: tc.background,
    },
    emptyText: {
      color: tc.text,
    },
    emptySubtext: {
      color: tc.textSecondary,
    },
    cardBackground: {
      backgroundColor: tc.card,
      borderColor: isDark ? tc.border : 'transparent',
      borderWidth: isDark ? 1 : 0,
    },
    userName: {
      color: tc.text,
    },
    userEmail: {
      color: tc.textSecondary,
    },
    roleBadge: {
      backgroundColor: isDark ? tc.surface : '#F5F5F5',
    },
    divider: {
      borderTopColor: isDark ? tc.border : colors.light,
    },
  };

  // Server: POST/PUT/DELETE /org-admin/users require users.manage; reads use
  // users.read. Missing permissions default to hidden — the API would 403.
  const canManage = hasPermission('users.manage');

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState<InviteForm>({ firstName: '', lastName: '', email: '', roleId: '' });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof InviteForm, string>>>({});

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    try {
      setLoadError(null);
      const response = await orgAdminAPI.listUsers();
      setUsers(unwrapList<User>(response.data));
    } catch (error: any) {
      setLoadError(describeApiError(error, "Couldn't load your team."));
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await orgAdminAPI.listRoles();
      setRoles(unwrapList<any>(response.data));
    } catch {
      /* invite falls back to no role preselect */
    }
  };

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((u) =>
      `${displayName(u)} ${u.email} ${roleLabel(u.role)}`.toLowerCase().includes(query)
    );
  }, [users, search]);

  const validateInvite = (): boolean => {
    const errors: Partial<Record<keyof InviteForm, string>> = {};
    if (!form.firstName.trim()) errors.firstName = 'First name is required';
    if (!form.lastName.trim()) errors.lastName = 'Last name is required';
    if (!form.email.trim()) errors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email address';
    // POST /org-admin/users requires roleId — User.roleId is non-nullable and
    // S4 made the server reject invites that omit it.
    if (!form.roleId) errors.roleId = 'Select a role for the new user';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitInvite = async () => {
    if (!validateInvite()) return;
    setInviting(true);
    try {
      await orgAdminAPI.inviteUser({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        roleId: form.roleId || undefined,
      });
      success('Invitation sent successfully');
      setInviteOpen(false);
      setForm({ firstName: '', lastName: '', email: '', roleId: '' });
      loadUsers();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to invite user. Please try again.'));
    } finally {
      setInviting(false);
    }
  };

  const removeUser = useCallback(
    (user: User) => {
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
                loadUsers();
              } catch (error: any) {
                showError(describeApiError(error, 'Failed to remove user.'));
              }
            },
          },
        ]
      );
    },
    [success, showError]
  );

  const updateForm = (field: keyof InviteForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const renderItem = useCallback(
    ({ item }: { item: User }) => (
      <Card style={[styles.userCard, dynamicStyles.cardBackground]}>
        <TouchableOpacity onPress={() => router.push(`/users/${item.id}`)} activeOpacity={0.7}>
          <View style={styles.userRow}>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, dynamicStyles.userName]}>{displayName(item)}</Text>
              <Text style={[styles.userEmail, dynamicStyles.userEmail]}>{item.email}</Text>
            </View>
            <View style={[styles.roleBadge, dynamicStyles.roleBadge]}>
              <Text style={styles.roleBadgeText}>{roleLabel(item.role) || 'Member'}</Text>
            </View>
          </View>
        </TouchableOpacity>
        {canManage && (
          <View style={[{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, flexDirection: 'row', gap: 8 }, dynamicStyles.divider]}>
            <Button
              title="View"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => router.push(`/users/${item.id}`)}
              accessibilityLabel={`View ${displayName(item)}`}
            />
            <Button
              title="Remove"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => removeUser(item)}
              accessibilityLabel={`Remove ${displayName(item)}`}
            />
          </View>
        )}
      </Card>
    ),
    [router, canManage, removeUser, dynamicStyles]
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <MenuButton />
          <Text style={styles.headerTitle}>Users</Text>
        </View>
        <ScreenLoading message="Loading users…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
          <MenuButton />
          <Text style={styles.headerTitle}>Users</Text>
        </View>
        <StateView
          variant="error"
          title="Couldn't load users"
          message={loadError}
          onRetry={loadUsers}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <MenuButton />
        <Text style={styles.headerTitle}>Users</Text>
        {canManage && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setInviteOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Invite new user"
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <TextInputField
          placeholder="Search users…"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          containerStyle={{ marginBottom: 4 }}
          accessibilityLabel="Search users"
        />
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No Users Found</Text>
            <Text style={[styles.emptySubtext, dynamicStyles.emptySubtext]}>
              {search ? 'No users match your search' : 'Invite teammates to collaborate on your farms'}
            </Text>
            {!search && canManage && (
              <Button
                title="Invite User"
                onPress={() => setInviteOpen(true)}
                accessibilityLabel="Invite your first user"
              />
            )}
          </View>
        }
      />

      <Modal visible={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite User">
        <TextInputField
          label="First Name *"
          placeholder="e.g. Jane"
          value={form.firstName}
          onChangeText={(v) => updateForm('firstName', v)}
          error={formErrors.firstName}
        />
        <TextInputField
          label="Last Name *"
          placeholder="e.g. Doe"
          value={form.lastName}
          onChangeText={(v) => updateForm('lastName', v)}
          error={formErrors.lastName}
        />
        <TextInputField
          label="Email *"
          placeholder="jane@example.com"
          value={form.email}
          onChangeText={(v) => updateForm('email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
          error={formErrors.email}
        />
        {roles.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            {roles.slice(0, 6).map((role) => {
              const selected = form.roleId === role.id;
              return (
                <TouchableOpacity
                  key={role.id}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : tc.border,
                    backgroundColor: selected ? (isDark ? tc.surface : '#F5F5F5') : tc.card,
                    marginBottom: 8,
                  }}
                  onPress={() => updateForm('roleId', selected ? '' : role.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Role ${role.name}`}
                  accessibilityState={{ selected }}
                >
                  <Text style={{ fontSize: 14, color: tc.text, fontWeight: selected ? '600' : '400' }}>
                    {role.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {formErrors.roleId && (
          <Text style={{ color: colors.error, fontSize: 12, marginBottom: 8 }}>
            {formErrors.roleId}
          </Text>
        )}
        <View style={styles.modalActions}>
          <Button
            title="Cancel"
            variant="secondary"
            style={styles.modalActionButton}
            onPress={() => setInviteOpen(false)}
          />
          <Button
            title="Send Invite"
            style={styles.modalActionButton}
            loading={inviting}
            disabled={inviting}
            onPress={submitInvite}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
