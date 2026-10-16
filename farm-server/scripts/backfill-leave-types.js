/**
 * Backfill the starter leave types for organizations that have none.
 *
 * Starter types are created in createOrganization(), but organizations that
 * existed before that change (or environments seeded from an older build)
 * have an empty leave-type catalog — which makes every "Leave Type" picker
 * (admin request form, mobile request modal, HR → Leave Types) show nothing.
 *
 * This script is additive and idempotent: it only touches organizations with
 * ZERO leave types, so orgs that curated their own list are left alone.
 *
 * Usage:  node scripts/backfill-leave-types.js   (DATABASE_URL must be set)
 */
const { PrismaClient } = require('@prisma/client');

const STARTER_TYPES = [
  { name: 'Annual Leave', daysPerYear: 20, isPaid: true },
  { name: 'Sick Leave', daysPerYear: 10, isPaid: true },
  { name: 'Casual Leave', daysPerYear: 7, isPaid: true },
  { name: 'Unpaid Leave', daysPerYear: 0, isPaid: false },
  { name: 'Compassionate Leave', daysPerYear: 5, isPaid: true },
  { name: 'Maternity Leave', daysPerYear: 84, isPaid: true },
];

async function main() {
  const prisma = new PrismaClient();
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  let seeded = 0;
  for (const org of orgs) {
    const existing = await prisma.leaveType.count({ where: { organizationId: org.id } });
    if (existing > 0) {
      console.log(`skip  ${org.name} (${org.id}) — already has ${existing} leave type(s)`);
      continue;
    }
    await prisma.leaveType.createMany({
      data: STARTER_TYPES.map((t) => ({ organizationId: org.id, isActive: true, ...t })),
      skipDuplicates: true,
    });
    console.log(`seed  ${org.name} (${org.id}) — created ${STARTER_TYPES.length} leave types`);
    seeded++;
  }
  console.log(`Done: ${seeded} organization(s) backfilled.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
