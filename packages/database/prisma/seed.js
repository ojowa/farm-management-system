const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const roles = [
    'SUPER_ADMIN', 'SUPPORT_ADMIN', 'ORGANIZATION_OWNER',
    'FARM_MANAGER', 'ACCOUNTANT', 'SUPERVISOR', 'WORKER', 'VETERINARIAN',
  ];

  const createdRoles = await Promise.all(
    roles.map((role) =>
      prisma.role.upsert({ where: { name: role }, update: {}, create: { name: role } })
    )
  );

  const ownerRole = createdRoles.find(r => r.name === 'ORGANIZATION_OWNER');

  const permissions = [
    'farm.read', 'farm.write', 'farm.delete',
    'crop.read', 'crop.write', 'crop.delete',
    'livestock.read', 'livestock.write', 'livestock.delete',
    'poultry.read', 'poultry.write', 'poultry.delete',
    'inventory.read', 'inventory.write', 'inventory.delete',
    'finance.read', 'finance.write', 'finance.delete',
    'worker.read', 'worker.write', 'worker.delete',
    'notification.read', 'notification.write',
    'reporting.read', 'reporting.write',
    'organization.read', 'organization.write', 'organization.delete',
    'organization.manage', 'users.manage', 'billing.manage',
  ];

  const createdPermissions = await Promise.all(
    permissions.map((name) =>
      prisma.permission.upsert({ where: { name }, update: {}, create: { name } })
    )
  );

  const permissionByName = Object.fromEntries(createdPermissions.map((p) => [p.name, p]));

  const rolePermissions = {
    SUPER_ADMIN: ['*'],
    SUPPORT_ADMIN: ['*.read'],
    ORGANIZATION_OWNER: permissions,
    FARM_MANAGER: [
      'farm.read', 'farm.write', 'farm.delete',
      'crop.read', 'crop.write', 'crop.delete',
      'livestock.read', 'livestock.write', 'livestock.delete',
      'poultry.read', 'poultry.write', 'poultry.delete',
      'inventory.read', 'inventory.write',
      'finance.read', 'finance.write',
      'worker.read', 'worker.write',
      'notification.read', 'reporting.read',
    ],
    ACCOUNTANT: ['finance.read', 'finance.write', 'farm.read', 'inventory.read', 'reporting.read'],
    SUPERVISOR: [
      'farm.read', 'crop.read', 'crop.write',
      'livestock.read', 'livestock.write',
      'poultry.read', 'poultry.write',
      'worker.read', 'worker.write',
      'notification.read', 'reporting.read',
    ],
    VETERINARIAN: ['livestock.read', 'livestock.write', 'poultry.read', 'poultry.write', 'farm.read', 'notification.read'],
    WORKER: ['farm.read', 'crop.read', 'livestock.read', 'poultry.read', 'inventory.read', 'worker.read', 'notification.read'],
  };

  for (const [roleName, perms] of Object.entries(rolePermissions)) {
    const role = createdRoles.find((r) => r.name === roleName);
    if (perms.includes('*')) {
      const data = createdPermissions.map((p) => ({ roleId: role.id, permissionId: p.id }));
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      await prisma.rolePermission.createMany({ data, skipDuplicates: true });
      continue;
    }
    for (const permissionName of perms) {
      const permission = permissionByName[permissionName];
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  const org = await prisma.organization.upsert({
    where: { id: 'default-org-id' },
    update: {},
    create: { id: 'default-org-id', name: 'Default Farm Organization', slug: 'default-farm', email: 'admin@farm.com' },
  });

  const passwordHash = await bcrypt.hash('admin1234', 12);
  await prisma.user.upsert({
    where: { email: 'admin@farm.com' },
    update: {},
    create: {
      organizationId: org.id,
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@farm.com',
      passwordHash,
      roleId: ownerRole.id,
    },
  });

  console.log('Seeding complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
