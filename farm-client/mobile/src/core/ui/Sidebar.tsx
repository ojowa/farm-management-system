import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { useAppSelector } from '@/modules/auth/hooks/useAuth';
import { usePermission } from '@/core/hooks/usePermission';
import { useAppTheme } from '@/core/theme/ThemeContext';
import {
  SIDEBAR_SECTIONS,
  isSidebarItemVisible,
  type SidebarItem,
} from '@/core/navigation/sidebarConfig';
import { useSidebar } from '@/core/navigation/SidebarContext';

/**
 * Slide-out navigation sidebar rendered as the content of the drawer in
 * app/(app)/_layout.tsx. It mirrors the admin portal's Sidebar component:
 * a brand header, the same 8 sectioned groups with the same gating rules, a
 * primary-colored highlight on the active item, and a user footer. Every
 * admin item now has a real mobile screen; the "Not on mobile" badge is kept
 * as a defensive fallback should a future item ship without one.
 */
export const Sidebar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { close } = useSidebar();
  const user = useAppSelector((state) => state.auth.user);
  const { hasPermission } = usePermission();
  const { colors } = useAppTheme();

  const planModules: string[] | undefined = user?.planFeatures?.modules;

  const sections = useMemo(
    () =>
      SIDEBAR_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => isSidebarItemVisible(item, planModules, hasPermission)),
      })).filter((section) => section.items.length > 0),
    [planModules, hasPermission]
  );

  const navigateTo = useCallback(
    (route: string) => {
      // Close first so the drawer animation doesn't race the route change.
      close();
      router.push(route);
    },
    [close, router]
  );

  // Same active-item rule as the admin sidebar: exact match, or a child route
  // of the item (so /finance/add still highlights Finance). "/" only matches "/".
  const isItemActive = (route: string | null): boolean => {
    if (!route) return false;
    if (route === '/') return pathname === '/';
    return pathname === route || pathname.startsWith(`${route}/`);
  };

  const renderItem = (item: SidebarItem) => {
    const disabled = item.route === null;
    const active = isItemActive(item.route);

    return (
      <TouchableOpacity
        key={item.label}
        disabled={disabled}
        onPress={() => {
          if (item.route) navigateTo(item.route);
        }}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={item.label}
        style={[styles.item, active && { backgroundColor: colors.primary }, disabled && styles.itemDisabled]}
      >
        <Text style={styles.itemIcon} accessibilityElementsHidden importantForAccessibility="no">
          {item.icon}
        </Text>
        <Text
          style={[styles.itemLabel, { color: active ? colors.textInverse : colors.text }]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        {disabled && (
          <Text style={[styles.itemBadge, { color: active ? colors.textInverse : colors.textSecondary }]}>
            Not on mobile
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const fullName =
    user?.fullName || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'User';
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}` || 'U';

  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom']}
      style={[styles.panel, { backgroundColor: colors.surface }]}
    >
      {/* Brand header — mirrors the admin sidebar's "Farm Admin" row. */}
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <Text style={styles.headerIcon} accessibilityElementsHidden importantForAccessibility="no">
          🚜
        </Text>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Farm Manager</Text>
        <TouchableOpacity
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close navigation menu"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeButton}
        >
          <Text style={[styles.closeIcon, { color: colors.textSecondary }]}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.nav}
        contentContainerStyle={styles.navContent}
        accessibilityLabel="Main navigation"
      >
        {sections.map((section) => (
          <View key={section.label} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{section.label}</Text>
            {section.items.map(renderItem)}
          </View>
        ))}
      </ScrollView>

      {/* User footer — mirrors the admin sidebar's avatar + name + role block. */}
      <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.footerTexts}>
          <Text style={[styles.footerName, { color: colors.text }]} numberOfLines={1}>
            {fullName}
          </Text>
          <Text style={[styles.footerRole, { color: colors.textSecondary }]} numberOfLines={1}>
            {user?.role ? user.role.replace(/_/g, ' ') : 'User'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  panel: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIcon: {
    fontSize: 22,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  closeButton: {
    padding: 6,
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  nav: {
    flex: 1,
  },
  navContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
    marginBottom: 2,
  },
  itemDisabled: {
    opacity: 0.45,
  },
  itemIcon: {
    fontSize: 17,
    width: 24,
    textAlign: 'center',
  },
  itemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  itemBadge: {
    fontSize: 10,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  footerTexts: {
    flex: 1,
  },
  footerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerRole: {
    fontSize: 12,
    marginTop: 1,
  },
});
