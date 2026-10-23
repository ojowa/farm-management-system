import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MenuButton } from '@/core/ui/MenuButton';
import { useAppTheme } from '@/core/theme/ThemeContext';

const sections = [
  {
    title: 'Livestock',
    description: 'View and manage animals on your farms',
    icon: '🐄',
    route: '/livestock/animals',
  },
  {
    title: 'Health',
    description: 'Review health history and add care records',
    icon: '🩺',
    route: '/livestock/health',
  },
  {
    title: 'Vaccinations',
    description: 'Schedule and record animal vaccinations',
    icon: '💉',
    route: '/livestock/vaccinations',
  },
  {
    title: 'Weight',
    description: 'Track animal weight over time',
    icon: '⚖️',
    route: '/livestock/weight',
  },
  {
    title: 'Breeding',
    description: 'Track breeding pairs and expected due dates',
    icon: '🐮',
    route: '/livestock/breeding',
  },
];

export default function LivestockHubScreen() {
  const router = useRouter();
  const { farmId } = useLocalSearchParams<{ farmId?: string }>();
  const { colors: themeColors } = useAppTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}>
        <MenuButton />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Livestock</Text>
          <Text style={styles.subtitle}>Manage animals, health, and breeding</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {sections.map((section) => (
          <TouchableOpacity
            key={section.route}
            accessibilityRole="button"
            accessibilityLabel={section.title}
            onPress={() =>
              router.push(
                section.title === 'Livestock' && farmId
                  ? (`${section.route}?farmId=${encodeURIComponent(farmId)}` as never)
                  : (section.route as never)
              )
            }
            style={[
              styles.card,
              { backgroundColor: themeColors.card, borderColor: themeColors.border },
            ]}
          >
            <Text style={styles.icon}>{section.icon}</Text>
            <View style={styles.cardCopy}>
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>{section.title}</Text>
              <Text style={[styles.description, { color: themeColors.textSecondary }]}>
                {section.description}
              </Text>
            </View>
            <Text style={[styles.arrow, { color: themeColors.textSecondary }]}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },
  headerCopy: { flex: 1 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#FFFFFF', fontSize: 13, marginTop: 3, opacity: 0.85 },
  content: { padding: 16, paddingBottom: 30, gap: 12 },
  card: {
    minHeight: 82,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  icon: { fontSize: 28, width: 38, textAlign: 'center' },
  cardCopy: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  description: { fontSize: 13 },
  arrow: { fontSize: 28, fontWeight: '300' },
});
