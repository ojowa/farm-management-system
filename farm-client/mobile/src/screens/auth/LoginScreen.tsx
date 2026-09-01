import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { TextInputField, Button, colors } from '../../components/common/UIComponents';
import { useAuth } from '../../hooks/useAuth';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
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
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: { fontSize: 36, color: '#FFFFFF', fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.textLight, textAlign: 'center', marginBottom: 32 },
  form: { gap: 16 },
  mfaSection: { marginTop: 24, alignItems: 'center' },
  mfaTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 },
  mfaSubtitle: { fontSize: 13, color: colors.textLight, marginBottom: 16, textAlign: 'center' },
  errorText: { fontSize: 13, color: colors.error, textAlign: 'center', marginBottom: 12 },
  registerText: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 24,
  },
  registerLink: { color: colors.primary, fontWeight: '600' },
});

export default function LoginScreen() {
  const { login, verifyMFA, loading, error, mfaRequired, mfaSessionToken, clearError, resetMFA } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Password is required');
      return;
    }

    clearError();
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      // Error is handled by the slice
    }
  };

  const handleVerifyMFA = async () => {
    if (!mfaCode || mfaCode.length !== 6) {
      Alert.alert('Error', 'Enter a 6-digit code');
      return;
    }
    if (!mfaSessionToken) return;

    clearError();
    try {
      await verifyMFA(mfaSessionToken, mfaCode);
    } catch (err: any) {
      // Error is handled by the slice
    }
  };

  const handleUsePassword = () => {
    resetMFA();
    setMfaCode('');
  };

  if (mfaRequired) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.logoSection}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>F</Text>
              </View>
              <Text style={styles.title}>Two-Factor Auth</Text>
              <Text style={styles.mfaSubtitle}>
                Enter the 6-digit code from your authenticator app
              </Text>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.form}>
              <TextInputField
                label="Verification Code"
                placeholder="000000"
                value={mfaCode}
                onChangeText={(v) => {
                  setMfaCode(v.replace(/[^0-9]/g, '').slice(0, 6));
                  clearError();
                }}
                keyboardType="numeric"
                accessibilityLabel="6-digit verification code"
              />

              <Button
                title={loading ? 'Verifying...' : 'Verify'}
                onPress={handleVerifyMFA}
                loading={loading}
                disabled={loading || mfaCode.length !== 6}
              />

              <Button
                title="Use password instead"
                onPress={handleUsePassword}
                variant="secondary"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>F</Text>
            </View>
            <Text style={styles.title}>Farm Management</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.form}>
            <TextInputField
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                clearError();
              }}
              keyboardType="email-address"
              accessibilityLabel="Email address"
            />

            <TextInputField
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                clearError();
              }}
              secureTextEntry={!showPassword}
            />

            <Button
              title={loading ? 'Signing in...' : 'Sign In'}
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
            />
          </View>

          <Text style={styles.registerText}>
            Don't have an account?{' '}
            <Text style={styles.registerLink}>Contact your administrator</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
