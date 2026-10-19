import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { StateView } from '@/core/ui/feedback';
import { MenuButton } from '@/core/ui/MenuButton';
import { leaveAPI } from '@/modules/hr';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { usePermission } from '@/core/hooks/usePermission';
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
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  headerAction: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  headerActionText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  headerActionActive: { backgroundColor: '#FFFFFF' },
  headerActionActiveText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingVertical: 12 },
  balanceCard: { marginBottom: 16 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  balanceItem: { alignItems: 'center' },
  balanceValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  balanceLabel: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  yearRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
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
  requesterName: { fontSize: 12, color: colors.textLight, marginBottom: 2 },
  requestType: { fontSize: 15, fontWeight: '600', color: colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  requestDates: { fontSize: 13, color: colors.text, marginBottom: 2 },
  requestDays: { fontSize: 12, color: colors.textLight, marginBottom: 4 },
  requestReason: { fontSize: 13, color: colors.textLight, fontStyle: 'italic' },
  requestActions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6 },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  selectBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  selectBoxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  selectCheck: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', lineHeight: 15 },
  bulkBar: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  bulkCount: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' },
  onLeaveCard: { marginBottom: 16 },
  onLeaveRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  onLeaveName: { fontSize: 14, color: colors.text, fontWeight: '600' },
  onLeaveMeta: { fontSize: 12, color: colors.textLight },
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
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  ledgerName: { fontSize: 14, color: colors.text, flex: 1 },
  ledgerValue: { fontSize: 13, color: colors.textLight, marginLeft: 8 },
  pickerChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
});

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  APPROVED: '#10B981',
  REJECTED: '#EF4444',
  CANCELLED: '#9CA3AF',
};

const THIS_YEAR = new Date().getFullYear();

function unwrapList<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.records)) return payload.records;
  return [];
}

