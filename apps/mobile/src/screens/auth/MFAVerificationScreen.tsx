import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Button, colors } from '../../components/common/UIComponents';

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
    marginBottom: 40,
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    marginBottom: 24,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  codeInput: {
    width: Dimensions.get('window').width / 8 - 5,
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.text,
  },
  codeInputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  codeInputFilled: {
    backgroundColor: colors.light,
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
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  resendText: {
    color: colors.textLight,
    fontSize: 13,
  },
  resendButton: {
    marginLeft: 4,
  },
  resendButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  resendButtonDisabled: {
    color: colors.textLight,
  },
  timerText: {
    color: colors.textLight,
    fontSize: 13,
    fontWeight: '500',
  },
});

interface MFAVerificationScreenProps {
  mfaSessionToken: string;
}

export default function MFAVerificationScreen({
  mfaSessionToken,
}: MFAVerificationScreenProps) {
  const { verifyMfa, loading, error, clearError } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [resendTimer, setResendTimer] = useState(0);
  const [verificationError, setVerificationError] = useState('');

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleCodeChange = (value: string, index: number) => {
    const newCode = [...code];
    
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;
    
    // Handle paste
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').split('');
      for (let i = 0; i < Math.min(digits.length, 6 - index); i++) {
        newCode[index + i] = digits[i];
      }
      setCode(newCode);
      
      // Focus last filled input
      const nextEmptyIndex = newCode.findIndex((v) => !v);
      const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
      inputRefs.current[focusIndex]?.focus();
      return;
    }

    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    setVerificationError('');
    const fullCode = code.join('');

    if (fullCode.length !== 6) {
      setVerificationError('Please enter all 6 digits');
      return;
    }

    try {
      await verifyMfa(mfaSessionToken, fullCode);
      // Navigation is handled by auth state change
    } catch (err) {
      setVerificationError('Invalid verification code. Please try again.');
    }
  };

  const handleResend = () => {
    // In a real app, you would call a resend API
    // For now, just reset the timer
    clearError();
    setVerificationError('');
    setCode(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    setResendTimer(30);
  };

  const fullCode = code.join('');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.title}>Two-Factor Authentication</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code from your authenticator app
          </Text>
        </View>

        <View style={styles.form}>
          {(error || verificationError) && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error || verificationError}</Text>
            </View>
          )}

          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.codeInput,
                  focusedIndex === index && styles.codeInputFocused,
                  digit && styles.codeInputFilled,
                ]}
                placeholder="0"
                placeholderTextColor={colors.textLight}
                value={digit}
                onChangeText={(value) => handleCodeChange(value, index)}
                keyboardType="number-pad"
                maxLength={1}
                editable={!loading}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(-1)}
                onKeyPress={(e) => handleKeyPress(e, index)}
              />
            ))}
          </View>

          <Button
            title="Verify Code"
            onPress={handleVerify}
            loading={loading}
            disabled={loading || fullCode.length !== 6}
          />

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResend}
              disabled={resendTimer > 0 || loading}
            >
              <Text
                style={[
                  styles.resendButtonText,
                  (resendTimer > 0 || loading) && styles.resendButtonDisabled,
                ]}
              >
                {resendTimer > 0 ? `Resend (${resendTimer}s)` : 'Resend'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
