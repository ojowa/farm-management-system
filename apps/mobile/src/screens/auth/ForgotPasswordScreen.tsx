import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { TextInputField, Button, colors } from '../../components/common/UIComponents';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
  },
  form: {
    marginBottom: 24,
  },
  successBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  successTitle: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  successText: {
    color: colors.success,
    fontSize: 13,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    alignItems: 'center',
  },
  step: {
    alignItems: 'center',
    flex: 1,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumberActive: {
    backgroundColor: colors.primary,
  },
  stepNumberText: {
    fontWeight: '600',
    color: colors.textLight,
  },
  stepNumberTextActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 12,
    color: colors.textLight,
  },
  stepLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: colors.light,
    top: 18,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 24,
  },
  backToLogin: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  backToLoginText: {
    color: colors.primary,
    fontWeight: '600',
  },
});

type Step = 'email' | 'code' | 'password';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { requestReset, resetPass, loading, error, clearError } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleRequestReset = async () => {
    clearError();
    setErrors({});
    setSuccessMessage('');

    if (!email) {
      setErrors({ email: 'Email is required' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: 'Invalid email format' });
      return;
    }

    try {
      await requestReset(email);
      setStep('code');
      setSuccessMessage('Check your email for the password reset code');
    } catch (err) {
      // Error is in state
    }
  };

  const handleResetPassword = async () => {
    clearError();
    setErrors({});
    const newErrors: Record<string, string> = {};

    if (!resetCode.trim()) {
      newErrors.resetCode = 'Reset code is required';
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await resetPass(resetCode, newPassword);
      setStep('password');
      setSuccessMessage('Your password has been reset successfully!');
      setTimeout(() => {
        router.push('/(auth)/login');
      }, 2000);
    } catch (err) {
      // Error is in state
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (step === 'email') {
              router.back();
            } else if (step === 'code') {
              setStep('email');
              setSuccessMessage('');
            } else {
              setStep('code');
            }
          }}
          disabled={loading}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {step === 'email'
              ? 'Enter your email address and we'll send you a code to reset your password'
              : step === 'code'
              ? 'Enter the code sent to your email and create a new password'
              : 'Your password has been reset'}
          </Text>
        </View>

        {successMessage && (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>Success</Text>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {step === 'email' && (
          <View style={styles.form}>
            <TextInputField
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              keyboardType="email-address"
              editable={!loading}
            />

            <Button
              title="Send Reset Code"
              onPress={handleRequestReset}
              loading={loading}
              disabled={loading}
            />
          </View>
        )}

        {step === 'code' && (
          <View style={styles.form}>
            <TextInputField
              label="Reset Code"
              placeholder="Enter the code from your email"
              value={resetCode}
              onChangeText={setResetCode}
              error={errors.resetCode}
              editable={!loading}
            />

            <TextInputField
              label="New Password"
              placeholder="Create a new password"
              value={newPassword}
              onChangeText={setNewPassword}
              error={errors.newPassword}
              secureTextEntry
              editable={!loading}
            />

            <TextInputField
              label="Confirm Password"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={errors.confirmPassword}
              secureTextEntry
              editable={!loading}
            />

            <Button
              title="Reset Password"
              onPress={handleResetPassword}
              loading={loading}
              disabled={loading}
            />
          </View>
        )}

        {step === 'password' && (
          <View style={styles.form}>
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>Password Reset Complete</Text>
              <Text style={styles.successText}>
                You can now log in with your new password. Redirecting to login...
              </Text>
            </View>
          </View>
        )}

        <View style={styles.backToLogin}>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            disabled={loading}
          >
            <Text style={styles.backToLoginText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
