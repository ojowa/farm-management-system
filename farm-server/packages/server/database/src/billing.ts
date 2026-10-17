import type { PrismaClient } from '@prisma/client';

/**
 * Lazy expiry for Paystack-billed organizations — no cron, evaluated at the
 * subscription-sensitive read/write paths.
 *
 * An organization is billing-managed only once `subscriptionPaidThrough` is
 * set (by a successful checkout or renewal webhook). Organizations without a
 * date are never touched, so free and manually-comped plans remain unchanged.
 *
 * Returns true when the organization was demoted to FREE and the caller
 * should re-read its plan.
 */
export async function applySubscriptionExpiryIfNeeded(
  prisma: PrismaClient,
  org: { id: string; subscriptionPaidThrough: Date | null; subscriptionPlanId?: string | null }
): Promise<boolean> {
  const now = new Date();
  if (!org.subscriptionPaidThrough || org.subscriptionPaidThrough.getTime() > now.getTime()) {
    return false;
  }

  const subscription = await prisma.paystackSubscription.findUnique({
    where: { organizationId: org.id },
  });

  if (subscription?.status === 'ACTIVE') {
    if (subscription.nextPaymentDate && subscription.nextPaymentDate.getTime() > now.getTime()) {
      if (subscription.nextPaymentDate.getTime() > org.subscriptionPaidThrough.getTime()) {
        await prisma.organization.update({
          where: { id: org.id },
          data: { subscriptionPaidThrough: subscription.nextPaymentDate },
        });
      }
      return false;
    }

    const gracePeriodMs = 72 * 60 * 60 * 1000;
    if (
      !subscription.nextPaymentDate ||
      subscription.nextPaymentDate.getTime() > now.getTime() - gracePeriodMs
    ) {
      return false;
    }

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
