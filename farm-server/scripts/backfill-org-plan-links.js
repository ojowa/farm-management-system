/**
 * Link organizations to their SubscriptionPlan row.
 *
 * Organizations carry a legacy `subscriptionPlan` name string (FREE, BASIC,
 * PRO, ENTERPRISE) while entitlements flow through the `subscriptionPlanId`
 * FK: GET /auth/me reads the plan via `subscriptionPlanRef` and returns
 * `planFeatures.modules` from its features. Orgs created before the FK
 * existed have it NULL, so plan features resolve to an empty module list -
 * which made plan-based gating (sidebar sections, mobile tabs, farm-type
 * pickers) inert or, before the empty-list guard, hide everything.
 *
 * This script is additive and idempotent: it only touches organizations whose
 * `subscriptionPlanId` is NULL, only when the legacy name matches exactly one
 * plan row, and re-running it is a no-op.
 *
 * Usage:  node scripts/backfill-org-plan-links.js   (DATABASE_URL must be set)
 */
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const plans = await prisma.subscriptionPlan.findMany({ select: { id: true, name: true } });
  const orgs = await prisma.organization.findMany({
    where: { subscriptionPlanId: null },
    select: { id: true, name: true, subscriptionPlan: true },
  });
  let linked = 0;
  for (const org of orgs) {
    const wanted = (org.subscriptionPlan || '').trim().toLowerCase();
    if (!wanted) {
      console.log(`skip  ${org.name} (${org.id}) - no legacy subscriptionPlan name to match`);
      continue;
    }
    const matches = plans.filter((p) => (p.name || '').trim().toLowerCase() === wanted);
    if (matches.length !== 1) {
      console.log(`skip  ${org.name} (${org.id}) - ${matches.length} plan rows named "${org.subscriptionPlan}"`);
      continue;
    }
    await prisma.organization.update({ where: { id: org.id }, data: { subscriptionPlanId: matches[0].id } });
    console.log(`link  ${org.name} (${org.id}) -> ${matches[0].name} (${matches[0].id})`);
    linked++;
  }
  console.log(`Done: ${linked} organization(s) linked to a plan.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
