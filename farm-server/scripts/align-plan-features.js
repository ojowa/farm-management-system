/**
 * Align live plan `features` with the canonical farm-type ↔ module mapping.
 *
 * For every seeded plan name (FREE/BASIC/PRO/ENTERPRISE) this rewrites
 * `features` to the aligned shape the seeds write:
 *
 *   { modules: [...], farmTypes: [...], perks?: [...] }
 *
 * - `farmTypes` is DERIVED from `modules` via the same type→module map the
 *   server uses (crop→CROP; livestock→LIVESTOCK + DAIRY; poultry→POULTRY;
 *   aquaculture→AQUACULTURE), so the two lists can never contradict each
 *   other.
 * - `notification` and `hr` are added (shipped modules no plan listed).
 * - api_access / priority_support move out of `modules` into `perks` — they
 *   are plan benefits, not navigable modules.
 *
 * All five farm types stay in the catalog — DAIRY and AQUACULTURE included —
 * and this script never touches Farm rows. Plans not in the known list are
 * left untouched (logged); re-running is a no-op once aligned. It only
 * rewrites the `features` column — nothing is seeded or cleared (never run
 * prisma/seed.ts against a live DB; it wipes users/orgs/farms first).
 *
 * Usage:  node scripts/align-plan-features.js   (DATABASE_URL must be set)
 */
const { PrismaClient } = require('@prisma/client');

// Keep in lockstep with farmTypesForModules in the database features module
// and the planData in prisma/seed.ts.
const FARM_TYPES = ['CROP', 'LIVESTOCK', 'POULTRY', 'DAIRY', 'AQUACULTURE'];
const FARM_TYPE_MODULE = { CROP: 'crop', LIVESTOCK: 'livestock', POULTRY: 'poultry', DAIRY: 'livestock', AQUACULTURE: 'aquaculture' };
const PERKS = ['api_access', 'priority_support'];

// Module lists copied from prisma/seed.ts (the aligned source of truth).
const PLAN_MODULES = {
  FREE: ['farm', 'crop', 'worker', 'communication', 'reporting', 'notification', 'hr', 'aquaculture'],
  BASIC: ['farm', 'crop', 'livestock', 'inventory', 'worker', 'communication', 'reporting', 'notification', 'hr', 'aquaculture'],
  PRO: ['farm', 'crop', 'livestock', 'poultry', 'inventory', 'finance', 'worker', 'communication', 'reporting', 'notification', 'hr', 'aquaculture'],
  ENTERPRISE: ['farm', 'crop', 'livestock', 'poultry', 'inventory', 'finance', 'worker', 'communication', 'reporting', 'notification', 'hr', 'aquaculture'],
};

function farmTypesForModules(modules) {
  return FARM_TYPES.filter((type) => {
    const backing = FARM_TYPE_MODULE[type];
    return backing === null ? modules.includes('farm') : modules.includes(backing);
  });
}

// JSONB normalizes key order on storage, so comparisons must be key-sorted —
// otherwise ENTERPRISE reports "rewritten" on every run while its stored
// value never actually changes.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = canonical(value[key]);
        return acc;
      }, {});
  }
  return value;
}

async function main() {
  const prisma = new PrismaClient();
  const plans = await prisma.subscriptionPlan.findMany({ select: { id: true, name: true, features: true } });
  let updated = 0;
  for (const plan of plans) {
    const modules = PLAN_MODULES[plan.name];
    if (!modules) {
      console.log(`skip  ${plan.name} — not a seeded plan; left untouched`);
      continue;
    }
    const features = { modules, farmTypes: farmTypesForModules(modules) };
    if (plan.name === 'ENTERPRISE') features.perks = [...PERKS];
    const before = JSON.stringify(canonical(plan.features));
    const after = JSON.stringify(canonical(features));
    if (before === after) {
      console.log(`ok    ${plan.name} — already aligned`);
      continue;
    }
    await prisma.subscriptionPlan.update({ where: { id: plan.id }, data: { features } });
    console.log(`fix   ${plan.name} — features rewritten\n        before: ${before}\n        after:  ${after}`);
    updated++;
  }
  console.log(`Done: ${updated} plan(s) rewritten.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
