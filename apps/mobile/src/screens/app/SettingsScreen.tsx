import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button, colors } from '../../components/common/UIComponents';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 8,
  },
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
  settingItem: {
    marginBottom: 12,
  },
  settingItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingItemText: {
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  settingItemDescription: {
    fontSize: 12,
    color: colors.textLight,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingItemValue: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginRight: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.light,
    marginVertical: 16,
  },
  dangerButton: {
    borderColor: colors.error,
    marginTop: 24,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
  },
});

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Logout',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'Redirecting to password change...',
      [{ text: 'OK', onPress: () => router.push('/settings/change-password') }]
    );
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
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <Text style={styles.userName}>{user?.fullName || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.userRole}>
            {user?.role || 'Farmer'}
          </Text>
        </View>

        <Button
          title="Edit Profile"
          onPress={() => router.push('/settings/edit-profile')}
          variant="secondary"
        />

        <View style={styles.divider} />

        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>

        <Card style={styles.settingItem}>
          <TouchableOpacity
            style={styles.settingItemRow}
            onPress={handleChangePassword}
          >
            <View style={styles.settingItemText}>
              <Text style={styles.settingItemTitle}>Change Password</Text>
              <Text style={styles.settingItemDescription}>
                Update your account password
              </Text>
            </View>
            <Text style={{ fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.settingItem}>
          <TouchableOpacity
            style={styles.settingItemRow}
            onPress={() => router.push('/settings/security')}
          >
            <View style={styles.settingItemText}>
              <Text style={styles.settingItemTitle}>Security & Privacy</Text>
              <Text style={styles.settingItemDescription}>
                Manage your security settings
              </Text>
            </View>
            <Text style={{ fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        </Card>

        <View style={styles.divider} />

        {/* Preferences Section */}
        <Text style={styles.sectionTitle}>Preferences</Text>

        <Card style={styles.settingItem}>
          <View style={styles.settingItemRow}>
            <View style={styles.settingItemText}>
              <Text style={styles.settingItemTitle}>Push Notifications</Text>
              <Text style={styles.settingItemDescription}>
                Receive farm alerts and updates
              </Text>
            </View>
            <View style={styles.settingItemRight}>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={notifications ? colors.success : colors.light}
              />
            </View>
          </View>
        </Card>

        <Card style={styles.settingItem}>
          <View style={styles.settingItemRow}>
            <View style={styles.settingItemText}>
              <Text style={styles.settingItemTitle}>Dark Mode</Text>
              <Text style={styles.settingItemDescription}>
                Use dark theme (coming soon)
              </Text>
            </View>
            <View style={styles.settingItemRight}>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={darkMode ? colors.success : colors.light}
                disabled
              />
            </View>
          </View>
        </Card>

        <Card style={styles.settingItem}>
          <View style={styles.settingItemRow}>
            <View style={styles.settingItemText}>
              <Text style={styles.settingItemTitle}>Offline Mode</Text>
              <Text style={styles.settingItemDescription}>
                Sync data when online
              </Text>
            </View>
            <View style={styles.settingItemRight}>
              <Switch
                value={offlineMode}
                onValueChange={setOfflineMode}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={offlineMode ? colors.success : colors.light}
              />
            </View>
          </View>
        </Card>

        <View style={styles.divider} />

        {/* Support Section */}
        <Text style={styles.sectionTitle}>Support</Text>

        <Card style={styles.settingItem}>
          <TouchableOpacity
            style={styles.settingItemRow}
            onPress={() => Alert.alert('Help', 'Opening help center...')}
          >
            <View style={styles.settingItemText}>
              <Text style={styles.settingItemTitle}>Help Center</Text>
              <Text style={styles.settingItemDescription}>
                FAQs and troubleshooting
              </Text>
            </View>
            <Text style={{ fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.settingItem}>
          <TouchableOpacity
            style={styles.settingItemRow}
            onPress={() => Alert.alert('Contact', 'Opening contact form...')}
          >
            <View style={styles.settingItemText}>
              <Text style={styles.settingItemTitle}>Contact Support</Text>
              <Text style={styles.settingItemDescription}>
                Send us a message
              </Text>
            </View>
            <Text style={{ fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.settingItem}>
          <TouchableOpacity
            style={styles.settingItemRow}
            onPress={() => Alert.alert('About', 'FarmHub v1.0.0\n© 2024')}
          >
            <View style={styles.settingItemText}>
              <Text style={styles.settingItemTitle}>About</Text>
              <Text style={styles.settingItemDescription}>
                App version and credits
              </Text>
            </View>
            <Text style={styles.settingItemValue}>v1.0.0</Text>
            <Text style={{ fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        </Card>

        <View style={styles.divider} />

        {/* Logout */}
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