export default function LeaveScreen() {
  const { user } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermission();

  // Server: approvals/bulk accept hr.write OR leave.approve; the org-wide
  // on-leave list and team ledger are hr.read only.
  const canApprove = hasAnyPermission('hr.write', 'leave.approve');
  const canReadOrg = hasPermission('hr.read');
  const isManager = hasPermission('hr.write');

  const [requests, setRequests] = useState<any[]>([]);
  const [balance, setBalance] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [year, setYear] = useState<number>(THIS_YEAR);
  const [showModal, setShowModal] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Manager extras: who's off today + the team leave ledger.
  const [onLeave, setOnLeave] = useState<any[]>([]);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledger, setLedger] = useState<any[] | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Bulk decisions over the pending queue.
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const yearOptions = useMemo(() => [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1], []);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const params: any = {};
      if (filter !== 'all') params.status = filter.toUpperCase();
      params.year = year;
      const [reqRes, balRes, typeRes] = await Promise.all([
        leaveAPI.requests(params),
        leaveAPI.balance({ year }),
        leaveAPI.types(),
      ]);
      setRequests(unwrapList<any>(reqRes.data));
      setBalance(unwrapList<any>(balRes.data));
      setLeaveTypes(unwrapList<any>(typeRes.data).filter((t: any) => t.isActive));
    } catch (err: any) {
      // Surface the failure — a silent catch renders as a false "No leave
      // requests" empty state.
      setLoadError(describeApiError(err, "Couldn't load leave data"));
      if (__DEV__) console.warn('[LeaveScreen] Failed to load leave data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, year]);

  useEffect(() => { loadData(); }, [loadData]);

  // Who's off today — hr.read only, and never a blocker for the main list.
  useEffect(() => {
    if (!canReadOrg) return;
    leaveAPI
      .onLeave()
      .then((res: any) => setOnLeave(unwrapList<any>(res.data)))
      .catch(() => {
        if (__DEV__) console.warn('[LeaveScreen] Failed to load on-leave list');
      });
  }, [canReadOrg]);

  const openLedger = async () => {
    setLedgerOpen(true);
    setLedgerLoading(true);
    try {
      const res = await leaveAPI.allBalances({ year });
      setLedger(unwrapList<any>(res.data));
    } catch (err: any) {
      setLedger([]);
      Alert.alert("Couldn't load team balances", describeApiError(err, 'Please try again.'));
    } finally {
      setLedgerLoading(false);
    }
  };

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

  // Cancel is requester-only server-side — only ever offer it for own rows.
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

  const handleApprove = async (id: string) => {
    try {
      await leaveAPI.approve(id);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', describeApiError(err, 'Failed to approve this request.'));
    }
  };

  const handleReject = (id: string) => {
    Alert.alert('Reject Request', 'Reject this leave request?', [
      { text: 'Keep Pending', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            // No reason prompt on mobile: Alert.prompt is iOS-only, so a
            // half-supported prompt would strand Android users.
            await leaveAPI.reject(id, {});
            await loadData();
          } catch (err: any) {
            Alert.alert('Error', describeApiError(err, 'Failed to reject this request.'));
          }
        },
      },
    ]);
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitBulk = () => {
    setBulkMode(false);
    setSelected(new Set());
  };

  const handleBulk = (action: 'approve' | 'reject') => {
    const ids = [...selected];
    if (ids.length === 0) return;
    Alert.alert(
      action === 'approve' ? 'Approve Requests' : 'Reject Requests',
      `${action === 'approve' ? 'Approve' : 'Reject'} ${ids.length} request${ids.length === 1 ? '' : 's'}?`,
      [
        { text: 'Back', style: 'cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Reject',
          style: action === 'approve' ? 'default' : 'destructive',
          onPress: async () => {
            setBulkBusy(true);
            try {
              const res = await leaveAPI.bulkDecide({ ids, action });
              const data: any = res.data ?? {};
              const failed = Array.isArray(data.failures) ? data.failures.length : 0;
              if (failed > 0) {
                Alert.alert('Partly done', `${ids.length - failed} succeeded, ${failed} failed.`);
              }
              exitBulk();
              await loadData();
            } catch (err: any) {
              Alert.alert('Error', describeApiError(err, 'Failed to apply the bulk decision.'));
            } finally {
              setBulkBusy(false);
            }
          },
        },
      ]
    );
  };

  const isOwn = (request: any) => (request.userId ? request.userId === user?.id : true);
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  const totalRemaining = balance.reduce((sum, b) => sum + (b.remainingDays ?? 0), 0);
  const totalUsed = balance.reduce((sum, b) => sum + (b.usedDays ?? 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MenuButton />
        <Text style={[styles.headerTitle, { marginLeft: 8 }]}>Leave</Text>
        {canApprove && pendingCount > 0 && (
          <TouchableOpacity
            style={[styles.headerAction, bulkMode && styles.headerActionActive]}
            onPress={() => (bulkMode ? exitBulk() : setBulkMode(true))}
            accessibilityLabel={bulkMode ? 'Exit bulk mode' : 'Bulk decide pending requests'}
          >
            <Text style={[styles.headerActionText, bulkMode && styles.headerActionActiveText]}>
              {bulkMode ? 'Done' : 'Bulk'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.headerAction} onPress={openModal} accessibilityLabel="Request leave">
          <Text style={styles.headerActionText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            {/* Who's off today — an hr.read extra, never a blocker. */}
            {canReadOrg && onLeave.length > 0 && (
              <Card style={styles.onLeaveCard}>
                <Text style={styles.sectionTitle}>Off Today</Text>
                {onLeave.slice(0, 5).map((p: any, i: number) => (
                  <View key={`${p.name ?? i}-${i}`} style={styles.onLeaveRow}>
                    <Text style={styles.onLeaveName}>{p.name || p.requesterName || 'Worker'}</Text>
                    <Text style={styles.onLeaveMeta}>
                      {[p.leaveType?.name || p.leaveType, p.position].filter(Boolean).join(' · ') || 'On leave'}
                    </Text>
                  </View>
                ))}
                {onLeave.length > 5 && (
                  <Text style={styles.onLeaveMeta}>+{onLeave.length - 5} more</Text>
                )}
              </Card>
            )}

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
                {canReadOrg && (
                  <TouchableOpacity onPress={openLedger} accessibilityLabel="View team leave balances" style={{ marginTop: 12 }}>
                    <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>
                      Team balances →
                    </Text>
                  </TouchableOpacity>
                )}
              </Card>
            )}

            <Text style={styles.sectionTitle}>Requests</Text>
            <View style={styles.yearRow}>
              {yearOptions.map((y) => (
                <TouchableOpacity
                  key={y}
                  onPress={() => setYear(y)}
                  style={[styles.filterBtn, year === y && styles.filterBtnActive]}
                  accessibilityLabel={`Show ${y}`}
                >
                  <Text style={[styles.filterBtnText, year === y && styles.filterBtnTextActive]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
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

            {bulkMode && (
              <View style={styles.bulkBar}>
                <Text style={styles.bulkCount}>
                  {selected.size} of {pendingCount} pending selected
                </Text>
                <TouchableOpacity
                  onPress={() => setSelected(new Set(requests.filter((r) => r.status === 'PENDING').map((r) => r.id)))}
                  accessibilityLabel="Select all pending"
                >
                  <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleBulk('approve')}
                  disabled={bulkBusy || selected.size === 0}
                  style={[styles.actionBtn, { backgroundColor: '#DCFCE7', opacity: bulkBusy || selected.size === 0 ? 0.5 : 1 }]}
                  accessibilityLabel="Approve selected"
                >
                  <Text style={[styles.actionBtnText, { color: '#15803D' }]}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleBulk('reject')}
                  disabled={bulkBusy || selected.size === 0}
                  style={[styles.actionBtn, { backgroundColor: '#FEE2E2', opacity: bulkBusy || selected.size === 0 ? 0.5 : 1 }]}
                  accessibilityLabel="Reject selected"
                >
                  <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : loadError ? (
            <StateView
              variant="error"
              title="Couldn't load leave"
              message={loadError}
              onRetry={() => { setLoading(true); loadData(); }}
              retryLabel="Try Again"
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🏖️</Text>
              <Text style={styles.emptyText}>
                {filter !== 'all' || year !== THIS_YEAR ? 'No matching leave requests' : 'No leave requests'}
              </Text>
              <Text style={styles.emptySubtext}>
                {filter !== 'all' || year !== THIS_YEAR
                  ? 'Try a different year or filter.'
                  : 'Tap + to request time off'}
              </Text>
            </View>
          )
        }
        renderItem={({ item: request }) => {
          const own = isOwn(request);
          const selectedRow = selected.has(request.id);
          const requester = request.requesterName;
          return (
            <Card
              style={styles.requestCard}
              onPress={bulkMode && request.status === 'PENDING' && canApprove ? () => toggleSelected(request.id) : undefined}
            >
              {bulkMode && request.status === 'PENDING' && canApprove && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={[styles.selectBox, selectedRow && styles.selectBoxOn]}>
                    {selectedRow && <Text style={styles.selectCheck}>✓</Text>}
                  </View>
                  <Text style={styles.requesterName}>Select {requester || 'this request'}</Text>
                </View>
              )}
              {requester && !own && (
                <Text style={styles.requesterName}>{requester}</Text>
              )}
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
              {request.status === 'APPROVED' && request.approvedAt ? (
                <Text style={[styles.requestDays, { color: '#15803D' }]}>
                  Approved {new Date(request.approvedAt).toLocaleDateString()}
                </Text>
              ) : null}

              {/* Approvals — hr.write or leave.approve */}
              {canApprove && request.status === 'PENDING' && !bulkMode && (
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    onPress={() => handleApprove(request.id)}
                    style={[styles.actionBtn, { backgroundColor: '#DCFCE7' }]}
                    accessibilityLabel={`Approve ${requester || 'request'}`}
                  >
                    <Text style={[styles.actionBtnText, { color: '#15803D' }]}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleReject(request.id)}
                    style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
                    accessibilityLabel={`Reject ${requester || 'request'}`}
                  >
                    <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Own request management (or any row for hr.write holders) */}
              {request.status === 'PENDING' && !bulkMode && (own || isManager) && (
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    onPress={() => openEdit(request)}
                    style={[styles.actionBtn, { backgroundColor: '#DCFCE7' }]}
                    accessibilityLabel="Edit leave request"
                  >
                    <Text style={[styles.actionBtnText, { color: '#15803D' }]}>Edit</Text>
                  </TouchableOpacity>
                  {own && (
                    <TouchableOpacity
                      onPress={() => handleCancel(request.id)}
                      style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
                      accessibilityLabel="Cancel leave request"
                    >
                      <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </Card>
          );
        }}
      />

      {/* Request / edit modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Leave Request' : 'Request Leave'}</Text>
            <Text style={styles.label}>Leave Type</Text>
            <View style={styles.pickerChipRow}>
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

      {/* Team balances ledger (hr.read) */}
      <Modal visible={ledgerOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Team Balances — {year}</Text>
            {ledgerLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 24 }} />
            ) : !ledger || ledger.length === 0 ? (
              <Text style={styles.emptySubtext}>No balance rows for {year}.</Text>
            ) : (
              ledger.map((row: any, i: number) => (
                <View key={row.userId || row.id || i} style={styles.ledgerRow}>
                  <Text style={styles.ledgerName}>
                    {row.userName || row.workerName || row.name || row.userId || 'Worker'}
                  </Text>
                  <Text style={styles.ledgerValue}>
                    {row.leaveTypeName ? `${row.leaveTypeName} · ` : ''}
                    {row.usedDays ?? 0}/{row.totalDays ?? 0} used
                  </Text>
                </View>
              ))
            )}
            <View style={styles.modalActions}>
              <Button title="Close" variant="secondary" onPress={() => setLedgerOpen(false)} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
