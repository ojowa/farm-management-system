import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // 1. Create Default Roles with descriptions
  const roleData = [
    { name: 'SUPER_ADMIN', description: 'Full platform access across all organizations', isSystem: true },
    { name: 'SUPPORT_ADMIN', description: 'Read-only platform access for support staff', isSystem: true },
    { name: 'ORGANIZATION_OWNER', description: 'Full control over own organization, users, and billing', isSystem: true },
    { name: 'FARM_MANAGER', description: 'Manage farms, crops, livestock, poultry, and inventory', isSystem: true },
    { name: 'ACCOUNTANT', description: 'View and manage financial records and reports', isSystem: true },
    { name: 'SUPERVISOR', description: 'Supervise farm operations, crops, and workers', isSystem: true },
    { name: 'VETERINARIAN', description: 'Manage livestock and poultry health records', isSystem: true },
    { name: 'WORKER', description: 'Read-only access to farm data and notifications', isSystem: true },
  ]

  const createdRoles = await Promise.all(
    roleData.map((role) =>
      prisma.role.upsert({
        where: { name: role.name },
        update: { description: role.description, isSystem: role.isSystem },
        create: role,
      })
    )
  )

  const ownerRole = createdRoles.find(r => r.name === 'ORGANIZATION_OWNER')!

  // 2. Create Default Permissions with descriptions and categories
  const permissionData = [
    // Farm
    { name: 'farm.read', description: 'View farms and farm details', category: 'Farm' },
    { name: 'farm.write', description: 'Create and edit farms', category: 'Farm' },
    { name: 'farm.delete', description: 'Delete farms', category: 'Farm' },
    // Crop
    { name: 'crop.read', description: 'View crops and crop cycles', category: 'Crop' },
    { name: 'crop.write', description: 'Create and edit crops', category: 'Crop' },
    { name: 'crop.delete', description: 'Delete crops', category: 'Crop' },
    // Livestock
    { name: 'livestock.read', description: 'View livestock records', category: 'Livestock' },
    { name: 'livestock.write', description: 'Create and edit livestock', category: 'Livestock' },
    { name: 'livestock.delete', description: 'Delete livestock records', category: 'Livestock' },
    // Poultry
    { name: 'poultry.read', description: 'View poultry flocks and records', category: 'Poultry' },
    { name: 'poultry.write', description: 'Create and edit poultry data', category: 'Poultry' },
    { name: 'poultry.delete', description: 'Delete poultry records', category: 'Poultry' },
    // Inventory
    { name: 'inventory.read', description: 'View inventory items', category: 'Inventory' },
    { name: 'inventory.write', description: 'Create and edit inventory', category: 'Inventory' },
    { name: 'inventory.delete', description: 'Delete inventory items', category: 'Inventory' },
    // Finance
    { name: 'finance.read', description: 'View expenses, sales, and financial data', category: 'Finance' },
    { name: 'finance.write', description: 'Create and edit financial records', category: 'Finance' },
    { name: 'finance.delete', description: 'Delete financial records', category: 'Finance' },
    // Worker
    { name: 'worker.read', description: 'View worker profiles', category: 'Worker' },
    { name: 'worker.write', description: 'Create and edit workers', category: 'Worker' },
    { name: 'worker.delete', description: 'Delete worker records', category: 'Worker' },
    // Notification
    { name: 'notification.read', description: 'View notifications', category: 'Notification' },
    { name: 'notification.write', description: 'Manage notification preferences', category: 'Notification' },
    // Reporting
    { name: 'reporting.read', description: 'View reports and analytics', category: 'Reporting' },
    { name: 'reporting.write', description: 'Create and export reports', category: 'Reporting' },
    // Organization
    { name: 'organization.read', description: 'View organization settings', category: 'Organization' },
    { name: 'organization.write', description: 'Edit organization settings', category: 'Organization' },
    { name: 'organization.delete', description: 'Delete organization', category: 'Organization' },
    { name: 'organization.manage', description: 'Manage organization membership and settings', category: 'Organization' },
    // Users & Billing
    { name: 'users.manage', description: 'Manage users within the organization', category: 'Administration' },
    { name: 'billing.manage', description: 'Manage subscription and billing', category: 'Administration' },
  ]

  const createdPermissions = await Promise.all(
    permissionData.map((p) =>
      prisma.permission.upsert({
        where: { name: p.name },
        update: { description: p.description, category: p.category },
        create: p,
      })
    )
  )

  const permissionByName = Object.fromEntries(createdPermissions.map((p) => [p.name, p]))

  // 3. Assign permissions to roles
  const rolePermissions: Record<string, string[]> = {
    SUPER_ADMIN: ['*'],
    SUPPORT_ADMIN: ['*.read'],
    ORGANIZATION_OWNER: [
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
    ],
    FARM_MANAGER: [
      'farm.read', 'farm.write', 'farm.delete',
      'crop.read', 'crop.write', 'crop.delete',
      'livestock.read', 'livestock.write', 'livestock.delete',
      'poultry.read', 'poultry.write', 'poultry.delete',
      'inventory.read', 'inventory.write',
      'finance.read', 'finance.write',
      'worker.read', 'worker.write',
      'notification.read',
      'reporting.read',
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
  }

  for (const [roleName, perms] of Object.entries(rolePermissions)) {
    const role = createdRoles.find((r) => r.name === roleName)!
    if (perms.includes('*')) {
      const data = createdPermissions.map((p) => ({ roleId: role.id, permissionId: p.id }))
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })
      await prisma.rolePermission.createMany({ data, skipDuplicates: true })
      continue
    }
    for (const permissionName of perms) {
      const permission = permissionByName[permissionName]
      if (!permission) {
        continue
      }
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      })
    }
  }

  // 4. Create Organization
  const org = await prisma.organization.upsert({
    where: { id: 'default-org-id' },
    update: {},
    create: {
      id: 'default-org-id',
      name: 'Default Farm Organization',
      email: 'admin@farm.com',
    },
  })

  // 5. Create Admin User (ORGANIZATION_OWNER) with a known password so the seed is usable
  const passwordHash = await bcrypt.hash('admin1234', 12)
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
  })

  // 6. Create SUPER_ADMIN user (superadmin@farm.com / superadmin123)
  const superAdminRole = createdRoles.find(r => r.name === 'SUPER_ADMIN')!
  const superAdminPasswordHash = await bcrypt.hash('superadmin123', 12)
  await prisma.user.upsert({
    where: { email: 'superadmin@farm.com' },
    update: {},
    create: {
      organizationId: org.id,
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@farm.com',
      passwordHash: superAdminPasswordHash,
      roleId: superAdminRole.id,
    },
  })

  console.log('Seeding complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
