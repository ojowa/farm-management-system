import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../tokens';

const colorMap: Record<string, { bg: string; text: string }> = {
  primary: { bg: '#E8F5E9', text: '#2E7D32' },
  secondary: { bg: '#E3F2FD', text: '#1565C0' },
  success: { bg: '#E8F5E9', text: '#2E7D32' },
  warning: { bg: '#FFF3E0', text: '#E65100' },
  danger: { bg: '#FFEBEE', text: '#C62828' },
  error: { bg: '#FFEBEE', text: '#C62828' },
  info: { bg: '#E1F5FE', text: '#0277BD' },
  gray: { bg: colors.light, text: colors.text },
};

export interface BadgeProps {
  color?: string;
  children: string;
}

export function Badge({ color = 'gray', children }: BadgeProps) {
  const scheme = colorMap[color] || colorMap.gray;
  return (
    <View style={[styles.badge, { backgroundColor: scheme.bg }]}>
      <Text style={[styles.text, { color: scheme.text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
