import React, { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { farmTransferAPI } from '@/modules/farm';
import { Button, Card } from '@/core/ui/UIComponents';
import { MenuButton } from '@/core/ui/MenuButton';
import { usePermission } from '@/core/hooks/usePermission';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { describeApiError } from '@/core/utils/apiError';

export default function FarmDataTransferScreen() {
  const router = useRouter();
  const { colors: themeColors } = useAppTheme();
  const { hasPermission } = usePermission();
  const canImport = hasPermission('farm.write');
  const canExport = hasPermission('farm.read');
  const [jsonText, setJsonText] = useState('');
  const [busy, setBusy] = useState(false);

  const exportFarms = async () => {
    setBusy(true);
    try {
      const response = await farmTransferAPI.exportFarms();
      const payload = response.data?.data ?? response.data;
      await Share.share({ title: 'Farm records export', message: JSON.stringify(payload, null, 2) });
    } catch (error) {
      Alert.alert('Export failed', describeApiError(error, 'Could not export farm records.'));
    } finally {
      setBusy(false);
    }
  };

  const importFarms = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      Alert.alert('Invalid JSON', 'Paste a valid JSON export or an array of farm records.');
      return;
    }
    const rows = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as { data?: unknown }).data)
        ? (parsed as { data: unknown[] }).data
        : null;
    if (!rows?.length || rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
      Alert.alert('Invalid farm data', 'The JSON must contain a non-empty array of farm records.');
      return;
    }
    setBusy(true);
    try {
      const response = await farmTransferAPI.importFarms(rows as Record<string, unknown>[]);
      setJsonText('');
      Alert.alert('Import complete', `${response.data?.imported ?? rows.length} farm records imported.`);
    } catch (error) {
      Alert.alert('Import failed', describeApiError(error, 'Could not import farm records.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>‹</Text></TouchableOpacity>
        <MenuButton />
        <Text style={styles.headerTitle}>Farm data transfer</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {canExport && (
          <Card style={[styles.card, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.title, { color: themeColors.text }]}>Export farms</Text>
            <Text style={[styles.description, { color: themeColors.textSecondary }]}>
              Share a JSON backup of the farms in your organization.
            </Text>
            <Button title="Export JSON" onPress={exportFarms} loading={busy} disabled={busy} />
          </Card>
        )}
        {canImport && (
          <Card style={[styles.card, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.title, { color: themeColors.text }]}>Import farms</Text>
            <Text style={[styles.description, { color: themeColors.textSecondary }]}>
              Paste a JSON array or an exported object containing a data array. The server validates each record and assigns it to your organization.
            </Text>
            <TextInput
              value={jsonText}
              onChangeText={setJsonText}
              multiline
              autoCapitalize="none"
              placeholder='[{"name":"North Field","farmType":"CROP","size":5,"location":"..."}]'
              placeholderTextColor={themeColors.textSecondary}
              style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]}
              textAlignVertical="top"
            />
            <Button title="Import JSON" onPress={importFarms} loading={busy} disabled={busy || !jsonText.trim()} />
          </Card>
        )}
        {!canImport && !canExport && (
          <Text style={[styles.description, { color: themeColors.textSecondary }]}>
            You do not have permission to import or export farm records.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  back: { color: '#FFFFFF', fontSize: 32 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  content: { padding: 16, gap: 14 },
  card: { padding: 16, gap: 12 },
  title: { fontSize: 17, fontWeight: '700' },
  description: { fontSize: 13, lineHeight: 19 },
  input: { minHeight: 180, maxHeight: 320, borderWidth: 1, borderRadius: 8, padding: 12, fontFamily: 'monospace' },
});
