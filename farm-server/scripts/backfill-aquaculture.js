/**
 * Backfill the aquaculture module's RBAC + feature flag on existing DBs.
 *
 * prisma/seed.ts is destructive (it wipes users/orgs/farms first) and must
 * never run against a live DB, so environments seeded from an older build
 * would otherwise be missing:
 *
 *   - the `aquaculture.read|write|delete` permissions,
 *   - their RolePermission grants (mirroring the seed's rolePermissions map,
 *     including the SUPER_ADMIN `*` and SUPPORT_ADMIN `*.read` wildcards),
 *   - the `aquaculture.enabled` module feature flag.
 *
 * Without these, every /aquaculture route 403s for non-superadmin users.
 * Plan `features.modules` is handled separately by scripts/align-plan-features.js.
 *
 * This script is additive and idempotent: existing permissions, grants and
 * flags are left untouched (logged as `ok`); re-running is a no-op.
 *
 * Usage:  node scripts/backfill-aquaculture.js   (DATABASE_URL must be set)
 */
const { PrismaClient } = require('@prisma/client');

// Keep in lockstep with permissionData / rolePermissions / featureFlagData
// in prisma/seed.ts.
const PERMISSIONS = [
  { name: 'aquaculture.read', description: 'View ponds and aquaculture records', category: 'Aquaculture' },
  { name: 'aquaculture.write', description: 'Create and edit aquaculture records', category: 'Aquaculture' },
  { name: 'aquaculture.delete', description: 'Delete aquaculture records', category: 'Aquaculture' },
];

const ROLE_GRANTS = {
  SUPER_ADMIN: ['*'],
  SUPPORT_ADMIN: ['*.read'],
  ORGANIZATION_OWNER: ['aquaculture.read', 'aquaculture.write', 'aquaculture.delete'],
  FARM_MANAGER: ['aquaculture.read', 'aquaculture.write', 'aquaculture.delete'],
  SUPERVISOR: ['aquaculture.read', 'aquaculture.write'],
  VETERINARIAN: ['aquaculture.read', 'aquaculture.write'],
  WORKER: ['aquaculture.read'],
};

const FEATURE_FLAG = {
  key: 'aquaculture.enabled',
  name: 'Aquaculture Management',
  category: 'module',
  description: 'Ponds, stocking, feeding, water quality, harvest',
};

function matches(pattern, permissionName) {
  if (pattern === '*') return true;
  if (pattern === '*.read') return permissionName.endsWith('.read');
  return pattern === permissionName;
}

async function main() {
  const prisma = new PrismaClient();

  // 1. Permissions — create if missing, never modify an existing row.
  for (const permission of PERMISSIONS) {
    const existing = await prisma.permission.findUnique({ where: { name: permission.name } });
    if (existing) {
      console.log(`ok    permission ${permission.name} — already exists`);
    } else {
      await prisma.permission.create({ data: permission });
      console.log(`seed  permission ${permission.name} — created`);
    }
  }
  const permissions = await prisma.permission.findMany({
    where: { name: { in: PERMISSIONS.map((p) => p.name) } },
  });

  // 2. Role grants — skip links that already exist.
  const roles = await prisma.role.findMany({ select: { id: true, name: true } });
  let granted = 0;
  for (const [roleName, patterns] of Object.entries(ROLE_GRANTS)) {
    const role = roles.find((r) => r.name === roleName);
    if (!role) {
      console.log(`skip  role ${roleName} — not found`);
      continue;
    }
    for (const permission of permissions) {
      if (!patterns.some((pattern) => matches(pattern, permission.name))) continue;
      const link = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
      });
      if (link) continue;
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: permission.id },
      });
      console.log(`grant ${roleName} → ${permission.name}`);
      granted++;
    }
  }

  // 3. Feature flag — same upsert shape as the seed (defaults on).
  const flag = await prisma.featureFlag.findUnique({ where: { key: FEATURE_FLAG.key } });
  if (flag) {
    console.log(`ok    flag ${FEATURE_FLAG.key} — already exists`);
  } else {
    await prisma.featureFlag.create({ data: { ...FEATURE_FLAG, defaultValue: true, isEnabled: true } });
    console.log(`seed  flag ${FEATURE_FLAG.key} — created`);
  }

  console.log(`Done: ${granted} role-permission link(s) created.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
