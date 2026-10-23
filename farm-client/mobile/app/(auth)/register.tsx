import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, TextInputField } from '../../src/core/ui/UIComponents';
import { useAppTheme } from '../../src/core/theme/ThemeContext';
import { useAuth } from '../../src/modules/auth/hooks/useAuth';
import { authAPI } from '../../src/modules/auth';
import { describeApiError } from '../../src/core/utils/apiError';

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { colors: themeColors } = useAppTheme();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!firstName.trim() || !lastName.trim() || !normalizedEmail || !password) {
      Alert.alert('Required fields', 'Enter your first name, last name, email, and password.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
      Alert.alert('Password requirements', 'Use at least 8 characters, including uppercase, lowercase, and a number.');
      return;
    }

    setSubmitting(true);
    try {
      await authAPI.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        password,
      });
      await login(normalizedEmail, password);
      router.replace('/(app)');
    } catch (error) {
      Alert.alert('Registration failed', describeApiError(error, 'Unable to create your account.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.heading}>
            <Text style={[styles.title, { color: themeColors.text }]}>Create account</Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
              Sign up to manage your farm
            </Text>
          </View>
          <View style={styles.form}>
            <TextInputField label="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
            <TextInputField label="Last name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
            <TextInputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />
            <TextInputField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
            />
            <Button
              title={submitting ? 'Creating account...' : 'Create account'}
              onPress={handleRegister}
              loading={submitting}
              disabled={submitting}
            />
            <Button title="Back to sign in" onPress={() => router.replace('/(auth)/login')} variant="secondary" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  heading: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14 },
  form: { gap: 16 },
});
