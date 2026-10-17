import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual, randomUUID } from 'crypto';
import { paystackClient } from '../../infrastructure/paystack.client';

function parseDate(value: any): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Next billing date from a charge timestamp: MONTHLY +1mo, YEARLY +1yr, else +35d. */
function addCycle(from: Date, cycle: string): Date {
  const d = new Date(from.getTime());
  if (cycle === 'YEARLY') {
    d.setUTCFullYear(d.getUTCFullYear() + 1);
  } else if (cycle === 'NONE') {
    return d; // lifetime — caller decides (no renewal to track)
  } else {
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return d;
}

/**
 * Paystack recurring billing for org subscriptions.
 *
 * Flow: owner picks a paid plan → `initializeCheckout` (hosted checkout,
 * recurring plans pass a Paystack PLN code so the first charge subscribes
 * the card) → Paystack calls `/payments/webhook` (HMAC-SHA512 over the raw
 * body) and/or the client polls `pollCheckoutStatus` → `applySuccessfulCharge`
 * is the single idempotent activation path both use: it records the charge,
 * mirrors the subscription, sets `subscriptionPaidThrough`, and syncs the
 * org's plan (FK + legacy name column together).
 *
 * Orgs that never check out have no paid-through date and are untouched by
 * the lazy expiry in @farm/database.
 */
@Injectable()
export class PaymentsApplicationService {
  private readonly logger = new Logger(PaymentsApplicationService.name);

  // ── Checkout ────────────────────────────────────────────────────────────

  async initializeCheckout(
    organizationId: string,
    planId: string,
    user: { id?: string; email?: string }
  ) {
    if (!organizationId) throw new NotFoundException('Organization not found');
    if (!planId) throw new BadRequestException('planId is required');
    const { prisma } = await import('@farm/database');

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) throw new BadRequestException('Subscription plan not found');
    const price = Number(plan.price ?? 0);
    if (!(price > 0)) {
      throw new BadRequestException(
        `The ${plan.name} plan is free — switch instantly instead of checking out`
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, email: true, name: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    const email = (user?.email || org.email || '').trim();
    if (!email) throw new BadRequestException('No billing email available');

    const cycle = String(plan.billingCycle || 'MONTHLY').toUpperCase();
    // Recurring plans subscribe the customer to a Paystack plan so renewals
    // auto-charge; billingCycle NONE is a one-time lifetime purchase.
    const planCode = cycle === 'NONE' ? null : await this.ensurePaystackPlan(plan as any);

    const reference = `fms_${randomUUID().replace(/-/g, '')}`;
    await prisma.paymentTransaction.create({
      data: {
        organizationId,
        planId: plan.id,
        planName: plan.name,
        userId: user?.id || null,
        reference,
        kind: 'checkout',
        amount: price,
        currency: plan.currency,
        status: 'PENDING',
      },
    });

    const callbackUrl = this.resolveCallbackUrl();
    try {
      const init = await paystackClient.initializeTransaction({
        email,
        amount: Math.round(price * 100),
        currency: plan.currency,
        reference,
        ...(callbackUrl ? { callback_url: callbackUrl } : {}),
        ...(planCode ? { plan: planCode } : {}),
        metadata: { organizationId, planId: plan.id, source: 'fms-billing' },
      });
      return { reference, authorizationUrl: init.authorization_url };
    } catch (err) {
      await prisma.paymentTransaction
        .update({ where: { reference }, data: { status: 'ABANDONED' } })
        .catch(() => undefined);
      throw err;
    }
  }

  /**
   * Client polling after redirect. Confirms PENDING rows against Paystack's
   * verify API (the authed client can only see its own org's references),
   * so activation works even if the webhook is delayed or unconfigured.
   */
  async pollCheckoutStatus(organizationId: string, reference: string) {
    if (!organizationId) throw new NotFoundException('Organization not found');
    const { prisma } = await import('@farm/database');
    const row = await prisma.paymentTransaction.findUnique({ where: { reference } });
    if (!row || row.organizationId !== organizationId) {
      throw new NotFoundException('Payment not found');
    }
    if (row.status !== 'PENDING') return { reference: row.reference, status: row.status };

    try {
      const verified = await paystackClient.verifyTransaction(reference);
      const status = String(verified.status || '').toLowerCase();
      if (status === 'success') {
        await this.applySuccessfulCharge(verified);
        return { reference: row.reference, status: 'SUCCESS' };
      }
      if (status === 'failed' || status === 'reversed') {
        await prisma.paymentTransaction.update({
          where: { reference },
          data: { status: 'FAILED', raw: verified },
        });
        return { reference: row.reference, status: 'FAILED' };
      }
      if (status === 'abandoned') {
        await prisma.paymentTransaction.update({
          where: { reference },
          data: { status: 'ABANDONED', raw: verified },
        });
        return { reference: row.reference, status: 'ABANDONED' };
      }
      return { reference: row.reference, status: 'PENDING' };
    } catch (err: any) {
      // Transient verify failure (network, rate limit) — keep polling.
      this.logger.debug(`verify ${reference}: ${err?.message}`);
      return { reference: row.reference, status: 'PENDING' };
    }
  }

  // ── Cancel / resume ─────────────────────────────────────────────────────

  async cancelBilling(organizationId: string, userId?: string) {
    const { prisma } = await import('@farm/database');
    const sub = await prisma.paystackSubscription.findUnique({ where: { organizationId } });
    if (!sub) throw new BadRequestException('No active subscription to cancel');
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionPaidThrough: true },
    });
    if (sub.status === 'CANCELLED') {
      return { status: 'CANCELLED', paidThrough: org?.subscriptionPaidThrough ?? null };
    }

    const token = sub.token || (await paystackClient.findSubscriptionToken(sub.subscriptionCode));
    if (!token) {
      throw new BadRequestException(
        'Paystack did not return a subscription token — try again shortly'
      );
    }
    await paystackClient.disableSubscription(sub.subscriptionCode, token);
    await prisma.paystackSubscription.update({
      where: { organizationId },
      data: { status: 'CANCELLED', cancelReason: 'owner', token },
    });
    // Entitlements continue until subscriptionPaidThrough, then the lazy
    // expiry in @farm/database demotes the org to FREE.
    await this.audit(organizationId, 'organization.subscription.cancel', organizationId, userId);
    return {
      status: 'CANCELLED',
      paidThrough: org?.subscriptionPaidThrough ?? null,
    };
  }

  async resumeBilling(organizationId: string, userId?: string) {
    const { prisma } = await import('@farm/database');
    const sub = await prisma.paystackSubscription.findUnique({ where: { organizationId } });
    if (!sub) throw new BadRequestException('No subscription to resume');
    if (sub.status === 'ACTIVE') return { status: 'ACTIVE' };

    const token = sub.token || (await paystackClient.findSubscriptionToken(sub.subscriptionCode));
    if (!token) {
      throw new BadRequestException(
        'Paystack did not return a subscription token — try again shortly'
      );
    }
    await paystackClient.enableSubscription(sub.subscriptionCode, token);

    // If the paid-through date already lapsed, grant one cycle from now until
    // Paystack's first post-resume renewal webhook lands and corrects it.
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionPaidThrough: true },
    });
    const now = new Date();
    const stillValid = org?.subscriptionPaidThrough && org.subscriptionPaidThrough > now;
    const plan = sub.planId
      ? await prisma.subscriptionPlan.findUnique({ where: { id: sub.planId } })
      : null;
    const cycle = String(plan?.billingCycle || 'MONTHLY').toUpperCase();
    const paidThrough = stillValid ? org!.subscriptionPaidThrough : addCycle(now, cycle);

    await prisma.organization.update({
      where: { id: organizationId },
      data: { subscriptionPaidThrough: paidThrough },
    });
    await prisma.paystackSubscription.update({
      where: { organizationId },
      data: { status: 'ACTIVE', cancelReason: null, token },
    });
    await this.audit(organizationId, 'organization.subscription.resume', organizationId, userId);
    return { status: 'ACTIVE', paidThrough };
  }

  /**
   * Called when the org self-serves a switch to a FREE plan: future Paystack
   * charges must stop. Best-effort at Paystack, always local (a late renewal
   * webhook that still lands would re-apply the paid plan the owner paid for).
   */
  async forceCancelForFreeSwitch(organizationId: string) {
    const { prisma } = await import('@farm/database');
    const sub = await prisma.paystackSubscription.findUnique({ where: { organizationId } });
    if (!sub || sub.status === 'CANCELLED') return;
    try {
      const token = sub.token || (await paystackClient.findSubscriptionToken(sub.subscriptionCode));
      if (token) await paystackClient.disableSubscription(sub.subscriptionCode, token);
    } catch (err: any) {
      this.logger.warn(`free-switch disable failed for org ${organizationId}: ${err?.message}`);
    }
    await prisma.paystackSubscription.update({
      where: { organizationId },
      data: { status: 'CANCELLED', cancelReason: 'owner' },
    });
    await this.audit(
      organizationId,
      'organization.subscription.cancel',
      organizationId,
      null,
      { reason: 'switched to free plan' }
    );
  }

  // ── Webhook ─────────────────────────────────────────────────────────────

  /**
   * Verifies `x-paystack-signature` (HMAC-SHA512 over the exact raw body —
   * Nest runs with `rawBody: true`) before trusting anything in the payload.
   */
  async handleWebhook(raw: Buffer, signature: string | undefined) {
    const secret = await paystackClient.getSecretKey(); // not configured → throws → 500 → Paystack retries
    const expected = createHmac('sha512', secret).update(raw).digest('hex');
    const given = String(signature || '').trim();
    if (
      !given ||
      given.length !== expected.length ||
      !timingSafeEqual(Buffer.from(given, 'utf8'), Buffer.from(expected, 'utf8'))
    ) {
      throw new UnauthorizedException('Invalid Paystack signature');
    }

    let event: { event?: string; data?: any };
    try {
      event = JSON.parse(raw.toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }
    await this.processEvent(String(event.event || ''), event.data || {});
    return { received: true };
  }

  private async processEvent(name: string, data: any) {
    const { prisma } = await import('@farm/database');
    switch (name) {
      case 'charge.success':
        await this.applySuccessfulCharge(data);
        break;

      case 'charge.failed': {
        const row = data?.reference
          ? await prisma.paymentTransaction.findUnique({ where: { reference: data.reference } })
          : null;
        if (row && row.status === 'PENDING') {
          await prisma.paymentTransaction.update({
            where: { reference: row.reference },
            data: { status: 'FAILED', raw: data },
          });
        }
        break;
      }

      case 'subscription.create':
        await this.onSubscriptionCreate(data);
        break;

      case 'subscription.disable':
        await this.onSubscriptionStateChange(data, 'CANCELLED', undefined);
        break;

      case 'subscription.enable':
        await this.onSubscriptionStateChange(data, 'ACTIVE', null);
        break;

      case 'subscription.not_renew':
        await this.onSubscriptionStateChange(data, 'CANCELLED', 'not_renew');
        break;

      // Renewal failures also arrive as charge.failed; Paystack retries
      // internally and finally emits subscription.disable — both handled.
      case 'invoice.payment_failed':
        this.logger.warn(`renewal payment failed (event only): ${data?.subscription_code || ''}`);
        break;

      default:
        // Acknowledge events we don't act on.
        break;
    }
  }

  /**
   * The single activation path (webhook + poll both land here). Idempotent:
   * a reference already marked SUCCESS is a replay and changes nothing.
   */
  async applySuccessfulCharge(charge: any): Promise<{ applied: boolean; status: string }> {
    const { prisma } = await import('@farm/database');
    const reference = String(charge?.reference || '');
    if (!reference) return { applied: false, status: 'IGNORED' };

    const subCode =
      charge?.subscription?.subscription_code ||
      charge?.subscription?.subscriptionCode ||
      null;
    const planCode =
      typeof charge?.plan === 'string' ? charge.plan : charge?.plan?.plan_code || null;

    let row = await prisma.paymentTransaction.findUnique({ where: { reference } });
    if (row?.status === 'SUCCESS') return { applied: false, status: 'SUCCESS' }; // replay

    // Resolve the org this charge belongs to. Same Paystack account can take
    // money for other products — without a match, ignore the event entirely.
    let sub = subCode
      ? await prisma.paystackSubscription.findUnique({ where: { subscriptionCode: subCode } })
      : null;
    let orgId = row?.organizationId || sub?.organizationId || charge?.metadata?.organizationId || null;
    if (!orgId && planCode) {
      const ownedPlan = await prisma.subscriptionPlan.findFirst({
        where: { paystackPlanCode: planCode },
      });
      if (ownedPlan) {
        sub = await prisma.paystackSubscription.findFirst({
          where: { paystackPlanCode: planCode },
        });
        orgId = sub?.organizationId || null;
      }
    }
    if (!orgId) return { applied: false, status: 'IGNORED' };

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true, name: true, subscriptionPlan: true, subscriptionPlanId: true,
        subscriptionPaidThrough: true,
      },
    });
    if (!org) return { applied: false, status: 'IGNORED' };

    // Plan this charge bought/renews.
    const planId = row?.planId || charge?.metadata?.planId || sub?.planId || null;
    const plan = planId
      ? await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
      : null;
    const planName = plan?.name || row?.planName || sub?.planName || org.subscriptionPlan;
    const cycle = String(plan?.billingCycle || 'MONTHLY').toUpperCase();

    // For rows WE created (hosted-checkout checkouts) the amount and currency
    // must match what we initialized — a mismatch is never activated.
    if (row) {
      const expectedMinor = Math.round(Number(row.amount) * 100);
      const gotMinor = Number(charge?.amount ?? expectedMinor);
      const currencyOk = !charge?.currency || charge.currency === row.currency;
      if (expectedMinor !== gotMinor || !currencyOk) {
        await prisma.paymentTransaction.update({
          where: { reference },
          data: { status: 'FAILED', raw: charge },
        });
        await this.audit(orgId, 'subscription.payment.mismatch', reference, null, {
          expectedMinor,
          gotMinor,
          expectedCurrency: row.currency,
          gotCurrency: charge?.currency ?? null,
        });
        this.logger.error(`amount mismatch on ${reference} (org ${orgId}) — not activated`);
        return { applied: false, status: 'FAILED' };
      }
    }

    const paidAt = parseDate(charge?.paid_at) || new Date();
    const subscriptionCode = subCode || sub?.subscriptionCode || null;

    if (row) {
      await prisma.paymentTransaction.update({
        where: { reference },
        data: {
          status: 'SUCCESS',
          channel: charge?.channel || row.channel,
          subscriptionCode,
          raw: charge,
          paidAt,
        },
      });
    } else {
      // Renewal (Paystack-generated reference) — record it as a new ledger row.
      await prisma.paymentTransaction.create({
        data: {
          organizationId: orgId,
          planId: plan?.id ?? null,
          planName,
          userId: null,
          reference,
          subscriptionCode,
          kind: 'renewal',
          amount: Number(charge?.amount ?? 0) / 100,
          currency: String(charge?.currency || plan?.currency || 'USD'),
          status: 'SUCCESS',
          channel: charge?.channel || null,
          raw: charge,
          paidAt,
        },
      });
    }

    // Mirror the Paystack subscription (first checkout or renewal).
    const nextPaymentDate = parseDate(
      charge?.subscription?.next_payment_date || charge?.subscription?.nextPaymentDate
    );
    if (subCode) {
      sub = await prisma.paystackSubscription.upsert({
        where: { organizationId: orgId },
        create: {
          organizationId: orgId,
          planId: plan?.id ?? null,
          planName,
          paystackPlanCode: planCode,
          subscriptionCode: subCode,
          token: charge?.subscription?.token || null,
          customerEmail: String(charge?.customer?.email || ''),
          customerId: charge?.customer?.id != null ? String(charge.customer.id) : null,
          status: 'ACTIVE',
          nextPaymentDate,
          raw: charge,
        },
        update: {
          planId: plan?.id ?? undefined,
          planName,
          ...(planCode ? { paystackPlanCode: planCode } : {}),
          ...(charge?.subscription?.token ? { token: charge.subscription.token } : {}),
          status: 'ACTIVE',
          cancelReason: null,
          ...(nextPaymentDate ? { nextPaymentDate } : {}),
          raw: charge,
        },
      });
    }

    // Paid-through: next renewal date when Paystack gave one, else now+cycle.
    // billingCycle NONE is a lifetime purchase — no expiry date to set.
    const paidThrough =
      cycle === 'NONE' ? null : nextPaymentDate || addCycle(paidAt, cycle);
    const later =
      paidThrough &&
      (!org.subscriptionPaidThrough || paidThrough > org.subscriptionPaidThrough)
        ? paidThrough
        : org.subscriptionPaidThrough;

    // Sync the plan the org now holds — FK and legacy name together (the
    // invariant the backfill script exists to repair).
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(plan ? { subscriptionPlanId: plan.id, subscriptionPlan: plan.name } : {}),
        subscriptionStatus: 'ACTIVE',
        subscriptionPaidThrough: later,
      },
    });

    await this.audit(orgId, 'subscription.payment.success', reference, row?.userId ?? null, {
      planName,
      amount: Number(charge?.amount ?? 0) / 100,
      currency: charge?.currency ?? null,
      kind: row ? row.kind : 'renewal',
      paidThrough: later ? later.toISOString() : null,
    });
    return { applied: true, status: 'SUCCESS' };
  }

  private async onSubscriptionCreate(data: any) {
    const { prisma } = await import('@farm/database');
    const code = String(data?.subscription_code || '');
    if (!code) return;

    const existing = await prisma.paystackSubscription.findUnique({
      where: { subscriptionCode: code },
    });
    const nextPaymentDate = parseDate(data?.next_payment_date);
    if (existing) {
      await prisma.paystackSubscription.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          ...(data?.token ? { token: data.token } : {}),
          ...(nextPaymentDate ? { nextPaymentDate } : {}),
          raw: data,
        },
      });
      return;
    }

    // First time seeing this code — resolve the org via the paying user, the
    // org's own email, or our cached Paystack plan code. If none of that
    // matches, the companion charge.success (which carries our reference)
    // will attach it instead.
    const email = String(data?.customer?.email || '').toLowerCase();
    let orgId: string | null = null;
    if (email) {
      const user = await prisma.user.findFirst({ where: { email } });
      orgId = user?.organizationId || null;
      if (!orgId) {
        const byOrgEmail = await prisma.organization.findFirst({ where: { email } });
        orgId = byOrgEmail?.id || null;
      }
    }
    const planCode =
      typeof data?.plan === 'string' ? data.plan : data?.plan?.plan_code || null;
    if (!orgId && planCode) {
      const owned = await prisma.subscriptionPlan.findFirst({
        where: { paystackPlanCode: planCode },
      });
      if (owned) {
        const linked = await prisma.paystackSubscription.findFirst({
          where: { paystackPlanCode: planCode },
        });
        orgId = linked?.organizationId || null;
      }
    }
    if (!orgId) {
      this.logger.warn(`subscription.create ${code}: could not resolve organization — skipped`);
      return;
    }

    const plan = planCode
      ? await prisma.subscriptionPlan.findFirst({ where: { paystackPlanCode: planCode } })
      : null;
    await prisma.paystackSubscription.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        planId: plan?.id ?? null,
        planName: plan?.name || '',
        paystackPlanCode: planCode,
        subscriptionCode: code,
        token: data?.token || null,
        customerEmail: String(data?.customer?.email || ''),
        customerId: data?.customer?.id != null ? String(data.customer.id) : null,
        status: 'ACTIVE',
        nextPaymentDate,
        raw: data,
      },
      update: {
        subscriptionCode: code,
        ...(data?.token ? { token: data.token } : {}),
        ...(nextPaymentDate ? { nextPaymentDate } : {}),
        status: 'ACTIVE',
        cancelReason: null,
        raw: data,
      },
    });
    if (plan && nextPaymentDate) {
      await prisma.organization.update({
        where: { id: orgId },
        data: { subscriptionPaidThrough: nextPaymentDate },
      });
    }
  }

  private async onSubscriptionStateChange(
    data: any,
    status: 'ACTIVE' | 'CANCELLED',
    cancelReason: string | null | undefined
  ) {
    const { prisma } = await import('@farm/database');
    const code = String(data?.subscription_code || '');
    if (!code) return;
    const sub = await prisma.paystackSubscription.findUnique({
      where: { subscriptionCode: code },
    });
    if (!sub) return;
    await prisma.paystackSubscription.update({
      where: { id: sub.id },
      data: {
        status,
        // undefined = keep an existing reason (a platform/owner reason is
        // more informative than the event itself).
        ...(cancelReason !== undefined ? { cancelReason } : {}),
        raw: data,
      },
    });
    await this.audit(
      sub.organizationId,
      `organization.subscription.${status === 'ACTIVE' ? 'enabled' : 'disabled'}`,
      sub.organizationId,
      null,
      { subscriptionCode: code, cancelReason }
    );
  }

  // ── History (org + platform console) ────────────────────────────────────

  async listOrgPayments(organizationId: string, limit = 20) {
    if (!organizationId) throw new NotFoundException('Organization not found');
    const { prisma } = await import('@farm/database');
    const take = Math.min(50, Math.max(1, Number(limit) || 20));
    const [payments, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take,
        select: {
          id: true, reference: true, planId: true, planName: true, kind: true,
          amount: true, currency: true, status: true, channel: true,
          paidAt: true, createdAt: true,
        },
      }),
      prisma.paymentTransaction.count({ where: { organizationId } }),
    ]);
    return { payments, total };
  }

  async listAllPayments(query: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    organizationId?: string;
  }) {
    const { prisma } = await import('@farm/database');
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const search = String(query.search || '').trim();
    const where = {
      ...(query.status ? { status: String(query.status).toUpperCase() } : {}),
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(search
        ? {
            OR: [
              { planName: { contains: search, mode: 'insensitive' as const } },
              { reference: { contains: search, mode: 'insensitive' as const } },
              { organization: { name: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.paymentTransaction.count({ where }),
    ]);

    // Plain-string FK by design (payments survive hard org/plan deletes) —
    // resolve display names with one batched read.
    const orgIds = [...new Set(rows.map((r) => r.organizationId))];
    const orgs = orgIds.length
      ? await prisma.organization.findMany({
          where: { id: { in: orgIds } },
          select: { id: true, name: true },
        })
      : [];
    const orgName = new Map(orgs.map((o) => [o.id, o.name]));

    return {
      payments: rows.map((r) => ({
        ...r,
        organizationName: orgName.get(r.organizationId) ?? null,
      })),
      total,
      page,
      limit,
    };
  }

  // ── Internals ───────────────────────────────────────────────────────────

  /** Creates the Paystack plan for a recurring subscription and caches its code. */
  private async ensurePaystackPlan(plan: {
    id: string;
    name: string;
    displayName: string;
    price: any;
    currency: string;
    billingCycle: string;
    paystackPlanCode: string | null;
  }): Promise<string> {
    if (plan.paystackPlanCode) return plan.paystackPlanCode;
    const { prisma } = await import('@farm/database');
    const created = await paystackClient.createPlan({
      name: `FMS ${plan.name}`,
      interval: String(plan.billingCycle).toUpperCase() === 'YEARLY' ? 'annually' : 'monthly',
      amount: Math.round(Number(plan.price) * 100),
      currency: plan.currency,
      description: plan.displayName || undefined,
    });
    await prisma.subscriptionPlan.update({
      where: { id: plan.id },
      data: { paystackPlanCode: created.plan_code },
    });
    return created.plan_code;
  }

  /**
   * Where Paystack sends the payer's browser after checkout. Server default
   * first (PAYSTACK_CALLBACK_URL, then ADMIN_URL, then the first CORS
   * origin — the admin client), so mobile's Linking flow needs nothing.
   */
  private resolveCallbackUrl(): string | undefined {
    const explicit = (process.env.PAYSTACK_CALLBACK_URL || '').trim();
    if (explicit) return explicit;
    const admin = (process.env.ADMIN_URL || '').trim().replace(/\/+$/, '');
    if (admin) return `${admin}/subscription`;
    const origin = (process.env.CORS_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)[0];
    if (origin) return `${origin.replace(/\/+$/, '')}/subscription`;
    return undefined;
  }

  private async audit(
    organizationId: string,
    action: string,
    entityId: string,
    userId?: string | null,
    metadata?: Record<string, any>
  ) {
    try {
      const { prisma } = await import('@farm/database');
      await prisma.auditLog.create({
        data: {
          organizationId,
          userId: userId || null,
          action,
          entity: 'Organization',
          entityId,
          ...(metadata ? { metadata } : {}),
        },
      });
    } catch (err: any) {
      this.logger.warn(`audit ${action} failed: ${err?.message}`);
    }
  }
}
