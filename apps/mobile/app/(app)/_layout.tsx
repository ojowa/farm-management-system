import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAppSelector } from '@/hooks/useAuth';
import { colors } from '@/components/common/UIComponents';
import { usePermission } from '@/hooks/usePermission';

const TAB_CONFIG = [
  { name: 'index', title: 'Home', icon: '🏠', permission: null, module: null },
  { name: 'farms', title: 'Farms', icon: '🌾', permission: 'farm.read', module: 'farm' },
  { name: 'crops', title: 'Crops', icon: '🌱', permission: 'crop.read', module: 'crop' },
  { name: 'livestock', title: 'Livestock', icon: '🐄', permission: 'livestock.read', module: 'livestock' },
  { name: 'irrigation', title: 'Irrigation', icon: '💧', permission: 'crop.read', module: 'crop' },
  { name: 'tasks', title: 'Tasks', icon: '✅', permission: 'worker.read', module: 'worker' },
  { name: 'roster', title: 'Roster', icon: '📅', permission: 'worker.read', module: 'worker' },
  { name: 'attendance', title: 'Attendance', icon: '📋', permission: 'worker.read', module: 'worker' },
  { name: 'messages', title: 'Messages', icon: '✉️', permission: 'communication.read', module: 'communication' },
  { name: 'correspondence', title: 'Docs', icon: '📄', permission: 'communication.read', module: 'communication' },
  { name: 'leave', title: 'Leave', icon: '🏖️', permission: 'worker.read', module: 'worker' },
  { name: 'notifications', title: 'Alerts', icon: '🔔', permission: null, module: null },
  { name: 'finance', title: 'Finance', icon: '💰', permission: 'finance.read', module: 'finance' },
  { name: 'equipment', title: 'Equipment', icon: '🔧', permission: 'inventory.read', module: 'inventory' },
  { name: 'contracts', title: 'Contracts', icon: '📝', permission: 'finance.read', module: 'finance' },
  { name: 'marketplace', title: 'Marketplace', icon: '🏪', permission: 'finance.read', module: 'finance' },
  { name: 'settings', title: 'Settings', icon: '⚙️', permission: null, module: null },
];

export default function AppLayout() {
  const user = useAppSelector((state) => state.auth.user);
  const { hasPermission } = usePermission();

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
    </Tabs>
  );
}
