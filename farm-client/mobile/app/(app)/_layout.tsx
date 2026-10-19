import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Stack } from 'expo-router';
import { Drawer } from 'react-native-drawer-layout';
import { useAppSelector } from '@/modules/auth/hooks/useAuth';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { Sidebar } from '@/core/ui/Sidebar';
import { SidebarContext } from '@/core/navigation/SidebarContext';

// Navigation is sidebar-first: a plain <Stack> (no bottom tab bar) with the
// drawer overlaying it on top. Every screen opens the drawer via MenuButton
// (or a left-edge swipe); the Sidebar itself filters items by permission and
// plan, so no route gating is needed here.
export default function AppLayout() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { colors: themeColors } = useAppTheme();

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
