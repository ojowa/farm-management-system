import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, colors } from '@/core/ui/UIComponents';
import { leaveAPI } from '@/services/api';
import { describeApiError } from '@/core/utils/apiError';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  content: { paddingHorizontal: 16, paddingVertical: 12 },
  balanceCard: { marginBottom: 16 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  balanceItem: { alignItems: 'center' },
  balanceValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  balanceLabel: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterBtnText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  filterBtnTextActive: { color: '#FFFFFF' },
  requestCard: { marginBottom: 12 },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  requestType: { fontSize: 15, fontWeight: '600', color: colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  requestDates: { fontSize: 13, color: colors.text, marginBottom: 2 },
  requestDays: { fontSize: 12, color: colors.textLight, marginBottom: 4 },
  requestReason: { fontSize: 13, color: colors.textLight, fontStyle: 'italic' },
  requestActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6 },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: colors.textLight, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: colors.text,
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  helper: { fontSize: 12, color: colors.textLight, marginTop: -8, marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
});

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  APPROVED: '#10B981',
  REJECTED: '#EF4444',
  CANCELLED: '#9CA3AF',
};

export default function LeaveScreen() {
  const [requests, setRequests] = useState<any[]>([]);
  const [balance, setBalance] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const params: any = {};
      if (filter !== 'all') params.status = filter.toUpperCase();
      const [reqRes, balRes, typeRes] = await Promise.all([
        leaveAPI.requests(params),
        leaveAPI.balance(),
        leaveAPI.types(),
      ]);
      setRequests(reqRes.data);
      setBalance(balRes.data);
      setLeaveTypes((typeRes.data || []).filter((t: any) => t.isActive));
    } catch (err) {
      if (__DEV__) console.warn('[LeaveScreen] Failed to load leave data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const openModal = () => {
    setEditingId(null);
    setLeaveTypeId(leaveTypes[0]?.id || '');
    setStartDate('');
    setEndDate('');
    setReason('');
    setShowModal(true);
  };

  const openEdit = (request: any) => {
    setEditingId(request.id);
    setLeaveTypeId(request.leaveTypeId || leaveTypes[0]?.id || '');
    setStartDate(String(request.startDate).slice(0, 10));
    setEndDate(String(request.endDate).slice(0, 10));
    setReason(request.reason || '');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!leaveTypeId || !startDate || !endDate) {
      Alert.alert('Error', 'Leave type, start date and end date are required');
      return;
    }
    setSaving(true);
    try {
      const payload = { leaveTypeId, startDate, endDate, reason: reason.trim() || undefined };
      if (editingId) {
        await leaveAPI.updateRequest(editingId, payload);
      } else {
        await leaveAPI.createRequest(payload);
      }
      setShowModal(false);
      setEditingId(null);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', describeApiError(err, editingId ? 'Failed to update leave request.' : 'Failed to submit leave request.'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (id: string) => {
    Alert.alert('Cancel Request', 'Cancel this leave request?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel request',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveAPI.cancel(id);
            await loadData();
          } catch (err: any) {
            Alert.alert('Error', describeApiError(err, 'Failed to cancel this request.'));
          }
        },
      },
    ]);
  };

  const totalRemaining = balance.reduce((sum, b) => sum + (b.remainingDays ?? 0), 0);
  const totalUsed = balance.reduce((sum, b) => sum + (b.usedDays ?? 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Leave</Text>
        <TouchableOpacity style={styles.addButton} onPress={openModal} accessibilityLabel="Request leave">
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            {balance.length > 0 && (
              <Card style={styles.balanceCard}>
                <Text style={styles.sectionTitle}>Balance</Text>
                <View style={styles.balanceRow}>
                  <View style={styles.balanceItem}>
                    <Text style={styles.balanceValue}>{totalRemaining}</Text>
                    <Text style={styles.balanceLabel}>Days remaining</Text>
                  </View>
                  <View style={styles.balanceItem}>
                    <Text style={styles.balanceValue}>{totalUsed}</Text>
                    <Text style={styles.balanceLabel}>Days used</Text>
                  </View>
                </View>
                {balance.map((b) => (
                  <View key={b.leaveTypeId} style={[styles.balanceRow, { marginTop: 10 }]}>
                    <Text style={{ fontSize: 13, color: colors.text }}>{b.leaveTypeName}</Text>
                    <Text style={{ fontSize: 13, color: colors.textLight }}>
                      {b.usedDays}/{b.totalDays} used
                    </Text>
                  </View>
                ))}
              </Card>
            )}
            <Text style={styles.sectionTitle}>Requests</Text>
            <View style={styles.filterRow}>
              {['all', 'pending', 'approved', 'rejected'].map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
                  accessibilityLabel={`Filter by ${f === 'all' ? 'all requests' : f}`}
                >
                  <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🏖️</Text>
              <Text style={styles.emptyText}>No leave requests</Text>
              <Text style={styles.emptySubtext}>Tap + to request time off</Text>
            </View>
          )
        }
        renderItem={({ item: request }) => (
          <Card style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <Text style={styles.requestType}>{request.leaveType?.name || 'Leave'}</Text>
              <View style={[styles.badge, { backgroundColor: STATUS_COLORS[request.status] || '#9CA3AF' }]}>
                <Text style={styles.badgeText}>{request.status}</Text>
              </View>
            </View>
            <Text style={styles.requestDates}>
              {new Date(request.startDate).toLocaleDateString()} — {new Date(request.endDate).toLocaleDateString()}
            </Text>
            <Text style={styles.requestDays}>
              {request.days} day{request.days !== 1 ? 's' : ''}
            </Text>
            {request.reason ? <Text style={styles.requestReason}>&ldquo;{request.reason}&rdquo;</Text> : null}
            {request.status === 'REJECTED' && request.rejectionReason ? (
              <Text style={[styles.requestReason, { color: '#DC2626', marginTop: 4 }]}>
                Rejected: {request.rejectionReason}
              </Text>
            ) : null}
            {request.status === 'PENDING' && (
              <View style={styles.requestActions}>
                <TouchableOpacity
                  onPress={() => openEdit(request)}
                  style={[styles.actionBtn, { backgroundColor: '#DCFCE7' }]}
                  accessibilityLabel="Edit leave request"
                >
                  <Text style={[styles.actionBtnText, { color: '#15803D' }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleCancel(request.id)}
                  style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
                  accessibilityLabel="Cancel leave request"
                >
                  <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        )}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Leave Request' : 'Request Leave'}</Text>
            <Text style={styles.label}>Leave Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {leaveTypes.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setLeaveTypeId(t.id)}
                  style={[styles.filterBtn, leaveTypeId === t.id && styles.filterBtnActive]}
                >
                  <Text style={[styles.filterBtnText, leaveTypeId === t.id && styles.filterBtnTextActive]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={startDate}
              onChangeText={setStartDate}
              placeholder="Start date (YYYY-MM-DD)"
              style={styles.input}
            />
            <TextInput
              value={endDate}
              onChangeText={setEndDate}
              placeholder="End date (YYYY-MM-DD)"
              style={styles.input}
            />
            <Text style={styles.helper}>Weekends are not counted as leave days.</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Reason (optional)"
              style={styles.input}
              multiline
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" onPress={() => setShowModal(false)} variant="secondary" style={{ flex: 1 }} />
              <Button title={saving ? 'Submitting...' : 'Submit'} onPress={handleSubmit} disabled={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
