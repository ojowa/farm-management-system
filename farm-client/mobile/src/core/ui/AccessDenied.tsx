import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/core/theme/ThemeContext';

/**
 * Shown in place of a screen the signed-in user has no permission for —
 * the mobile twin of admin's AccessDenied. The drawer stays reachable
 * (menu button / edge swipe) and never offers the denied row in the first
 * place; this guard only catches deep links and stale navigation.
 */
export function AccessDenied({ permission }: { permission?: string }) {
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={styles.icon}>🔒</Text>
      <Text style={[styles.title, { color: colors.text }]}>
        You don't have permission to view this page
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        Your account isn't allowed to access this section
        {permission ? ` (requires ${permission})` : ''}. Ask an administrator
        to update your role if you need it.
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={() => router.replace('/')}
      >
        <Text style={styles.buttonText}>Back to home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: { fontSize: 44, marginBottom: 16 },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
