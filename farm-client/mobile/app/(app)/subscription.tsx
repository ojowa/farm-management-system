import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

interface Subscription {
  status: string;
  organization: { id: string; name: string; planName: string };
  plan: Plan | null;
  usage: { farms: number; users: number };
}

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: '#16A34A' },
  TRIAL: { label: 'Trial', color: '#D97706' },
  SUSPENDED: { label: 'Suspended', color: '#DC2626' },
  CANCELLED: { label: 'Cancelled', color: '#6B7280' },
};

/** Plans use this sentinel for "no cap" in maxFarms/maxUsers. */
const UNLIMITED = 999999;
const capLabel = (n: number | undefined | null) =>
  n == null ? '—' : n >= UNLIMITED ? 'Unlimited' : String(n);

const friendly = (raw: string) => raw.charAt(0).toUpperCase() + raw.slice(1);

const priceLabel = (plan: Plan) => {
  const price = Number(plan.price) || 0;
  const amount = `${plan.currency || 'USD'} ${price % 1 === 0 ? price : price.toFixed(2)}`;
  return plan.billingCycle === 'MONTHLY' ? `${amount}/month` : amount;
};

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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  const canManage = hasPermission('billing.manage');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [snapshot, planList] = await Promise.all([
        subscriptionAPI.current(),
        subscriptionAPI.listPlans(),
      ]);
      setSubscription(snapshot.data);
      setPlans(((planList.data as any[]) || []).map(normalizePlan));
    } catch (err) {
      setLoadError(describeApiError(err, 'Could not load your subscription.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

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

  const plan = subscription?.plan ?? null;
  const status = STATUS_STYLE[subscription?.status ?? ''] ?? {
    label: subscription?.status ?? '—',
    color: colors.text || '#6B7280',
  };
  const otherPlans = plans.filter((p) => p.id !== plan?.id);

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
                ? `${priceLabel(plan)}${plan.billingCycle === 'MONTHLY' ? ' · billed monthly' : ''}`
                : 'No subscription plan is configured for your organization.'}
            </Text>
            {plan?.description ? <Text style={styles.planDescription}>{plan.description}</Text> : null}

            {plan && subscription && (
              <>
                <View style={styles.divider} />
                <UsageRow label="Farms" value={`${subscription.usage.farms} / ${capLabel(plan.maxFarms)}`} />
                <UsageRow label="Users" value={`${subscription.usage.users} / ${capLabel(plan.maxUsers)}`} />
                <UsageRow label="Storage" value={`Up to ${capLabel(plan.maxStorage)} MB`} />

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
                  style={[styles.switchButton, switching && styles.switchButtonDisabled]}
                  onPress={() => confirmSwitch(p)}
                  disabled={switching}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${p.displayName}`}
                >
                  <Text style={styles.switchButtonText}>
                    {switching ? 'Switching...' : `Switch to ${p.displayName}`}
                  </Text>
                </TouchableOpacity>
              </Card>
            ))
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
});
