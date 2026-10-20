import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useAuth, useAppSelector } from '@/modules/auth/hooks/useAuth';
import { Card, Button, colors } from '@/core/ui/UIComponents';
import { useAppTheme } from '@/core/theme/ThemeContext';
import {
  ensurePushRegistration,
  unregisterFromNotifications,
  getNotificationPermissions,
  setupNotificationListeners,
  syncBadgeFromServer,
  clearBadge,
  setPushNotificationsEnabled,
  isPushOptedOut,
} from '@/modules/notification';
import { authAPI } from '@/modules/auth';
import { orgAdminAPI } from '@/modules/settings';
import { describeApiError } from '@/core/utils/apiError';

/**
 * Mirror the push choice onto the server's notification preferences so the
 * fan-out side (`NotificationApplicationService.triggerExternalNotifications`)
 * stops sending to a user who turned push off. Purely best-effort: the local
 * opt-out already stops registration, this only keeps the server in step.
 */
async function mirrorPushPreference(enabled: boolean): Promise<void> {
  try {
    await authAPI.updatePreferences({ pushNotifications: enabled });
  } catch {
    // Older servers may not expose /auth/preferences — non-fatal.
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 20 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  backButton: { alignSelf: 'flex-start', marginBottom: 6 },
  backText: { fontSize: 16, color: '#FFFFFF', fontWeight: '500' },
  content: { paddingHorizontal: 20, paddingVertical: 16 },
  profileSection: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#FFFFFF' },
  userName: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 },
  userEmail: { fontSize: 14, color: colors.textLight, marginBottom: 8 },
  userRole: {
    fontSize: 12,
    backgroundColor: colors.light,
    color: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    fontWeight: '500',
    overflow: 'hidden',
  },
  userOrg: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    marginTop: 20,
  },
  settingItem: { marginBottom: 12 },
  settingItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingItemText: { flex: 1 },
  settingItemTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
  settingItemDescription: { fontSize: 12, color: colors.textLight },
  settingItemRight: { flexDirection: 'row', alignItems: 'center' },
  settingItemValue: { fontSize: 12, color: colors.primary, fontWeight: '500', marginRight: 8 },
  divider: { height: 1, backgroundColor: colors.light, marginVertical: 16 },
  offlineQueueBadge: {
    backgroundColor: colors.warning,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  offlineQueueText: { fontSize: 10, color: '#FFFFFF', fontWeight: '700' },
  themeSelector: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  themeOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionContainer: { flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 32 },
  actionButton: { flex: 1 },
});

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { mode, setMode, colors: themeColors } = useAppTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const offlineQueueCount = useAppSelector((s: any) => s.sync?.offlineQueue?.length ?? 0);

  // Role management
  const [roles, setRoles] = useState<any[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [roleSaving, setRoleSaving] = useState(false);

  const canManageRoles = user?.permissions?.includes('organization.manage') ?? false;
  const canManageBilling = user?.permissions?.includes('billing.manage') ?? false;

  useEffect(() => {
    checkNotificationStatus();
    const cleanup = setupNotificationListeners();
    if (canManageRoles) loadRoles();
    return cleanup;
  }, []);

  const loadRoles = async () => {
    setRolesLoading(true);
    try {
      const res = await orgAdminAPI.listRoles();
      setRoles(res.data);
    } catch { /* ignore */ }
    finally { setRolesLoading(false); }
  };

  const openRoleModal = (role?: any) => {
    if (role) {
      setEditingRole(role);
      setRoleName(role.name);
      setRoleDesc(role.description || '');
    } else {
      setEditingRole(null);
      setRoleName('');
      setRoleDesc('');
    }
    setShowRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!roleName.trim()) {
      Alert.alert('Error', 'Role name is required');
      return;
    }
    setRoleSaving(true);
    try {
      if (editingRole) {
        await orgAdminAPI.updateRole(editingRole.id, { name: roleName.trim(), description: roleDesc.trim() || undefined });
        Alert.alert('Success', 'Role updated');
      } else {
        await orgAdminAPI.createRole({ name: roleName.trim(), description: roleDesc.trim() || undefined });
        Alert.alert('Success', 'Role created');
      }
      setShowRoleModal(false);
      await loadRoles();
    } catch (err: any) {
      Alert.alert('Error', describeApiError(err, 'Failed to complete this action.'));
    } finally { setRoleSaving(false); }
  };

  const handleDeleteRole = (role: any) => {
    Alert.alert('Delete Role', `Delete "${role.name}"? Users with this role will need to be reassigned.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await orgAdminAPI.deleteRole(role.id);
            await loadRoles();
          } catch (err: any) {
            Alert.alert('Error', describeApiError(err, 'Failed to complete this action.'));
          }
        },
      },
    ]);
  };

  const checkNotificationStatus = async () => {
    // The switch reflects what the user chose, not just the OS grant: an
    // opt-out keeps OS permission "granted" but push is off.
    const optedOut = await isPushOptedOut().catch(() => false);
    const enabled = optedOut ? false : await getNotificationPermissions();
    setNotificationsEnabled(enabled);
  };

  const handleNotificationsToggle = async (value: boolean) => {
    setLoadingNotifications(true);
    try {
      if (value) {
        // Persist the re-enable BEFORE registering: ensurePushRegistration
        // honors an opt-out, so the flag has to flip first.
        await setPushNotificationsEnabled(true).catch(() => {});
        // Full flow: permission → Expo token → POST /devices/tokens. `force`
        // re-registers even though the persisted opt-out was just cleared.
        const result = await ensurePushRegistration({ force: true });
        await mirrorPushPreference(true);
        if (result.status === 'registered') {
          setNotificationsEnabled(true);
          await syncBadgeFromServer().catch(() => {});
        } else if (result.status === 'denied') {
          Alert.alert(
            'Notifications',
            'Please enable notifications in your device settings to receive farm alerts.'
          );
          setNotificationsEnabled(false);
        } else if (result.status === 'unsupported') {
          Alert.alert(
            'Notifications',
            'Push notifications need a dev-client or production build (Expo Go cannot receive them). In-app and realtime alerts still work.'
          );
          setNotificationsEnabled(false);
        } else if (result.status === 'no-device') {
          Alert.alert(
            'Notifications',
            'Push notifications need a physical device — simulators cannot receive them.'
          );
          setNotificationsEnabled(false);
        } else {
          Alert.alert('Notifications', 'Could not enable push notifications. Please try again.');
          setNotificationsEnabled(false);
        }
      } else {
        // Opt out first so the next authenticated launch does not silently
        // re-register the token and switch push back on.
        await setPushNotificationsEnabled(false).catch(() => {});
        await mirrorPushPreference(false);
        await unregisterFromNotifications();
        await clearBadge();
        setNotificationsEnabled(false);
      }
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Logout',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
        style: 'destructive',
      },
    ]);
  };

  // Inline overrides that keep the screen readable in dark mode; the static
  // StyleSheet values below stay as the light-mode baseline.
  const themed = {
    container: { backgroundColor: themeColors.background },
    text: { color: themeColors.text },
    textSecondary: { color: themeColors.textSecondary },
    divider: { backgroundColor: themeColors.borderLight },
  };

  const getInitials = () => {
    if (!user?.fullName) return '?';
    const parts = user.fullName.split(' ');
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  };

  return (
    <SafeAreaView style={[styles.container, themed.container]}>
      <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
          )}
          <Text style={[styles.userName, themed.text]}>{user?.fullName || 'User'}</Text>
          <Text style={[styles.userEmail, themed.textSecondary]}>{user?.email}</Text>
          <Text style={styles.userRole}>{user?.role || 'Farmer'}</Text>
          {user?.organizationName && (
            <Text style={[styles.userOrg, themed.textSecondary]}>{user.organizationName}</Text>
          )}
        </View>

        <Button
          title="Edit Profile"
          onPress={() => router.push('/settings/edit-profile')}
          variant="secondary"
        />

        <View style={[styles.divider, themed.divider]} />

        <Text style={[styles.sectionTitle, themed.text]}>Account</Text>

        <Card style={styles.settingItem}>
          <TouchableOpacity
            style={styles.settingItemRow}
            onPress={() => Alert.alert(
              'Change Password',
              'Please visit the web dashboard at farmhub.com/settings/security to change your password.',
              [{ text: 'OK' }]
            )}
            accessibilityRole="button"
            accessibilityLabel="Change Password"
          >
            <View style={styles.settingItemText}>
              <Text style={[styles.settingItemTitle, themed.text]}>Change Password</Text>
              <Text style={[styles.settingItemDescription, themed.textSecondary]}>Update your account password</Text>
            </View>
            <Text style={{ fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        </Card>

        <View style={[styles.divider, themed.divider]} />

        {canManageBilling && (
          <>
            <Text style={[styles.sectionTitle, themed.text]}>Billing</Text>
            <Card style={styles.settingItem}>
              <TouchableOpacity
                style={styles.settingItemRow}
                onPress={() => router.push('/subscription')}
                accessibilityRole="button"
                accessibilityLabel="Subscription"
              >
                <View style={styles.settingItemText}>
                  <Text style={[styles.settingItemTitle, themed.text]}>Subscription</Text>
                  <Text style={[styles.settingItemDescription, themed.textSecondary]}>
                    View your plan, usage, and switch plans
                  </Text>
                </View>
                <Text style={{ fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            </Card>
          </>
        )}

        <View style={[styles.divider, themed.divider]} />

        {canManageRoles && (
          <>
            <Text style={[styles.sectionTitle, themed.text]}>Role Management</Text>
            <Card style={styles.settingItem}>
              <View style={styles.settingItemRow}>
                <View style={styles.settingItemText}>
                  <Text style={[styles.settingItemTitle, themed.text]}>Custom Roles</Text>
                  <Text style={[styles.settingItemDescription, themed.textSecondary]}>
                    {rolesLoading ? 'Loading...' : `${roles.length} roles (${roles.filter(r => !r.isSystem).length} custom)`}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => openRoleModal()}>
                  <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>+ New</Text>
                </TouchableOpacity>
              </View>
            </Card>
            {!rolesLoading && roles.filter(r => !r.isSystem).length > 0 && (
              <Card style={styles.settingItem}>
                {roles.filter(r => !r.isSystem).map((role) => (
                  <View key={role.id}>
                    <View style={styles.settingItemRow}>
                      <View style={styles.settingItemText}>
                        <Text style={[styles.settingItemTitle, themed.text]}>{role.name}</Text>
                        <Text style={[styles.settingItemDescription, themed.textSecondary]}>
                          {role._count?.users || 0} users · {role.permissions?.length || 0} permissions
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity onPress={() => openRoleModal(role)}>
                          <Text style={{ color: colors.primary, fontSize: 12 }}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteRole(role)}>
                          <Text style={{ color: colors.error, fontSize: 12 }}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </Card>
            )}
            <View style={[styles.divider, themed.divider]} />
          </>
        )}

        <Text style={[styles.sectionTitle, themed.text]}>Preferences</Text>

        <Card style={styles.settingItem}>
          <View style={styles.settingItemRow}>
            <View style={styles.settingItemText}>
              <Text style={[styles.settingItemTitle, themed.text]}>Push Notifications</Text>
              <Text style={[styles.settingItemDescription, themed.textSecondary]}>Receive farm alerts and updates</Text>
            </View>
            <View style={styles.settingItemRight}>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={notificationsEnabled ? colors.success : colors.light}
                disabled={loadingNotifications}
                accessibilityLabel="Toggle push notifications"
              />
            </View>
          </View>
        </Card>

        <Card style={styles.settingItem}>
          <View style={styles.settingItemRow}>
            <View style={styles.settingItemText}>
              <Text style={[styles.settingItemTitle, themed.text]}>Appearance</Text>
              <Text style={[styles.settingItemDescription, themed.textSecondary]}>
                {mode === 'system' ? 'Match your device setting' : mode === 'dark' ? 'Dark theme' : 'Light theme'}
              </Text>
            </View>
          </View>
          {/* Three-way selector: Light / Dark / System — the switch could only
              express light|dark and silently ignored the persisted 'system'. */}
          <View style={[styles.themeSelector, { backgroundColor: themeColors.inputBg, borderColor: themeColors.borderLight }]}>
            {(
              [
                { value: 'light', label: '☀️ Light', a11y: 'Use light theme' },
                { value: 'dark', label: '🌙 Dark', a11y: 'Use dark theme' },
                { value: 'system', label: '⚙️ System', a11y: 'Match system theme' },
              ] as const
            ).map((option, index) => {
              const selected = mode === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setMode(option.value)}
                  style={[
                    styles.themeOption,
                    index > 0 && { borderLeftWidth: 1, borderLeftColor: themeColors.borderLight },
                    selected && { backgroundColor: themeColors.primary },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={option.a11y}
                >
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: themeColors.text },
                      selected && { color: themeColors.textInverse },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {offlineQueueCount > 0 && (
          <Card style={styles.settingItem}>
            <View style={styles.settingItemRow}>
              <View style={styles.settingItemText}>
                <Text style={[styles.settingItemTitle, themed.text]}>Offline Changes</Text>
                <Text style={[styles.settingItemDescription, themed.textSecondary]}>
                  Pending changes will sync when online
                </Text>
              </View>
              <View style={styles.offlineQueueBadge}>
                <Text style={styles.offlineQueueText}>{offlineQueueCount}</Text>
              </View>
            </View>
          </Card>
        )}

        <View style={[styles.divider, themed.divider]} />

        <Text style={[styles.sectionTitle, themed.text]}>Support</Text>

        <Card style={styles.settingItem}>
          <TouchableOpacity
            style={styles.settingItemRow}
            onPress={() => Alert.alert(
              'Help Center',
              'Visit farmhub.com/help for FAQs, tutorials, and troubleshooting guides.',
              [{ text: 'OK' }]
            )}
            accessibilityRole="button"
            accessibilityLabel="Help Center"
          >
            <View style={styles.settingItemText}>
              <Text style={[styles.settingItemTitle, themed.text]}>Help Center</Text>
              <Text style={[styles.settingItemDescription, themed.textSecondary]}>FAQs and troubleshooting</Text>
            </View>
            <Text style={{ fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.settingItem}>
          <TouchableOpacity
            style={styles.settingItemRow}
            onPress={() => Alert.alert(
              'Contact Support',
              `Email: ${process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@farmmanagement.com'}\nPhone: ${process.env.EXPO_PUBLIC_SUPPORT_PHONE || ''}\n\nOur team is available Mon–Fri, 9 AM – 6 PM.`,
              [{ text: 'Close' }]
            )}
            accessibilityRole="button"
            accessibilityLabel="Contact Support"
          >
            <View style={styles.settingItemText}>
              <Text style={[styles.settingItemTitle, themed.text]}>Contact Support</Text>
              <Text style={[styles.settingItemDescription, themed.textSecondary]}>Send us a message</Text>
            </View>
            <Text style={{ fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.settingItem}>
          <TouchableOpacity
            style={styles.settingItemRow}
            onPress={() => Alert.alert('About', `Farm Management System v${Constants.expoConfig?.version || '1.0.0'}\n\n© 2024 FarmHub. All rights reserved.\n\nBuilt for modern agriculture.`)}
            accessibilityRole="button"
            accessibilityLabel="About Farm Management System"
          >
            <View style={styles.settingItemText}>
              <Text style={[styles.settingItemTitle, themed.text]}>About</Text>
              <Text style={[styles.settingItemDescription, themed.textSecondary]}>App version and credits</Text>
            </View>
            <Text style={styles.settingItemValue}>v{Constants.expoConfig?.version || '1.0.0'}</Text>
            <Text style={{ fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        </Card>

        <View style={[styles.divider, themed.divider]} />

        <View style={styles.actionContainer}>
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="secondary"
            style={styles.actionButton}
          />
        </View>
      </ScrollView>

      <Modal visible={showRoleModal} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: themeColors.overlay }}>
          <View style={{ backgroundColor: themeColors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 16, color: themeColors.text }}>{editingRole ? 'Edit Role' : 'New Role'}</Text>
            <TextInput
              value={roleName}
              onChangeText={setRoleName}
              placeholder="Role name (e.g. Farm Supervisor)"
              placeholderTextColor={themeColors.placeholder}
              style={{ borderWidth: 1, borderColor: themeColors.inputBorder, backgroundColor: themeColors.inputBg, color: themeColors.inputText, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14 }}
            />
            <TextInput
              value={roleDesc}
              onChangeText={setRoleDesc}
              placeholder="Description (optional)"
              placeholderTextColor={themeColors.placeholder}
              style={{ borderWidth: 1, borderColor: themeColors.inputBorder, backgroundColor: themeColors.inputBg, color: themeColors.inputText, borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 14 }}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                title="Cancel"
                onPress={() => setShowRoleModal(false)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title={roleSaving ? 'Saving...' : editingRole ? 'Update' : 'Create'}
                onPress={handleSaveRole}
                disabled={roleSaving}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
