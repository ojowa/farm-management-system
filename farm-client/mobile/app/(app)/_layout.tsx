import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Drawer } from 'react-native-drawer-layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector } from '@/modules/auth/hooks/useAuth';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { usePermission } from '@/core/hooks/usePermission';
import { Sidebar } from '@/core/ui/Sidebar';
import { SidebarContext } from '@/core/navigation/SidebarContext';

// The six primary destinations shown in the bottom tab bar. Settings is not a
// tab — it lives behind the gear button in the Home header (its route stays,
// hidden below via href: null).
const TAB_CONFIG = [
  { name: 'index', title: 'Home', icon: '🏠', permission: null, module: null },
  { name: 'farms', title: 'Farms', icon: '🌾', permission: 'farm.read', module: 'farm' },
  { name: 'crops', title: 'Crops', icon: '🌱', permission: 'crop.read', module: 'crop' },
  { name: 'livestock', title: 'Livestock', icon: '🐄', permission: 'livestock.read', module: 'livestock' },
  { name: 'finance', title: 'Finance', icon: '💰', permission: 'finance.read', module: 'finance' },
  { name: 'tasks', title: 'Tasks', icon: '✅', permission: 'worker.read', module: 'worker' },
];

// expo-router's <Tabs> auto-appends a tab for every route file under
// app/(app) that isn't declared as a <Tabs.Screen>, so detail, add, edit, and
// nested screens would otherwise each surface as a bare tab. Listing them here
// with `href: null` keeps them reachable via in-app navigation while removing
// them from the bar. Add any new non-tab route to this list.
const HIDDEN_ROUTES = [
  'attendance',
  'leave',
  'messages',
  'notifications',
  'settings',
  'settings/edit-profile',
  'subscription',
  'tasks/[id]',
  'tasks/[id]/edit',
  'aquaculture',
  'aquaculture/add',
  'aquaculture/[id]',
  'aquaculture/[id]/edit',
  'crops/add',
  'crops/[id]',
  'crops/[id]/edit',
  'farms/add',
  'farms/[id]',
  'farms/[id]/edit',
  'finance/add',
  'finance/profitability',
  'finance/[id]',
  'finance/[id]/edit',
  'inventory/low-stock',
  'livestock/add',
  'livestock/[id]',
  'livestock/[id]/edit',
  'livestock/[id]/health',
  'poultry',
  'poultry/add',
  'poultry/[id]',
  'poultry/[id]/edit',
  'equipment',
  'equipment/add',
  'equipment/[id]',
  'equipment/[id]/edit',
  'workers',
  'workers/add',
  'workers/[id]',
  'workers/[id]/edit',
  'reports/scheduled',
  'users',
  'users/[id]',
  'roles',
  'roles/[id]',
  'roster',
  'correspondence',
  'correspondence/[id]',
  'contracts',
  'contracts/[id]',
  'marketplace',
  'weather',
];

export default function AppLayout() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const { hasPermission } = usePermission();
  const { colors: themeColors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const bottomInset = Math.max(insets.bottom, 8);
  const tabHeight = 56 + bottomInset;

  // Sidebar drawer state. Any screen can open it via MenuButton (which reads
  // this context); the drawer itself is also swipe-openable from the left edge.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const sidebarContextValue = useMemo(
    () => ({ open: openSidebar, close: closeSidebar }),
    [openSidebar, closeSidebar]
  );
  const renderDrawerContent = useCallback(() => <Sidebar />, []);

  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(Math.round(width * 0.78), 320);

  if (!isAuthenticated) {
    return (
      <View style={[styles.loading, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  const visibleTabs = TAB_CONFIG.filter((tab) => {
    if (tab.permission && !hasPermission(tab.permission)) return false;
    // `modules: []` means "no plan linked / lookup failed", not "no modules" -
    // only a non-empty list may hide a tab (matches the admin sidebar).
    const planModules: string[] | undefined = user?.planFeatures?.modules;
    if (tab.module && planModules && planModules.length > 0 && !planModules.includes(tab.module)) return false;
    return true;
  });

  return (
    <SidebarContext.Provider value={sidebarContextValue}>
      <Drawer
        open={sidebarOpen}
        onOpen={openSidebar}
        onClose={closeSidebar}
        drawerType="front"
        drawerStyle={{ width: drawerWidth }}
        swipeEdgeWidth={48}
        overlayAccessibilityLabel="Close navigation menu"
        renderDrawerContent={renderDrawerContent}
      >
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
          {/* Hide every non-tab route so only the six above appear in the bar. */}
          {HIDDEN_ROUTES.map((route) => (
            <Tabs.Screen key={route} name={route} options={{ href: null }} />
          ))}
        </Tabs>
      </Drawer>
    </SidebarContext.Provider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
