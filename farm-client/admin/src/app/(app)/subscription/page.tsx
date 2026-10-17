'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, HardDrive, Sprout, Users as UsersIcon } from 'lucide-react';
import { subscriptionAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { usePermission } from '@/lib/usePermission';
import { useToast, getErrorMessage } from '@/lib/toasts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

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

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  ACTIVE: { label: 'Active', variant: 'success' },
  TRIAL: { label: 'Trial', variant: 'warning' },
  SUSPENDED: { label: 'Suspended', variant: 'destructive' },
  CANCELLED: { label: 'Cancelled', variant: 'secondary' },
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

function UsageMeter({
  icon: Icon,
  label,
  used,
  cap,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  used?: number;
  cap?: number;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-1 text-xl font-semibold">
        {used != null ? `${used} / ${capLabel(cap)}` : `Up to ${capLabel(cap)}`}
      </p>
    </div>
  );
}

export default function SubscriptionPage() {
  const { hasPermission } = usePermission();
  const { refreshUser } = useAuth();
  const { toast } = useToast();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);
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
      setLoadError(getErrorMessage(err, 'Could not load your subscription.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  const confirmSwitch = async () => {
    if (!pendingPlan) return;
    setSwitching(true);
    try {
      const res = await subscriptionAPI.changePlan(pendingPlan.id);
      setSubscription(res.data);
      // Entitlements changed: re-gate the sidebar and pickers immediately
      // instead of waiting for the next full reload.
      refreshUser().catch(() => {});
      toast({ type: 'success', title: `Switched to the ${pendingPlan.displayName} plan` });
      setPendingPlan(null);
    } catch (err) {
      toast({ type: 'error', title: getErrorMessage(err, 'Could not change the plan.') });
    } finally {
      setSwitching(false);
    }
  };

  // The sidebar and AppLayout already hide this view without the permission;
  // this keeps the page itself honest if it is reached directly.
  if (!canManage) {
    return (
      <div className="text-center py-12 text-gray-500">
        You don&apos;t have permission to manage your organization&apos;s subscription
      </div>
    );
  }

  const plan = subscription?.plan ?? null;
  const status = STATUS_BADGE[subscription?.status ?? ''] ?? {
    label: subscription?.status ?? '—',
    variant: 'secondary' as const,
  };
  const otherPlans = plans.filter((p) => p.id !== plan?.id);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
          <p className="text-muted-foreground">
            Your plan, entitlements, and usage — owner-only
          </p>
        </div>
        {subscription && <Badge variant={status.variant}>{status.label}</Badge>}
      </div>

      {loading && <div className="py-12 text-center text-gray-500">Loading subscription…</div>}

      {loadError && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
            <Button variant="outline" size="sm" onClick={load}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !loadError && subscription && (
        <>
          {/* Current plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" aria-hidden="true" />
                {plan?.displayName ?? 'No plan linked'}
              </CardTitle>
              <CardDescription>
                {plan
                  ? `${priceLabel(plan)}${plan.billingCycle === 'MONTHLY' ? ' · billed monthly' : ''}`
                  : 'No subscription plan is configured for your organization — contact support.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {plan?.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{plan.description}</p>
              )}

              {plan && (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <UsageMeter icon={Sprout} label="Farms" used={subscription.usage.farms} cap={plan.maxFarms} />
                    <UsageMeter icon={UsersIcon} label="Users" used={subscription.usage.users} cap={plan.maxUsers} />
                    <UsageMeter icon={HardDrive} label="Storage" cap={plan.maxStorage} />
                  </div>

                  <div className="space-y-3">
                    <EntitlementGroup title="Included modules" items={plan.features.modules.map(friendly)} />
                    <EntitlementGroup title="Farm types" items={plan.features.farmTypes} />
                    {plan.features.perks.length > 0 && (
                      <EntitlementGroup title="Perks" items={plan.features.perks.map(friendly)} />
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Change plan */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">Change plan</h2>
            {otherPlans.length === 0 ? (
              <p className="text-sm text-gray-500">No other plans are available.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {otherPlans.map((p) => (
                  <Card key={p.id} className="flex flex-col">
                    <CardHeader>
                      <CardTitle>{p.displayName}</CardTitle>
                      <CardDescription>{priceLabel(p)}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <p>
                        {capLabel(p.maxFarms)} farms · {capLabel(p.maxUsers)} users
                      </p>
                      <p>
                        {p.features.modules.map(friendly).join(', ') || 'Core features only'}
                      </p>
                    </CardContent>
                    <div className="p-6 pt-0">
                      <Button size="sm" onClick={() => setPendingPlan(p)}>
                        Switch to {p.displayName}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <ConfirmDialog
            open={pendingPlan != null}
            title={`Switch to ${pendingPlan?.displayName ?? ''} plan?`}
            message={
              pendingPlan
                ? `Your plan changes immediately: up to ${capLabel(pendingPlan.maxFarms)} farms and ${capLabel(pendingPlan.maxUsers)} users. Features outside the new plan's modules stop being available.`
                : ''
            }
            confirmLabel="Switch plan"
            loading={switching}
            onConfirm={confirmSwitch}
            onCancel={() => {
              if (!switching) setPendingPlan(null);
            }}
          />
        </>
      )}
    </div>
  );
}

function EntitlementGroup({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} variant="outline">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}
