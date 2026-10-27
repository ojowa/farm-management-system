import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { Drawer } from 'react-native-drawer-layout';
import { useAppSelector } from '@/modules/auth/hooks/useAuth';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { Sidebar } from '@/core/ui/Sidebar';
import { AccessDenied } from '@/core/ui/AccessDenied';
import { SidebarContext } from '@/core/navigation/SidebarContext';
import { requiredPermissionsForPath } from '@/core/navigation/routePermissions';
import { usePermission } from '@/core/hooks/usePermission';

// Navigation is sidebar-first: a plain <Stack> (no bottom tab bar) with the
// drawer overlaying it on top. Every screen opens the drawer via MenuButton
// (or a left-edge swipe); the Sidebar filters items by permission and plan,
// and the route guard below denies screens a deep link could still reach —
// the same route → permission map the admin portal enforces.
export default function AppLayout() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { colors: themeColors } = useAppTheme();
  const pathname = usePathname();
  const { hasPermission } = usePermission();

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

  // Route-level authorization (mirrors admin's AppLayout): never render a
  // screen the user has no permission for, including routes the sidebar does
  // not link to. ANY-of the route's permissions grants access.
  const requiredPermissions = requiredPermissionsForPath(pathname);
  const isDenied =
    !!requiredPermissions &&
    requiredPermissions.length > 0 &&
    !requiredPermissions.some((p) => hasPermission(p));

  if (isDenied) {
    return (
      <View style={{ flex: 1, backgroundColor: themeColors.background }}>
        <AccessDenied permission={requiredPermissions.join(' or ')} />
      </View>
    );
  }

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
        <Stack
          screenOptions={{
            headerShown: false,
            // Themed scene background: prevents a white flash when a new
            // screen mounts before it paints its own container color.
            contentStyle: { backgroundColor: themeColors.background },
          }}
        />
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
