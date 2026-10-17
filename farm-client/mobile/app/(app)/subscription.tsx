import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppSelector } from '@/modules/auth/hooks/useAuth';
import { usePermission } from '@/core/hooks/usePermission';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { subscriptionAPI } from '@/services/api';
import { Card, colors } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { describeApiError } from '@/core/utils/apiError';

interface PlanFeatures {
  modules: string[];
  farmTypes: string[];
  perks: string[];
}

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  price: number;
  currency: string;
  billingCycle: string;
  maxUsers: number;
  maxFarms: number;
  maxStorage: number;
  features: PlanFeatures;
}

interface BillingState {
  status: string;
  cancelReason: string | null;
  nextBillingDate: string | null;
  customerEmail: string | null;
}

interface PaymentRow {
  id: string;
  reference: string;
  planName: string;
  kind: string;
  amount: string | number;
  currency: string;
  status: string;
  channel: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface Subscription {
  status: string;
  organization: { id: string; name: string; planName: string };
  plan: Plan | null;
  usage: { farms: number; users: number };
  /** End of the paid period; null for free/comped orgs (never expires). */
  paidThrough?: string | null;
  billing?: BillingState | null;
}

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: '#16A34A' },
  TRIAL: { label: 'Trial', color: '#D97706' },
  SUSPENDED: { label: 'Suspended', color: '#DC2626' },
  CANCELLED: { label: 'Cancelled', color: '#6B7280' },
};

const PAYMENT_COLOR: Record<string, string> = {
  SUCCESS: '#16A34A',
  PENDING: '#D97706',
  FAILED: '#DC2626',
  ABANDONED: '#6B7280',
};

/** Plans use this sentinel for "no cap" in maxFarms/maxUsers. */
const UNLIMITED = 999999;
const capLabel = (n: number | undefined | null) =>
  n == null ? '—' : n >= UNLIMITED ? 'Unlimited' : String(n);

const friendly = (raw: string) => raw.charAt(0).toUpperCase() + raw.slice(1);

