import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../../src/core/ui/UIComponents';
import { useAuth, useAppDispatch } from '../../src/modules/auth/hooks/useAuth';
import { setBootstrapped } from '../../src/modules/auth/services/authSlice';
import { useAppTheme } from '../../src/core/theme/ThemeContext';

export default function SelectOrganizationScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    organizations,
    organizationsLoading,
    switchOrganization,
    fetchOrganizations,
    fetchProfile,
  } = useAuth();
  const { colors: themeColors } = useAppTheme();
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [switching, setSwitching] = useState(false);
  const [orgSearch, setOrgSearch] = useState('');

  const filteredOrganizations = organizations.filter((org) => {
    const search = orgSearch.toLowerCase();
    return org.name.toLowerCase().includes(search);
  });

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleSelectOrg = async () => {
    if (!selectedOrgId) {
      Alert.alert('Error', 'Please select an organization');
      return;
    }
    setSwitching(true);
    try {
      await switchOrganization(selectedOrgId);
      // Re-fetch profile so the session boots inside the chosen organization
      // context (currency, permissions, org-scoped data), mirroring the
      // admin portal's refreshUser() after switchOrganization.
      await fetchProfile();
      dispatch(setBootstrapped());
      router.replace('/(app)');
    } catch {
      // Error handled by slice
    } finally {
      setSwitching(false);
    }
  };

  if (organizationsLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator style={styles.loading} color={themeColors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoSection}>
            <View style={[styles.logoCircle, { backgroundColor: themeColors.primary }]}>
              <Text style={styles.logoText}>F</Text>
            </View>
            <Text style={[styles.title, { color: themeColors.text }]}>
              Select Organization
            </Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
              Choose the organization you want to work in
            </Text>

            <View style={{ marginTop: 12 }}>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: themeColors.borderLight,
                  backgroundColor: themeColors.inputBg,
                  color: themeColors.inputText,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                }}
                placeholder="Search organizations..."
                placeholderTextColor={themeColors.placeholder}
                value={orgSearch}
                onChangeText={setOrgSearch}
                autoCapitalize="words"
              />
            </View>
          </View>

          {organizations.length === 0 && (
            <Text style={[styles.errorText, { color: themeColors.error }]} accessibilityRole="alert">
              No organizations found. Please contact your administrator.
            </Text>
          )}

          {organizations.length > 0 && filteredOrganizations.length === 0 && (
            <Text style={[styles.errorText, { color: themeColors.textSecondary }]} accessibilityRole="alert">
              No organizations match your search.
            </Text>
          )}

          <View style={styles.form}>
            {filteredOrganizations.map((org) => (
              <TouchableOrgCard
                key={org.id}
                org={org}
                selected={selectedOrgId === org.id}
                onPress={() => setSelectedOrgId(org.id)}
                primaryColor={themeColors.primary}
              />
            ))}
          </View>

          <Button
            title={switching ? 'Switching...' : 'Continue'}
            onPress={handleSelectOrg}
            loading={switching}
            disabled={switching || !selectedOrgId}
            style={styles.continueButton}
          />

          <Text style={[styles.registerText, { color: themeColors.textSecondary }]}>
            Don't see your organization?{' '}
            <Text
              style={[styles.registerLink, { color: themeColors.primary }]}
              onPress={() => router.push('/(auth)/register')}
              accessibilityRole="link"
              accessibilityLabel="Create an account"
            >
              Create an account
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface TouchableOrgCardProps {
  org: { id: string; name: string };
  selected: boolean;
  onPress: () => void;
  primaryColor: string;
}

function TouchableOrgCard({ org, selected, onPress, primaryColor }: TouchableOrgCardProps) {
  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={[
          styles.orgCard,
          selected && styles.orgCardSelected,
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Select ${org.name}`}
      >
        <View style={[styles.orgIcon, selected && styles.orgIconSelected]}>
          <Text style={[styles.orgIconText, selected && styles.orgIconTextSelected]}>
            {org.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.orgName, selected && styles.orgNameSelected]}>{org.name}</Text>
        <View style={[styles.checkContainer, selected && styles.checkVisible]}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoSection: { alignItems: 'center', marginBottom: 48 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: { fontSize: 36, color: '#FFFFFF', fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 32 },
  form: { gap: 12 },
  errorText: { fontSize: 13, textAlign: 'center', marginBottom: 12 },
  cardContainer: { width: '100%' },
  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  orgCardSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#F0F7FF',
  },
  orgIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginRight: 12,
  },
  orgIconSelected: {
    backgroundColor: '#2563eb',
  },
  orgIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666666',
  },
  orgIconTextSelected: {
    color: '#FFFFFF',
  },
  orgName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  orgNameSelected: {
    color: '#2563eb',
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  checkVisible: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  continueButton: {
    marginTop: 24,
  },
  registerText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
  },
  registerLink: { fontWeight: '600' },
  loading: { flex: 1 },
});
