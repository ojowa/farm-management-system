import type { PrismaClient } from '@prisma/client';

/**
 * Lazy expiry for Paystack-billed organizations — no cron, evaluated at the
 * subscription-sensitive read/write paths.
 *
 * An organization is billing-managed ONLY once `subscriptionPaidThrough` is
 * set (by a successful checkout or renewal webhook). Orgs that never went
 * through checkout — including platform-comped ones, whose manual plan
 * assignment clears the date — have no date and are never touched here, so
 * pre-existing organizations behave exactly as before.
 *
 * Returns true when the org was just demoted to FREE (the caller should
 * re-read its plan), false otherwise. Zero extra queries unless the
 * paid-through date is already in the past.
 */
export async function applySubscriptionExpiryIfNeeded(
  prisma: PrismaClient,
  org: { id: string; subscriptionPaidThrough: Date | null; subscriptionPlanId?: string | null }
): Promise<boolean> {
  const now = new Date();
  if (!org.subscriptionPaidThrough || org.subscriptionPaidThrough.getTime() > now.getTime()) {
    return false; // free/comped, or still inside the paid period
  }

  const sub = await prisma.paystackSubscription.findUnique({
    where: { organizationId: org.id },
  });

  if (sub?.status === 'ACTIVE') {
    // A renewal may already be scheduled (webhook hasn't bumped paid-through
    // yet) — heal the date instead of pulling entitlements.
    if (sub.nextPaymentDate && sub.nextPaymentDate.getTime() > now.getTime()) {
      if (sub.nextPaymentDate.getTime() > org.subscriptionPaidThrough.getTime()) {
        await prisma.organization.update({
          where: { id: org.id },
          data: { subscriptionPaidThrough: sub.nextPaymentDate },
        });
      }
      return false;
    }
    // Paystack retries a failed renewal for a couple of days before the
    // subscription.disable event lands; stay inside that grace window.
    const graceMs = 72 * 60 * 60 * 1000;
    if (!sub.nextPaymentDate || sub.nextPaymentDate.getTime() > now.getTime() - graceMs) {
      return false;
    }
    // ACTIVE but long past any retry window (a missed disable webhook) —
    // settle the mirror locally, then fall through to the demotion.
    await prisma.paystackSubscription.update({
      where: { organizationId: org.id },
      data: { status: 'CANCELLED', cancelReason: 'billing' },
    });
  }

  const freePlan = await prisma.subscriptionPlan.findFirst({
    where: { name: 'FREE' },
    orderBy: { sortOrder: 'asc' },
  });
  await prisma.organization.update({
    where: { id: org.id },
    data: {
      subscriptionPlanId: freePlan?.id ?? null,
      subscriptionPlan: freePlan?.name ?? 'FREE',
      subscriptionPaidThrough: null,
    },
  });
  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      action: 'organization.subscription.expired',
      entity: 'Organization',
      entityId: org.id,
      metadata: {
        previousPlanId: org.subscriptionPlanId ?? null,
        reason: 'paid-through elapsed without renewal',
      },
    },
  });
  return true;
}
