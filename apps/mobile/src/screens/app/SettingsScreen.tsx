import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button, colors } from '../../components/common/UIComponents';
import { useAppTheme } from '../../theme/ThemeContext';
import {
  registerForPushNotifications,
  sendTokenToServer,
  unregisterFromNotifications,
  getNotificationPermissions,
  setupNotificationListeners,
} from '../../services/notifications';
import { useAppSelector } from '../../hooks/useAuth';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 20 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
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
  actionContainer: { flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 32 },
  actionButton: { flex: 1 },
});

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { mode, setMode, isDark } = useAppTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const offlineQueueCount = useAppSelector((s: any) => s.sync?.offlineQueue?.length ?? 0);

  useEffect(() => {
    checkNotificationStatus();
    const cleanup = setupNotificationListeners();
    return cleanup;
  }, []);

  const checkNotificationStatus = async () => {
    const enabled = await getNotificationPermissions();
    setNotificationsEnabled(enabled);
  };

  const handleNotificationsToggle = async (value: boolean) => {
    setLoadingNotifications(true);
    try {
      if (value) {
        const token = await registerForPushNotifications();
        if (token) {
          await sendTokenToServer(token);
          setNotificationsEnabled(true);
        } else {
          Alert.alert(
            'Notifications',
            'Please enable notifications in your device settings to receive farm alerts.'
          );
          setNotificationsEnabled(false);
        }
      } else {
        await unregisterFromNotifications();
        setNotificationsEnabled(false);
      }
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleDarkModeToggle = (value: boolean) => {
    setMode(value ? 'dark' : 'light');
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

  const getInitials = () => {
    if (!user?.fullName) return '?';
    const parts = user.fullName.split(' ');
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
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
          <Text style={styles.userName}>{user?.fullName || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.userRole}>{user?.role || 'Farmer'}</Text>
        </View>

        <Button
          title="Edit Profile"
          onPress={() => router.push('/settings/edit-profile')}
          variant="secondary"
        />

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Account</Text>

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
              <Text style={styles.settingItemTitle}>Change Password</Text>
              <Text style={styles.settingItemDescription}>Update your account password</Text>
            </View>
            <Text style={{ fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        </Card>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Preferences</Text>

        <Card style={styles.settingItem}>
          <View style={styles.settingItemRow}>
            <View style={styles.settingItemText}>
              <Text style={styles.settingItemTitle}>Push Notifications</Text>
              <Text style={styles.settingItemDescription}>Receive farm alerts and updates</Text>
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
              <Text style={styles.settingItemTitle}>Dark Mode</Text>
              <Text style={styles.settingItemDescription}>Switch between light and dark themes</Text>
            </View>
            <View style={styles.settingItemRight}>
              <Switch
                value={isDark}
                onValueChange={handleDarkModeToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={isDark ? colors.success : colors.light}
                accessibilityLabel="Toggle dark mode"
              />
            </View>
          </View>
        </Card>

        {offlineQueueCount > 0 && (
          <Card style={styles.settingItem}>
            <View style={styles.settingItemRow}>
              <View style={styles.settingItemText}>
                <Text style={styles.settingItemTitle}>Offline Changes</Text>
                <Text style={styles.settingItemDescription}>
                  Pending changes will sync when online
                </Text>
              </View>
              <View style={styles.offlineQueueBadge}>
                <Text style={styles.offlineQueueText}>{offlineQueueCount}</Text>
              </View>
            </View>
          </Card>
        )}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Support</Text>

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
              <Text style={styles.settingItemTitle}>Help Center</Text>
              <Text style={styles.settingItemDescription}>FAQs and troubleshooting</Text>
            </View>
            <Text style={{ fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.settingItem}>
          <TouchableOpacity
            style={styles.settingItemRow}
            onPress={() => Alert.alert(
              'Contact Support',
              'Email: support@farmhub.com\nPhone: +1 (555) 123-4567\n\nOur team is available Mon–Fri, 9 AM – 6 PM.',
              [{ text: 'Close' }]
            )}
            accessibilityRole="button"
            accessibilityLabel="Contact Support"
          >
            <View style={styles.settingItemText}>
              <Text style={styles.settingItemTitle}>Contact Support</Text>
              <Text style={styles.settingItemDescription}>Send us a message</Text>
            </View>
            <Text style={{ fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.settingItem}>
          <TouchableOpacity
            style={styles.settingItemRow}
            onPress={() => Alert.alert('About', 'Farm Management System v1.0.0\n\n© 2024 FarmHub. All rights reserved.\n\nBuilt for modern agriculture.')}
            accessibilityRole="button"
            accessibilityLabel="About Farm Management System"
          >
            <View style={styles.settingItemText}>
              <Text style={styles.settingItemTitle}>About</Text>
              <Text style={styles.settingItemDescription}>App version and credits</Text>
            </View>
            <Text style={styles.settingItemValue}>v1.0.0</Text>
            <Text style={{ fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        </Card>

        <View style={styles.divider} />

        <View style={styles.actionContainer}>
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="secondary"
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}