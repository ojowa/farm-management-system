import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector } from '@/modules/auth/hooks/useAuth';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { usePermission } from '@/core/hooks/usePermission';

const TAB_CONFIG = [
  { name: 'index', title: 'Home', icon: '🏠', permission: null, module: null },
  { name: 'farms', title: 'Farm', icon: '🌾', permission: 'farm.read', module: 'farm' },
  { name: 'tasks', title: 'Tasks', icon: '✅', permission: 'worker.read', module: 'worker' },
  { name: 'messages', title: 'Messages', icon: '✉️', permission: 'communication.read', module: 'communication' },
  { name: 'finance', title: 'Finance', icon: '💰', permission: 'finance.read', module: 'finance' },
  { name: 'settings', title: 'Settings', icon: '⚙️', permission: null, module: null },
];

export default function AppLayout() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const { hasPermission } = usePermission();
  const { colors: themeColors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const bottomInset = Math.max(insets.bottom, 8);
  const tabHeight = 56 + bottomInset;

  if (!isAuthenticated) {
    return (
      <View style={[styles.loading, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  const visibleTabs = TAB_CONFIG.filter((tab) => {
    if (tab.permission && !hasPermission(tab.permission)) return false;
    if (tab.module && user?.planFeatures?.modules && !user.planFeatures.modules.includes(tab.module)) return false;
    return true;
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textSecondary,
        tabBarStyle: {
          backgroundColor: themeColors.tabBar || themeColors.surface,
          borderTopColor: themeColors.border,
          borderTopWidth: 1,
          paddingBottom: bottomInset,
          paddingTop: 6,
          height: tabHeight,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      {visibleTabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarLabel: tab.title,
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 22, color }} accessibilityRole="image" accessibilityLabel={tab.title}>
                {tab.icon}
              </Text>
            ),
          }}
        />
      ))}
      {/* Hide sub-screens from tab bar */}
      <Tabs.Screen name="crops" options={{ href: null }} />
      <Tabs.Screen name="livestock" options={{ href: null }} />
      <Tabs.Screen name="irrigation" options={{ href: null }} />
      <Tabs.Screen name="roster" options={{ href: null }} />
      <Tabs.Screen name="attendance" options={{ href: null }} />
      <Tabs.Screen name="correspondence" options={{ href: null }} />
      <Tabs.Screen name="leave" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="equipment" options={{ href: null }} />
      <Tabs.Screen name="contracts" options={{ href: null }} />
      <Tabs.Screen name="marketplace" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
