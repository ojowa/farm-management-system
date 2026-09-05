import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInputField, Button } from '../../src/core/ui/UIComponents';
import { useAuth } from '../../src/modules/auth/hooks/useAuth';
import { useAppTheme } from '../../src/core/theme/ThemeContext';

export default function LoginScreen() {
  const { login, verifyMFA, loading, error, mfaRequired, mfaSessionToken, clearError, resetMFA } = useAuth();
  const { colors: themeColors, isDark } = useAppTheme();

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
    } catch {
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
    } catch {
      // Error is handled by the slice
    }
  };

  const handleUsePassword = () => {
    resetMFA();
    setMfaCode('');
  };

  const handleContactAdmin = () => {
    Alert.alert(
      'Account Support',
      'To request an account or reset your credentials, please contact your farm administrator or supervisor.',
      [{ text: 'OK' }]
    );
  };

  if (mfaRequired) {
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
              <Text style={[styles.title, { color: themeColors.text }]}>Two-Factor Auth</Text>
              <Text style={[styles.mfaSubtitle, { color: themeColors.textSecondary }]}>
                Enter the 6-digit code from your authenticator app
              </Text>
            </View>

            {error && (
              <Text style={[styles.errorText, { color: themeColors.error }]} accessibilityRole="alert">
                {error}
              </Text>
            )}

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
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
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
            <Text style={[styles.title, { color: themeColors.text }]}>Farm Management</Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>Sign in to your account</Text>
          </View>

          {error && (
            <Text style={[styles.errorText, { color: themeColors.error }]} accessibilityRole="alert">
              {error}
            </Text>
          )}

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
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
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
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              accessibilityLabel="Password"
              rightIcon={
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={{ fontSize: 13, color: themeColors.primary, fontWeight: '600' }}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              }
            />

            <Button
              title={loading ? 'Signing in...' : 'Sign In'}
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
            />
          </View>

          <Text style={[styles.registerText, { color: themeColors.textSecondary }]}>
            Don't have an account?{' '}
            <Text
              style={[styles.registerLink, { color: themeColors.primary }]}
              onPress={handleContactAdmin}
              accessibilityRole="link"
              accessibilityLabel="Contact your administrator"
            >
              Contact your administrator
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  form: { gap: 16 },
  mfaSubtitle: { fontSize: 13, marginBottom: 16, textAlign: 'center' },
  errorText: { fontSize: 13, textAlign: 'center', marginBottom: 12 },
  registerText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
  },
  registerLink: { fontWeight: '600' },
});
