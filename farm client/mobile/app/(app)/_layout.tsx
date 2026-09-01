import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAppSelector } from '@/hooks/useAuth';
import { colors } from '@/components/common/UIComponents';
import { usePermission } from '@/hooks/usePermission';

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

  if (!isAuthenticated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
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
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: 4,
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
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>{tab.icon}</Text>,
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
    backgroundColor: '#FFFFFF',
  },
});
