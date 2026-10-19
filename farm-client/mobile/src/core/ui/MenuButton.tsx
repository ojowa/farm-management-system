import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useSidebar } from '@/core/navigation/SidebarContext';

/**
 * Hamburger trigger for the navigation sidebar. Tab-root headers render this
 * at the far left — the same position as the admin portal's menu button. The
 * drawer is also openable by swiping in from the left edge of any screen.
 */
export const MenuButton: React.FC<{ color?: string }> = ({ color = '#FFFFFF' }) => {
  const { open } = useSidebar();

  return (
    <TouchableOpacity
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel="Open navigation menu"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={styles.button}
    >
      <Text style={[styles.icon, { color }]}>☰</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 6,
    marginRight: 4,
  },
  icon: {
    fontSize: 22,
    fontWeight: '700',
  },
});
