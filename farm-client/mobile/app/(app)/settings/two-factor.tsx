import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { authAPI } from '../../../src/modules/auth';
import { Button, Card, TextInputField } from '../../../src/core/ui/UIComponents';
import { useAppTheme } from '../../../src/core/theme/ThemeContext';
import { describeApiError } from '../../../src/core/utils/apiError';

export default function TwoFactorSettingsScreen() {
  const router = useRouter();
  const { colors: themeColors } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    authAPI.getPreferences()
      .then((response) => setEnabled(Boolean(response.data?.twoFactorEnabled)))
      .catch((error) => Alert.alert('Unable to load security settings', describeApiError(error)))
      .finally(() => setLoading(false));
  }, []);

  const startSetup = async () => {
    setSaving(true);
    try {
      const response = await authAPI.generate2FA();
      const generatedSecret = response.data?.secret;
      if (!generatedSecret) throw new Error('The server did not return a 2FA setup secret.');
      setSecret(generatedSecret);
      setCode('');
    } catch (error) {
      Alert.alert('Unable to set up 2FA', describeApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const enable = async () => {
    if (!/^\d{6}$/.test(code)) {
      Alert.alert('Invalid code', 'Enter the 6-digit code from your authenticator app.');
      return;
    }
    setSaving(true);
    try {
      await authAPI.enable2FA(code);
      setEnabled(true);
      setSecret('');
      setCode('');
      Alert.alert('Two-factor authentication enabled', 'Your account is now protected with an authenticator app.');
    } catch (error) {
      Alert.alert('Unable to enable 2FA', describeApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const disable = async () => {
    if (!/^\d{6}$/.test(code)) {
      Alert.alert('Verification required', 'Enter the current 6-digit authenticator code to disable 2FA.');
      return;
    }
    setSaving(true);
    try {
      await authAPI.disable2FA(code);
      setEnabled(false);
      setCode('');
      Alert.alert('Two-factor authentication disabled');
    } catch (error) {
      Alert.alert('Unable to disable 2FA', describeApiError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}>
        <Text onPress={() => router.back()} style={styles.back}>‹ Back</Text>
        <Text style={styles.headerTitle}>Two-factor authentication</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={styles.loading} color={themeColors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.card}>
            <Text style={[styles.status, { color: themeColors.text }]}>
              {enabled ? 'Two-factor authentication is enabled' : 'Two-factor authentication is disabled'}
            </Text>
            <Text style={[styles.help, { color: themeColors.textSecondary }]}>
              {enabled
                ? 'A current code from your authenticator app is required to disable this protection.'
                : 'Use an authenticator app to generate a code when signing in.'}
            </Text>
            {!enabled && !secret && (
              <Button title="Set up authenticator" onPress={startSetup} loading={saving} disabled={saving} />
            )}
            {!!secret && (
              <View style={styles.setup}>
                <Text style={[styles.help, { color: themeColors.text }]}>
                  Add this key to your authenticator app, then enter its current code:
                </Text>
                <Text selectable style={[styles.secret, { color: themeColors.text }]}>{secret}</Text>
                <TextInputField
                  label="6-digit code"
                  value={code}
                  onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="numeric"
                  autoComplete="one-time-code"
                />
                <Button title="Verify and enable" onPress={enable} loading={saving} disabled={saving} />
              </View>
            )}
            {enabled && (
              <View style={styles.setup}>
                <TextInputField
                  label="Current authenticator code"
                  value={code}
                  onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="numeric"
                  autoComplete="one-time-code"
                />
                <Button title="Disable 2FA" onPress={disable} loading={saving} disabled={saving} variant="secondary" />
              </View>
            )}
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 18 },
  back: { color: '#FFFFFF', fontSize: 16, marginBottom: 8 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  loading: { flex: 1 },
  content: { padding: 20 },
  card: { padding: 18 },
  status: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  help: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  setup: { gap: 12, marginTop: 16 },
  secret: { fontSize: 16, fontWeight: '700', padding: 12, backgroundColor: '#eeeeee', letterSpacing: 1 },
});
