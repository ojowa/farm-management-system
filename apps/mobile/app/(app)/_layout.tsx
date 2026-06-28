import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAppSelector } from '@/hooks/useAuth';
import { colors } from '@/components/common/UIComponents';

export default function AppLayout() {
  const isAuthenticated = useAppSelector(
    (state) => state.auth.isAuthenticated
  );

  if (!isAuthenticated) {
    return null;
  }

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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="farms"
        options={{
          title: 'Farms',
          tabBarLabel: 'Farms',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🌾</Text>,
        }}
      />
      <Tabs.Screen
        name="crops"
        options={{
          title: 'Crops',
          tabBarLabel: 'Crops',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🌱</Text>,
        }}
      />
      <Tabs.Screen
        name="livestock"
        options={{
          title: 'Livestock',
          tabBarLabel: 'Livestock',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🐄</Text>,
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: 'Finance',
          tabBarLabel: 'Finance',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>💰</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}


