import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAppSelector } from '@/hooks/useAuth';
import { colors } from '@/components/common/UIComponents';
import { usePermission } from '@/hooks/usePermission';

const TAB_CONFIG = [
  { name: 'index', title: 'Home', icon: '🏠', permission: null },
  { name: 'farms', title: 'Farms', icon: '🌾', permission: 'farm.read' },
  { name: 'crops', title: 'Crops', icon: '🌱', permission: 'crop.read' },
  { name: 'livestock', title: 'Livestock', icon: '🐄', permission: 'livestock.read' },
  { name: 'tasks', title: 'Tasks', icon: '✅', permission: 'task.read' },
  { name: 'roster', title: 'Roster', icon: '📅', permission: 'roster.read' },
  { name: 'messages', title: 'Messages', icon: '✉️', permission: 'messaging.read' },
  { name: 'correspondence', title: 'Docs', icon: '📄', permission: 'correspondence.read' },
  { name: 'leave', title: 'Leave', icon: '🏖️', permission: 'leave.read' },
  { name: 'notifications', title: 'Alerts', icon: '🔔', permission: 'notification.read' },
  { name: 'finance', title: 'Finance', icon: '💰', permission: 'finance.read' },
  { name: 'settings', title: 'Settings', icon: '⚙️', permission: null },
];

export default function AppLayout() {
  const isAuthenticated = useAppSelector(
    (state) => state.auth.isAuthenticated
  );
  const { hasPermission } = usePermission();

  if (!isAuthenticated) {
    return null;
  }

  const visibleTabs = TAB_CONFIG.filter((tab) => !tab.permission || hasPermission(tab.permission));

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
    </Tabs>
  );
}