/** Currency-aware price: Intl renders each code's own symbol (₦, $, R…). */
const formatMoney = (amount: string | number, currency: string): string => {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value} ${currency}`;
  }
};

const formatDay = (iso: string) => new Date(iso).toLocaleDateString();

const priceLabel = (plan: Plan) => {
  const price = Number(plan.price) || 0;
  if (!(price > 0)) return 'Free';
  const amount = formatMoney(price, plan.currency || 'USD');
  const cycle = String(plan.billingCycle || 'MONTHLY').toUpperCase();
  if (cycle === 'NONE') return `${amount} one-time`;
  return `${amount}/${cycle === 'YEARLY' ? 'year' : 'month'}`;
};

/** Paid plans charge through Paystack checkout; free plans switch instantly. */
const isPaidPlan = (plan: Plan) => (Number(plan.price) || 0) > 0;
const isRecurring = (plan: Plan) =>
  isPaidPlan(plan) && String(plan.billingCycle || 'MONTHLY').toUpperCase() !== 'NONE';

/** The list endpoint returns raw rows; features may be the legacy `"[]"`. */
const normalizePlan = (raw: any): Plan => {
  const f = raw?.features && typeof raw.features === 'object' && !Array.isArray(raw.features) ? raw.features : {};
  const list = (v: any): string[] => (Array.isArray(v) ? v : []);
  return {
    ...raw,
    price: Number(raw?.price) || 0,
    features: { modules: list(f.modules), farmTypes: list(f.farmTypes), perks: list(f.perks) },
  };
};

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function UsageRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.usageRow}>
      <Text style={styles.usageLabel}>{label}</Text>
      <Text style={styles.usageValue}>{value}</Text>
    </View>
  );
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const { hasPermission } = usePermission();
  const { colors: themeColors } = useAppTheme();
  const user = useAppSelector((state) => state.auth.user);

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  // Live checkout: poll until Paystack settles the reference.
  const [checkout, setCheckout] = useState<{ reference: string; planName: string } | null>(null);
  const [billingBusy, setBillingBusy] = useState<'cancel' | 'resume' | null>(null);

  const canManage = hasPermission('billing.manage');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [snapshot, planList, paymentsRes] = await Promise.all([
        subscriptionAPI.current(),
        subscriptionAPI.listPlans(),
        // History is cosmetic — never block the screen if it fails.
        subscriptionAPI.payments(15).catch(() => null),
      ]);
      setSubscription(snapshot.data);
      setPlans(((planList.data as any[]) || []).map(normalizePlan));
      setPayments(((paymentsRes?.data as any)?.payments as PaymentRow[]) || []);
    } catch (err) {
      setLoadError(describeApiError(err, 'Could not load your subscription.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  const settleCheckout = useCallback(
    async (reference: string, planName: string) => {
      try {
        const res = await subscriptionAPI.checkoutStatus(reference);
        const status = String(res.data?.status || '').toUpperCase();
        if (status === 'SUCCESS') {
          setCheckout(null);
          Alert.alert('Payment confirmed', `Your ${planName} plan is now active.`);
          load();
        } else if (status === 'FAILED' || status === 'ABANDONED') {
          setCheckout(null);
          Alert.alert(
            status === 'FAILED' ? 'Payment failed' : 'Checkout not completed',
            'No charge was applied — you can try again.'
          );
          load();
        }
      } catch {
        // Transient verify error — keep polling until dismissed.
      }
    },
    [load]
  );

  // Poll while a checkout is in flight (webhooks settle it server-side;
  // this just reflects the result when the payment completes).
  useEffect(() => {
    if (!checkout) return;
    const interval = setInterval(
      () => settleCheckout(checkout.reference, checkout.planName),
      4000
    );
    return () => clearInterval(interval);
  }, [checkout, settleCheckout]);

  const confirmSwitch = (plan: Plan) => {
    Alert.alert(
      `Switch to ${plan.displayName} plan?`,
      `Your plan changes immediately: up to ${capLabel(plan.maxFarms)} farms and ${capLabel(plan.maxUsers)} users. Features outside the new plan's modules stop being available.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch plan',
          onPress: async () => {
            if (switching) return;
            setSwitching(true);
            try {
              await subscriptionAPI.changePlan(plan.id);
              await load();
              Alert.alert('Plan changed', `You are now on the ${plan.displayName} plan.`);
            } catch (err) {
              Alert.alert('Could not change the plan', describeApiError(err));
            } finally {
              setSwitching(false);
            }
          },
        },
      ]
    );
  };

  const beginCheckout = async (plan: Plan) => {
    if (switching) return;
    setSwitching(true);
    try {
      const res = await subscriptionAPI.checkout(plan.id);
      const authorizationUrl = res.data?.authorizationUrl as string | undefined;
      const reference = res.data?.reference as string | undefined;
      if (!authorizationUrl || !reference) throw new Error('Checkout did not start');
      setCheckout({ reference, planName: plan.displayName });
      await Linking.openURL(authorizationUrl);
      Alert.alert(
        'Paystack checkout opened',
        'Complete the payment in your browser — this screen updates automatically once it settles.'
      );
    } catch (err) {
      setCheckout(null);
      Alert.alert('Could not start checkout', describeApiError(err));
    } finally {
      setSwitching(false);
    }
  };

  const startCheckoutFlow = (plan: Plan) => {
    Alert.alert(
      `Subscribe to ${plan.displayName}?`,
      `${priceLabel(plan)} — you'll complete payment on Paystack's secure page.${
        isRecurring(plan) ? ' Renewals charge automatically until you cancel.' : ' This is a one-time purchase.'
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue to Paystack', onPress: () => beginCheckout(plan) },
      ]
    );
  };

  const doCancel = async () => {
    if (billingBusy) return;
    setBillingBusy('cancel');
    try {
      const res = await subscriptionAPI.cancel();
      const paidThrough = res.data?.paidThrough as string | null | undefined;
      Alert.alert(
        'Subscription cancelled',
        paidThrough
          ? `No further charges will be made. Access continues until ${formatDay(paidThrough)}.`
          : 'No further charges will be made.'
      );
      await load();
    } catch (err) {
      Alert.alert('Could not cancel the subscription', describeApiError(err));
    } finally {
      setBillingBusy(null);
    }
  };

  const confirmCancel = () => {
    Alert.alert(
      'Cancel subscription?',
      'Auto-renewal stops: no further Paystack charges will be made. Access continues until the paid-through date, then your organization drops to FREE.',
      [
        { text: 'Keep subscription', style: 'cancel' },
        { text: 'Cancel subscription', style: 'destructive', onPress: doCancel },
      ]
    );
  };

  const resumeBilling = async () => {
    if (billingBusy) return;
    setBillingBusy('resume');
    try {
      const res = await subscriptionAPI.resume();
      const paidThrough = res.data?.paidThrough as string | null | undefined;
      Alert.alert(
        'Subscription resumed',
        paidThrough ? `Paid through ${formatDay(paidThrough)}.` : 'Auto-renewal is on again.'
      );
      await load();
    } catch (err) {
      Alert.alert('Could not resume the subscription', describeApiError(err));
    } finally {
      setBillingBusy(null);
    }
  };

  const plan = subscription?.plan ?? null;
  const status = STATUS_STYLE[subscription?.status ?? ''] ?? {
    label: subscription?.status ?? '—',
    color: colors.text || '#6B7280',
  };
  const otherPlans = plans.filter((p) => p.id !== plan?.id);
  const billing = subscription?.billing ?? null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
      </View>

      {!canManage ? (
        <StateView
          variant="error"
          title="Not available"
          message="Only your organization's owner can manage the subscription."
        />
      ) : loading ? (
        <ScreenLoading message="Loading subscription..." />
      ) : loadError ? (
        <StateView
          variant="error"
          title="Couldn't load your subscription"
          message={loadError}
          onRetry={load}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Checkout in flight */}
          {checkout && (
            <Card style={[styles.card, styles.waitingCard]}>
              <Text style={styles.planName}>Waiting for payment…</Text>
              <Text style={styles.planDescription}>
                {checkout.planName} · reference {checkout.reference}. Complete the payment in your
                browser — this screen updates automatically once Paystack confirms.
              </Text>
              <View style={styles.waitingActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => settleCheckout(checkout.reference, checkout.planName)}
                  accessibilityRole="button"
                >
                  <Text style={styles.actionButtonText}>Check now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setCheckout(null)}
                  accessibilityRole="button"
                >
                  <Text style={styles.actionButtonText}>Stop waiting</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}

          {/* Current plan */}
          <Card style={styles.card}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{plan?.displayName ?? 'No plan linked'}</Text>
              {subscription && (
                <View style={[styles.statusChip, { borderColor: status.color }]}>
                  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
              )}
            </View>
            <Text style={styles.planPrice}>
              {plan
                ? priceLabel(plan)
                : 'No subscription plan is configured for your organization.'}
            </Text>
            {plan?.description ? <Text style={styles.planDescription}>{plan.description}</Text> : null}

            {plan && subscription && (
              <>
                <View style={styles.divider} />
                <UsageRow label="Farms" value={`${subscription.usage.farms} / ${capLabel(plan.maxFarms)}`} />
                <UsageRow label="Users" value={`${subscription.usage.users} / ${capLabel(plan.maxUsers)}`} />
                <UsageRow label="Storage" value={`Up to ${capLabel(plan.maxStorage)} MB`} />

                {/* Recurring billing state — paid-through comes from checkout
                    history; comps / never-checked-out orgs never auto-expire. */}
                <View style={styles.divider} />
                <Text style={styles.groupTitle}>Recurring billing</Text>
                <Text style={styles.planDescription}>
                  {subscription.paidThrough
                    ? `Paid through ${formatDay(subscription.paidThrough)}`
                    : 'No paid period — this organization never auto-expires.'}
                </Text>
                {billing && (
                  <Text style={styles.planDescription}>
                    Paystack {billing.status}
                    {billing.nextBillingDate
                      ? ` · next charge ${formatDay(billing.nextBillingDate)}`
                      : ''}
                    {billing.cancelReason ? ` · cancelled (${billing.cancelReason})` : ''}
                    {billing.customerEmail ? ` · ${billing.customerEmail}` : ''}
                  </Text>
                )}
                {billing &&
                  (billing.status === 'ACTIVE' ? (
                    <TouchableOpacity
                      style={[styles.outlineButton, billingBusy != null && styles.buttonDisabled]}
                      onPress={confirmCancel}
                      disabled={billingBusy != null}
                      accessibilityRole="button"
                    >
                      <Text style={styles.outlineButtonText}>
                        {billingBusy === 'cancel' ? 'Cancelling…' : 'Cancel subscription'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.outlineButton, billingBusy != null && styles.buttonDisabled]}
                      onPress={resumeBilling}
                      disabled={billingBusy != null}
                      accessibilityRole="button"
                    >
                      <Text style={styles.outlineButtonText}>
                        {billingBusy === 'resume' ? 'Resuming…' : 'Resume subscription'}
                      </Text>
                    </TouchableOpacity>
                  ))}

                {plan.features.modules.length > 0 && (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.groupTitle}>Included modules</Text>
                    <View style={styles.chipRow}>
                      {plan.features.modules.map((m) => (
                        <Chip key={m} label={friendly(m)} />
                      ))}
                    </View>
                  </>
                )}
                {plan.features.farmTypes.length > 0 && (
                  <>
                    <Text style={[styles.groupTitle, { marginTop: 12 }]}>Farm types</Text>
                    <View style={styles.chipRow}>
                      {plan.features.farmTypes.map((t) => (
                        <Chip key={t} label={t} />
                      ))}
                    </View>
                  </>
                )}
                {plan.features.perks.length > 0 && (
                  <>
                    <Text style={[styles.groupTitle, { marginTop: 12 }]}>Perks</Text>
                    <View style={styles.chipRow}>
                      {plan.features.perks.map((p) => (
                        <Chip key={p} label={friendly(p)} />
                      ))}
                    </View>
                  </>
                )}
              </>
            )}
          </Card>

          {/* Change plan */}
          <Text style={styles.sectionTitle}>Change plan</Text>
          <Text style={styles.muted}>Free plans switch instantly — paid plans open Paystack checkout.</Text>
          {otherPlans.length === 0 ? (
            <Text style={styles.muted}>No other plans are available.</Text>
          ) : (
            otherPlans.map((p) => (
              <Card key={p.id} style={styles.card}>
                <Text style={styles.planName}>{p.displayName}</Text>
                <Text style={styles.planPrice}>{priceLabel(p)}</Text>
                <Text style={styles.planDescription}>
                  {capLabel(p.maxFarms)} farms · {capLabel(p.maxUsers)} users
                </Text>
                <Text style={styles.planDescription}>
                  {p.features.modules.map(friendly).join(', ') || 'Core features only'}
                </Text>
                <TouchableOpacity
                  style={[styles.switchButton, (switching || checkout != null) && styles.switchButtonDisabled]}
                  onPress={() => (isPaidPlan(p) ? startCheckoutFlow(p) : confirmSwitch(p))}
                  disabled={switching || checkout != null}
                  accessibilityRole="button"
                  accessibilityLabel={`${isPaidPlan(p) ? 'Subscribe to' : 'Switch to'} ${p.displayName}`}
                >
                  <Text style={styles.switchButtonText}>
                    {switching
                      ? 'Working...'
                      : isPaidPlan(p)
                        ? `Subscribe to ${p.displayName}`
                        : `Switch to ${p.displayName}`}
                  </Text>
                </TouchableOpacity>
              </Card>
            ))
          )}

          {/* Billing history */}
          <Text style={styles.sectionTitle}>Billing history</Text>
          {payments.length === 0 ? (
            <Text style={styles.muted}>
              No payments yet — paid checkouts and renewals will appear here.
            </Text>
          ) : (
            <Card style={styles.card}>
              {payments.map((p, idx) => (
                <View
                  key={p.id}
                  style={[styles.paymentRow, idx === payments.length - 1 && styles.paymentRowLast]}
                >
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentPlan}>
                      {p.planName} · {p.kind}
                    </Text>
                    <Text style={styles.paymentMeta}>
                      {formatDay(p.paidAt || p.createdAt)} · {p.reference}
                    </Text>
                  </View>
                  <View style={styles.paymentRight}>
                    <Text style={styles.paymentAmount}>{formatMoney(p.amount, p.currency)}</Text>
                    <Text style={[styles.paymentStatus, { color: PAYMENT_COLOR[p.status] || '#6B7280' }]}>
                      {p.status}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { alignSelf: 'flex-start', marginBottom: 6 },
  backText: { fontSize: 16, color: '#FFFFFF', fontWeight: '500' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  content: { paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  card: { padding: 16, gap: 4 },
  waitingCard: { borderColor: '#16A34A', borderWidth: 1 },
  waitingActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  actionButtonText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  planName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statusChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  statusText: { fontSize: 12, fontWeight: '600' },
  planPrice: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 2 },
  planDescription: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  usageRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  usageLabel: { fontSize: 14, color: '#6B7280' },
  usageValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  groupTitle: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: { fontSize: 12, color: '#374151' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 8 },
  muted: { fontSize: 13, color: '#6B7280' },
  switchButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  switchButtonDisabled: { opacity: 0.6 },
  switchButtonText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  outlineButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  outlineButtonText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  buttonDisabled: { opacity: 0.6 },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  paymentRowLast: { borderBottomWidth: 0 },
  paymentInfo: { flex: 1, minWidth: 0 },
  paymentPlan: { fontSize: 14, fontWeight: '600', color: '#111827' },
  paymentMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  paymentRight: { alignItems: 'flex-end' },
  paymentAmount: { fontSize: 14, fontWeight: '700', color: '#111827' },
  paymentStatus: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});
