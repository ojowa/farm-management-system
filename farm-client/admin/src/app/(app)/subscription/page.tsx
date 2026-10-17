'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, HardDrive, Sprout, Users as UsersIcon } from 'lucide-react';
import { subscriptionAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { usePermission } from '@/lib/usePermission';
import { useToast, getErrorMessage } from '@/lib/toasts';
import { formatCurrency, formatDate } from '@/lib/formatters';
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
  description: string;
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

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  ACTIVE: { label: 'Active', variant: 'success' },
  TRIAL: { label: 'Trial', variant: 'warning' },
  SUSPENDED: { label: 'Suspended', variant: 'destructive' },
  CANCELLED: { label: 'Cancelled', variant: 'secondary' },
};

const PAYMENT_BADGE: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  SUCCESS: 'success',
  PENDING: 'warning',
  FAILED: 'destructive',
  ABANDONED: 'secondary',
};

/** Plans use this sentinel for "no cap" in maxFarms/maxUsers. */
const UNLIMITED = 999999;
const capLabel = (n: number | undefined | null) =>
  n == null ? '—' : n >= UNLIMITED ? 'Unlimited' : String(n);

const friendly = (raw: string) => raw.charAt(0).toUpperCase() + raw.slice(1);

const priceLabel = (plan: Plan) => {
  const price = Number(plan.price) || 0;
  if (!(price > 0)) return 'Free';
  const amount = formatCurrency(price, plan.currency || 'USD');
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
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);
  const [switching, setSwitching] = useState(false);
  // Paid plan picked → confirm before being sent to Paystack.
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
  // Live checkout: poll until Paystack settles the reference.
  const [checkout, setCheckout] = useState<{ reference: string; planName: string } | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [billingBusy, setBillingBusy] = useState<'cancel' | 'resume' | null>(null);

  const canManage = hasPermission('billing.manage');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [snapshot, planList, paymentsRes] = await Promise.all([
        subscriptionAPI.current(),
        subscriptionAPI.listPlans(),
        // History is cosmetic — never block the page if it fails.
        subscriptionAPI.payments(20).catch(() => null),
      ]);
      setSubscription(snapshot.data);
      setPlans(((planList.data as any[]) || []).map(normalizePlan));
      setPayments(((paymentsRes?.data as any)?.payments as PaymentRow[]) || []);
    } catch (err) {
      setLoadError(getErrorMessage(err, 'Could not load your subscription.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  // Poll the checkout reference while one is in flight (webhooks and the
  // client poll both settle it; this just reflects the result).
  useEffect(() => {
    if (!checkout) return;
    let active = true;
    const interval = setInterval(async () => {
      try {
        const res = await subscriptionAPI.checkoutStatus(checkout.reference);
        const status = String(res.data?.status || '').toUpperCase();
        if (!active) return;
        if (status === 'SUCCESS') {
          setCheckout(null);
          toast({
            type: 'success',
            title: 'Payment confirmed',
            message: `Your ${checkout.planName} plan is now active.`,
          });
          await load();
          refreshUser().catch(() => {});
        } else if (status === 'FAILED' || status === 'ABANDONED') {
          setCheckout(null);
          toast({
            type: 'error',
            title: status === 'FAILED' ? 'Payment failed' : 'Checkout not completed',
            message: 'No charge was applied — you can try again.',
          });
          load();
        }
      } catch {
        // Transient verify error — keep polling until dismissed.
      }
    }, 3500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [checkout, load, refreshUser, toast]);

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
      load();
    } catch (err) {
      toast({ type: 'error', title: getErrorMessage(err, 'Could not change the plan.') });
    } finally {
      setSwitching(false);
    }
  };

  const confirmCheckout = async () => {
    if (!checkoutPlan) return;
    setSwitching(true);
    // Open the tab synchronously with the click (popup blockers allow that);
    // it is only navigated to Paystack once the initialize call returns.
    const win = window.open('about:blank', '_blank');
    try {
      const res = await subscriptionAPI.checkout(checkoutPlan.id);
      const authorizationUrl = res.data?.authorizationUrl as string | undefined;
      const reference = res.data?.reference as string | undefined;
      if (!authorizationUrl || !reference) throw new Error('Checkout did not start');
      if (win) {
        win.location.href = authorizationUrl;
        win.focus();
      } else {
        window.open(authorizationUrl, '_blank', 'noopener,noreferrer');
      }
      setCheckoutPlan(null);
      setCheckout({ reference, planName: checkoutPlan.displayName });
      toast({
        type: 'info',
        title: 'Paystack checkout opened',
        message: 'Complete the payment in the new tab — this page updates automatically once it settles.',
      });
    } catch (err) {
      win?.close();
      toast({ type: 'error', title: getErrorMessage(err, 'Could not start checkout.') });
    } finally {
      setSwitching(false);
    }
  };

  const cancelBilling = async () => {
    setBillingBusy('cancel');
    try {
      const res = await subscriptionAPI.cancel();
      const paidThrough = res.data?.paidThrough as string | null | undefined;
      toast({
        type: 'success',
        title: 'Subscription cancelled',
        message: paidThrough
          ? `No further charges will be made. Access continues until ${formatDate(paidThrough, 'long')}.`
          : 'No further charges will be made.',
      });
      setShowCancel(false);
      await load();
      refreshUser().catch(() => {});
    } catch (err) {
      toast({ type: 'error', title: getErrorMessage(err, 'Could not cancel the subscription.') });
    } finally {
      setBillingBusy(null);
    }
  };

  const resumeBilling = async () => {
    setBillingBusy('resume');
    try {
      const res = await subscriptionAPI.resume();
      const paidThrough = res.data?.paidThrough as string | null | undefined;
      toast({
        type: 'success',
        title: 'Subscription resumed',
        message: paidThrough ? `Paid through ${formatDate(paidThrough, 'long')}.` : undefined,
      });
      await load();
      refreshUser().catch(() => {});
    } catch (err) {
      toast({ type: 'error', title: getErrorMessage(err, 'Could not resume the subscription.') });
    } finally {
      setBillingBusy(null);
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
  const billing = subscription?.billing ?? null;

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

      {/* Checkout in flight */}
      {checkout && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
            <div className="flex items-center gap-3">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#16a34a] border-t-transparent" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">Waiting for payment confirmation…</p>
                <p className="text-xs text-muted-foreground">
                  {checkout.planName} · reference <code className="font-mono">{checkout.reference}</code> —
                  the page updates automatically once Paystack confirms.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={load}>Refresh now</Button>
              <Button variant="ghost" size="sm" onClick={() => setCheckout(null)}>Stop waiting</Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                  ? priceLabel(plan)
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

                  {/* Recurring billing state — paid-through comes from checkout
                      history; comps / never-checked-out orgs have no date and
                      never auto-expire. */}
                  <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Recurring billing</p>
                        {subscription.paidThrough ? (
                          <p className="text-sm text-muted-foreground">
                            Paid through {formatDate(subscription.paidThrough, 'long')}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No paid period — this organization never auto-expires.
                          </p>
                        )}
                        {billing && (
                          <p className="text-xs text-muted-foreground">
                            Paystack {billing.status}
                            {billing.nextBillingDate &&
                              ` · next charge ${formatDate(billing.nextBillingDate, 'long')}`}
                            {billing.cancelReason && ` · cancelled (${billing.cancelReason})`}
                            {billing.customerEmail && ` · ${billing.customerEmail}`}
                          </p>
                        )}
                      </div>
                      {billing &&
                        (billing.status === 'ACTIVE' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={billingBusy != null}
                            onClick={() => setShowCancel(true)}
                          >
                            Cancel subscription
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={billingBusy != null || billingBusy === 'resume'}
                            onClick={resumeBilling}
                          >
                            Resume subscription
                          </Button>
                        ))}
                    </div>
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
            <h2 className="mb-1 text-lg font-semibold">Change plan</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Free plans switch instantly — paid plans open Paystack checkout.
            </p>
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
                      <Button
                        size="sm"
                        disabled={switching || checkout != null}
                        onClick={() => (isPaidPlan(p) ? setCheckoutPlan(p) : setPendingPlan(p))}
                      >
                        {isPaidPlan(p) ? `Subscribe to ${p.displayName}` : `Switch to ${p.displayName}`}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Billing history */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">Billing history</h2>
            {payments.length === 0 ? (
              <p className="text-sm text-gray-500">
                No payments yet — paid checkouts and renewals will appear here.
              </p>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Reference</th>
                        <th className="px-4 py-3">Plan</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDate(p.paidAt || p.createdAt, 'short')}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{p.reference}</td>
                          <td className="px-4 py-3">{p.planName}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">{p.kind}</Badge>
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {formatCurrency(Number(p.amount), p.currency)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={PAYMENT_BADGE[p.status] ?? 'secondary'}>{p.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Free plan: instant switch */}
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

          {/* Paid plan: Paystack checkout */}
          <ConfirmDialog
            open={checkoutPlan != null}
            title={`Subscribe to ${checkoutPlan?.displayName ?? ''}?`}
            message={
              checkoutPlan
                ? `${priceLabel(checkoutPlan)} — you'll complete payment on Paystack's secure page.${
                    isRecurring(checkoutPlan)
                      ? ' Renewals charge automatically until you cancel.'
                      : ' This is a one-time purchase.'
                  }`
                : ''
            }
            confirmLabel="Continue to Paystack"
            loading={switching}
            onConfirm={confirmCheckout}
            onCancel={() => {
              if (!switching) setCheckoutPlan(null);
            }}
          />

          {/* Cancel recurring billing */}
          <ConfirmDialog
            open={showCancel}
            title="Cancel subscription?"
            message="Auto-renewal stops: no further Paystack charges will be made. Access continues until the paid-through date, then the organization drops to FREE."
            confirmLabel="Cancel subscription"
            destructive
            loading={billingBusy === 'cancel'}
            onConfirm={cancelBilling}
            onCancel={() => {
              if (billingBusy !== 'cancel') setShowCancel(false);
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
