import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { usePermission } from '../../hooks/usePermission';
import { Card, Button, colors } from '../../components/common/UIComponents';
import { leaveAPI } from '../../services/api';

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
  tabs: { flexDirection: 'row', gap: 16, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 },
  tab: { paddingBottom: 4 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: 14, color: colors.textLight, fontWeight: '500' },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterBtnText: { fontSize: 12, color: colors.text },
  filterBtnTextActive: { color: '#FFFFFF' },
  card: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#FFFFFF' },
  cardMeta: { fontSize: 13, color: colors.textLight },
  cardReason: { fontSize: 12, color: colors.textLight, marginTop: 4 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceName: { fontSize: 15, fontWeight: '600', color: colors.text },
  balanceStats: { flexDirection: 'row', gap: 16 },
  balanceStat: { alignItems: 'center' },
  balanceLabel: { fontSize: 10, color: colors.textLight },
  balanceValue: { fontSize: 16, fontWeight: '700' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: colors.textLight, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14, color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  select: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: '#FFFFFF' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
});

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  APPROVED: '#10B981',
  REJECTED: '#EF4444',
  CANCELLED: '#9CA3AF',
};

export default function LeaveScreen() {
  const { canApprove } = usePermission();
  const canManage = canApprove('leave');

  const [tab, setTab] = useState<'requests' | 'balance'>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [balance, setBalance] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [reqRes, balRes, typeRes] = await Promise.all([
        leaveAPI.requests(),
        leaveAPI.balance(),
        leaveAPI.types(),
      ]);
      setRequests(reqRes.data);
      setBalance(balRes.data);
      setLeaveTypes(typeRes.data.filter((t: any) => t.isActive));
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleSubmit = async () => {
    if (!selectedType || !startDate || !endDate) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    setSaving(true);
    try {
      await leaveAPI.createRequest({
        leaveTypeId: selectedType,
        startDate,
        endDate,
        reason: reason || undefined,
      });
      setShowModal(false);
      setSelectedType('');
      setStartDate('');
      setEndDate('');
      setReason('');
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to submit');
    } finally { setSaving(false); }
  };

  const handleCancel = (id: string) => {
    Alert.alert('Cancel Request', 'Cancel this leave request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            await leaveAPI.cancel(id);
            await loadData();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error || 'Failed');
          }
        },
      },
    ]);
  };

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter.toUpperCase());

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leave</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.tabs}>
          <TouchableOpacity onPress={() => setTab('requests')} style={[styles.tab, tab === 'requests' && styles.tabActive]}>
            <Text style={[styles.tabText, tab === 'requests' && styles.tabTextActive]}>My Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('balance')} style={[styles.tab, tab === 'balance' && styles.tabActive]}>
            <Text style={[styles.tabText, tab === 'balance' && styles.tabTextActive]}>My Balance</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : tab === 'requests' ? (
          <>
            <View style={styles.filterRow}>
              {['all', 'pending', 'approved', 'rejected'].map((f) => (
                <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.filterBtn, filter === f && styles.filterBtnActive]}>
                  <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {filtered.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🏖️</Text>
                <Text style={styles.emptyText}>No leave requests</Text>
                <Text style={styles.emptySubtext}>Tap + to request leave</Text>
              </View>
            ) : (
              filtered.map((req) => (
                <Card key={req.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{req.leaveType?.name || 'Unknown'}</Text>
                    <View style={[styles.badge, { backgroundColor: STATUS_COLORS[req.status] || '#9CA3AF' }]}>
                      <Text style={styles.badgeText}>{req.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardMeta}>
                    {req.days} day{req.days !== 1 ? 's' : ''} · {new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate).toLocaleDateString()}
                  </Text>
                  {req.reason ? <Text style={styles.cardReason}>{req.reason}</Text> : null}
                  {req.rejectionReason ? <Text style={[styles.cardReason, { color: '#EF4444' }]}>Rejected: {req.rejectionReason}</Text> : null}
                  {req.status === 'PENDING' && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity onPress={() => handleCancel(req.id)} style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}>
                        <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              ))
            )}
          </>
        ) : (
          balance.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No balance configured</Text>
            </View>
          ) : (
            balance.map((b) => (
              <Card key={b.leaveTypeId} style={styles.card}>
                <View style={styles.balanceRow}>
                  <View>
                    <Text style={styles.balanceName}>{b.leaveTypeName}</Text>
                    <Text style={{ fontSize: 12, color: colors.textLight }}>{b.isPaid ? 'Paid' : 'Unpaid'}</Text>
                  </View>
                  <View style={styles.balanceStats}>
                    <View style={styles.balanceStat}>
                      <Text style={styles.balanceLabel}>Total</Text>
                      <Text style={[styles.balanceValue, { color: colors.text }]}>{b.totalDays}</Text>
                    </View>
                    <View style={styles.balanceStat}>
                      <Text style={styles.balanceLabel}>Used</Text>
                      <Text style={[styles.balanceValue, { color: '#F59E0B' }]}>{b.usedDays}</Text>
                    </View>
                    <View style={styles.balanceStat}>
                      <Text style={styles.balanceLabel}>Left</Text>
                      <Text style={[styles.balanceValue, { color: '#10B981' }]}>{b.remainingDays}</Text>
                    </View>
                  </View>
                </View>
              </Card>
            ))
          )
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Leave</Text>
            <Text style={styles.label}>Leave Type</Text>
            <View style={styles.select}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity onPress={() => setSelectedType('')} style={[styles.filterBtn, !selectedType && styles.filterBtnActive, { marginRight: 8 }]}>
                  <Text style={[styles.filterBtnText, !selectedType && styles.filterBtnTextActive]}>Select</Text>
                </TouchableOpacity>
                {leaveTypes.map((t) => (
                  <TouchableOpacity key={t.id} onPress={() => setSelectedType(t.id)} style={[styles.filterBtn, selectedType === t.id && styles.filterBtnActive, { marginRight: 8 }]}>
                    <Text style={[styles.filterBtnText, selectedType === t.id && styles.filterBtnTextActive]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <TextInput value={startDate} onChangeText={setStartDate} placeholder="Start date (YYYY-MM-DD)" style={styles.input} />
            <TextInput value={endDate} onChangeText={setEndDate} placeholder="End date (YYYY-MM-DD)" style={styles.input} />
            <TextInput value={reason} onChangeText={setReason} placeholder="Reason (optional)" style={styles.input} />
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
