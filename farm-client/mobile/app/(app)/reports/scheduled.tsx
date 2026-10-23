import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, colors } from '../../../src/core/ui/UIComponents';
import { useRouter } from 'expo-router';
import { scheduledReportsAPI } from '@/modules/reporting';
import type { ScheduledReport } from '@/modules/reporting';
import { unwrapList } from '@/core/utils/listPayload';
import { MenuButton } from '@/core/ui/MenuButton';
import { describeApiError } from '@/core/utils/apiError';
import { StateView } from '@/core/ui/feedback';
import { useAppTheme } from '@/core/theme/ThemeContext';

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
};
const FREQUENCIES = Object.keys(FREQUENCY_LABELS);
const TEMPLATES = ['farm-summary', 'crop-report', 'livestock-report', 'poultry-report', 'financial-report', 'inventory-report'];

export default function ScheduledReportsScreen() {
  const router = useRouter();
  const { colors: tc, isDark } = useAppTheme();
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [frequency, setFrequency] = useState('WEEKLY');
  const [recipients, setRecipients] = useState('');

  const loadReports = useCallback(async () => {
    try {
      setLoadError(null);
      const response = await scheduledReportsAPI.list();
      setReports(unwrapList<ScheduledReport>(response.data));
    } catch (error) {
      setLoadError(describeApiError(error, 'Failed to load scheduled reports.'));
    }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const onRefresh = () => { setRefreshing(true); loadReports(); };

  const createSchedule = async () => {
    const recipientList = recipients.split(',').map((value) => value.trim()).filter(Boolean);
    if (!name.trim() || recipientList.length === 0) {
      Alert.alert('Missing information', 'Enter a schedule name and at least one recipient email.');
      return;
    }
    setSaving(true);
    try {
      await scheduledReportsAPI.create({
        name: name.trim(),
        template,
        frequency,
        recipients: recipientList,
      });
      setShowCreate(false);
      setName('');
      setRecipients('');
      await loadReports();
    } catch (error) {
      Alert.alert('Could not create schedule', describeApiError(error, 'Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleSchedule = async (report: ScheduledReport) => {
    try {
      await scheduledReportsAPI.update(report.id, { isActive: !report.isActive });
      await loadReports();
    } catch (error) {
      Alert.alert('Could not update schedule', describeApiError(error, 'Please try again.'));
    }
  };

  const deleteSchedule = (report: ScheduledReport) => {
    Alert.alert('Delete schedule', `Delete "${report.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await scheduledReportsAPI.delete(report.id);
            await loadReports();
          } catch (error) {
            Alert.alert('Could not delete schedule', describeApiError(error, 'Please try again.'));
          }
        },
      },
    ]);
  };

  const dynamicStyles = {
    container: { backgroundColor: tc.background },
    cardBackground: {
      backgroundColor: tc.card,
      borderColor: isDark ? tc.border : 'transparent',
      borderWidth: isDark ? 1 : 0,
    },
    reportName: { color: tc.text },
    reportLabel: { color: tc.textSecondary },
    reportValue: { color: tc.text },
    emptyText: { color: tc.text },
    emptySubtext: { color: tc.textSecondary },
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <Header onBack={() => router.push('/reports')} />
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <Header onBack={() => router.push('/reports')} />
        <StateView
          variant="error"
          title="Couldn't load scheduled reports"
          message={loadError}
          onRetry={() => void loadReports()}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <Header onBack={() => router.push('/reports')} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {reports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No scheduled reports</Text>
            <Text style={[styles.emptySubtext, dynamicStyles.emptySubtext]}>Schedule a report to receive automatic updates</Text>
          </View>
        ) : (
          reports.map((report) => (
            <Card key={report.id} style={[styles.reportCard, dynamicStyles.cardBackground]}>
              <View style={styles.reportHeader}>
                <Text style={[styles.reportName, dynamicStyles.reportName]}>{report.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: report.isActive ? '#4CAF50' : '#9E9E9E' }]}>
                  <Text style={styles.statusText}>{report.isActive ? 'Active' : 'Paused'}</Text>
                </View>
              </View>
              {report.template && (
                <View style={styles.reportRow}>
                  <Text style={[styles.reportLabel, dynamicStyles.reportLabel]}>Template</Text>
                  <Text style={[styles.reportValue, dynamicStyles.reportValue]}>{report.template}</Text>
                </View>
              )}
              {report.frequency && (
                <View style={styles.reportRow}>
                  <Text style={[styles.reportLabel, dynamicStyles.reportLabel]}>Frequency</Text>
                  <Text style={[styles.reportValue, dynamicStyles.reportValue]}>
                    {FREQUENCY_LABELS[report.frequency] || report.frequency}
                  </Text>
                </View>
              )}
              {report.nextSend && (
                <View style={styles.reportRow}>
                  <Text style={[styles.reportLabel, dynamicStyles.reportLabel]}>Next Run</Text>
                  <Text style={[styles.reportValue, dynamicStyles.reportValue]}>
                    {new Date(report.nextSend).toLocaleDateString()}
                  </Text>
                </View>
              )}
              {report.lastSent && (
                <View style={styles.reportRow}>
                  <Text style={[styles.reportLabel, dynamicStyles.reportLabel]}>Last Run</Text>
                  <Text style={[styles.reportValue, dynamicStyles.reportValue]}>
                    {new Date(report.lastSent).toLocaleDateString()}
                  </Text>
                </View>
              )}
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => void toggleSchedule(report)} style={styles.actionButton}>
                  <Text style={styles.actionText}>{report.isActive ? 'Pause' : 'Resume'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteSchedule(report)} style={styles.actionButton}>
                  <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}

        <TouchableOpacity style={styles.scheduleButton} onPress={() => setShowCreate(true)}>
          <Text style={styles.scheduleButtonText}>+ Schedule Report</Text>
        </TouchableOpacity>
      </ScrollView>
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { backgroundColor: tc.card }]}>
            <Text style={[styles.modalTitle, { color: tc.text }]}>Schedule a report</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Schedule name"
              placeholderTextColor={tc.textSecondary}
              style={[styles.input, { color: tc.text, borderColor: tc.border }]}
            />
            <Text style={[styles.modalLabel, { color: tc.text }]}>Template</Text>
            <View style={styles.options}>
              {TEMPLATES.map((option) => (
                <TouchableOpacity key={option} onPress={() => setTemplate(option)} style={[styles.option, template === option && styles.selectedOption]}>
                  <Text style={[styles.optionText, { color: template === option ? '#FFFFFF' : tc.text }]}>{option.replace('-report', '')}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.modalLabel, { color: tc.text }]}>Frequency</Text>
            <View style={styles.options}>
              {FREQUENCIES.map((option) => (
                <TouchableOpacity key={option} onPress={() => setFrequency(option)} style={[styles.option, frequency === option && styles.selectedOption]}>
                  <Text style={[styles.optionText, { color: frequency === option ? '#FFFFFF' : tc.text }]}>{FREQUENCY_LABELS[option]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={recipients}
              onChangeText={setRecipients}
              placeholder="Recipient emails, separated by commas"
              placeholderTextColor={tc.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, { color: tc.text, borderColor: tc.border }]}
            />
            <Button title="Create schedule" onPress={createSchedule} loading={saving} disabled={saving} />
            <Button title="Cancel" onPress={() => setShowCreate(false)} variant="secondary" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  const { colors: tc } = useAppTheme();
  return (
    <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
      <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to reports">
        <Text style={styles.back}>‹</Text>
      </TouchableOpacity>
      <MenuButton />
      <View style={styles.headerCopy}>
        <Text style={styles.headerTitle}>Scheduled Reports</Text>
        <Text style={styles.headerSubtext}>Automated reports scheduled for generation</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  back: { color: '#FFFFFF', fontSize: 32, lineHeight: 34 },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  headerSubtext: { fontSize: 14, color: '#FFFFFF', opacity: 0.8, marginTop: 4 },
  content: { paddingHorizontal: 16, paddingVertical: 12 },
  reportCard: { marginBottom: 12 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  reportName: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  reportLabel: { fontSize: 13, color: colors.textLight },
  reportValue: { fontSize: 13, fontWeight: '500', color: colors.text },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: colors.textLight, textAlign: 'center' },
  scheduleButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  scheduleButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 18, marginTop: 14 },
  actionButton: { paddingVertical: 6, paddingHorizontal: 8 },
  actionText: { color: colors.primary, fontWeight: '700' },
  deleteText: { color: '#F44336' },
  modalBackdrop: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 18 },
  modal: { borderRadius: 14, padding: 18, gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalLabel: { fontSize: 14, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#888888' },
  selectedOption: { backgroundColor: colors.primary },
  optionText: { fontSize: 12, textTransform: 'capitalize' },
});
