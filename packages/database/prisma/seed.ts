import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // 0. Clear all data (in dependency order)
  console.log('  Clearing existing data...')
  await prisma.refreshToken.deleteMany()
  await prisma.userSession.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.userOrganization.deleteMany()
  await prisma.rolePermission.deleteMany()
  await prisma.task.deleteMany()
  await prisma.inventory.deleteMany()
  await prisma.cropCycle.deleteMany()
  await prisma.crop.deleteMany()
  await prisma.field.deleteMany()
  await prisma.livestock.deleteMany()
  await prisma.worker.deleteMany()
  await prisma.farm.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.featureFlag.deleteMany()
  await prisma.subscriptionPlan.deleteMany()
  await prisma.permission.deleteMany()
  await prisma.role.deleteMany()
  console.log('  Cleared all data')

  // 1. Create System Roles
  const roleData = [
    { name: 'SUPER_ADMIN', description: 'Platform superadmin — full access to all organizations and system settings', isSystem: true, isPlatformAdmin: true },
    { name: 'SUPPORT_ADMIN', description: 'Platform support — read-only access for troubleshooting', isSystem: true, isPlatformAdmin: true },
    { name: 'ORGANIZATION_OWNER', description: 'Organization owner — full control over own organization, users, farms, and billing', isSystem: true },
    { name: 'FARM_MANAGER', description: 'Manage farms, crops, livestock, poultry, and inventory', isSystem: true },
    { name: 'ACCOUNTANT', description: 'View and manage financial records and reports', isSystem: true },
    { name: 'SUPERVISOR', description: 'Supervise farm operations, crops, and workers', isSystem: true },
    { name: 'VETERINARIAN', description: 'Manage livestock and poultry health records', isSystem: true },
    { name: 'WORKER', description: 'Read-only access to farm data and notifications', isSystem: true },
  ]

  const createdRoles: { id: string; name: string }[] = []
  for (const role of roleData) {
    const existing = await prisma.role.findFirst({
      where: { name: role.name, organizationId: null },
    })
    if (existing) {
      await prisma.role.update({
        where: { id: existing.id },
        data: { description: role.description, isSystem: role.isSystem, isPlatformAdmin: role.isPlatformAdmin ?? false },
      })
      createdRoles.push(existing)
    } else {
      const created = await prisma.role.create({ data: role })
      createdRoles.push(created)
    }
  }

  // 2. Create Permissions
  const permissionData = [
    { name: 'farm.read', description: 'View farms and farm details', category: 'Farm' },
    { name: 'farm.write', description: 'Create and edit farms', category: 'Farm' },
    { name: 'farm.delete', description: 'Delete farms', category: 'Farm' },
    { name: 'crop.read', description: 'View crops and crop cycles', category: 'Crop' },
    { name: 'crop.write', description: 'Create and edit crops', category: 'Crop' },
    { name: 'crop.delete', description: 'Delete crops', category: 'Crop' },
    { name: 'livestock.read', description: 'View livestock records', category: 'Livestock' },
    { name: 'livestock.write', description: 'Create and edit livestock', category: 'Livestock' },
    { name: 'livestock.delete', description: 'Delete livestock records', category: 'Livestock' },
    { name: 'poultry.read', description: 'View poultry flocks and records', category: 'Poultry' },
    { name: 'poultry.write', description: 'Create and edit poultry data', category: 'Poultry' },
    { name: 'poultry.delete', description: 'Delete poultry records', category: 'Poultry' },
    { name: 'inventory.read', description: 'View inventory items', category: 'Inventory' },
    { name: 'inventory.write', description: 'Create and edit inventory', category: 'Inventory' },
    { name: 'inventory.delete', description: 'Delete inventory items', category: 'Inventory' },
    { name: 'finance.read', description: 'View expenses, sales, and financial data', category: 'Finance' },
    { name: 'finance.write', description: 'Create and edit financial records', category: 'Finance' },
    { name: 'finance.delete', description: 'Delete financial records', category: 'Finance' },
    { name: 'worker.read', description: 'View worker profiles', category: 'Worker' },
    { name: 'worker.write', description: 'Create and edit workers', category: 'Worker' },
    { name: 'worker.delete', description: 'Delete worker records', category: 'Worker' },
    { name: 'communication.read', description: 'View messages and correspondence', category: 'Communication' },
    { name: 'communication.write', description: 'Send messages and correspondence', category: 'Communication' },
    { name: 'reporting.read', description: 'View reports and analytics', category: 'Reporting' },
    { name: 'reporting.write', description: 'Create and export reports', category: 'Reporting' },
    { name: 'reporting.delete', description: 'Delete reports', category: 'Reporting' },
    { name: 'notification.read', description: 'View notifications', category: 'Notification' },
    { name: 'notification.write', description: 'Create and manage notifications', category: 'Notification' },
    { name: 'notification.delete', description: 'Delete notifications', category: 'Notification' },
    { name: 'organization.read', description: 'View organization settings', category: 'Organization' },
    { name: 'organization.write', description: 'Edit organization settings', category: 'Organization' },
    { name: 'organization.delete', description: 'Delete organization', category: 'Organization' },
    { name: 'organization.manage', description: 'Manage organization membership and settings', category: 'Organization' },
    { name: 'users.read', description: 'View users within the organization', category: 'Administration' },
    { name: 'users.manage', description: 'Manage users within the organization', category: 'Administration' },
    { name: 'billing.manage', description: 'Manage subscription and billing', category: 'Administration' },
    { name: 'hr.read', description: 'View HR data, attendance, and leave records', category: 'HR' },
    { name: 'hr.write', description: 'Create and edit HR data, attendance, and leave records', category: 'HR' },
    { name: 'hr.delete', description: 'Delete HR records', category: 'HR' },
    { name: 'leave.read', description: 'View leave requests', category: 'HR' },
    { name: 'leave.write', description: 'Create and edit leave requests', category: 'HR' },
    { name: 'leave.approve', description: 'Approve or reject leave requests', category: 'HR' },
    { name: 'platform.manage', description: 'Manage platform-wide settings and organizations', category: 'Platform' },
    { name: 'role.read', description: 'View roles and permissions', category: 'Administration' },
    { name: 'role.write', description: 'Create and edit roles and permissions', category: 'Administration' },
    { name: 'apikey.read', description: 'View API keys', category: 'Administration' },
    { name: 'apikey.write', description: 'Create and manage API keys', category: 'Administration' },
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
      'communication.read', 'communication.write',
      'reporting.read', 'reporting.write', 'reporting.delete',
      'notification.read', 'notification.write', 'notification.delete',
      'organization.read', 'organization.write', 'organization.delete',
      'organization.manage', 'users.read', 'users.manage', 'billing.manage',
      'hr.read', 'hr.write', 'hr.delete', 'leave.read', 'leave.write', 'leave.approve',
    ],
    FARM_MANAGER: [
      'farm.read', 'farm.write', 'farm.delete',
      'crop.read', 'crop.write', 'crop.delete',
      'livestock.read', 'livestock.write', 'livestock.delete',
      'poultry.read', 'poultry.write', 'poultry.delete',
      'inventory.read', 'inventory.write',
      'finance.read', 'finance.write',
      'worker.read', 'worker.write',
      'communication.read', 'communication.write',
      'reporting.read',
      'notification.read', 'notification.write',
      'hr.read', 'hr.write', 'leave.read', 'leave.write',
    ],
    ACCOUNTANT: ['finance.read', 'finance.write', 'farm.read', 'inventory.read', 'reporting.read', 'notification.read', 'hr.read'],
    SUPERVISOR: [
      'farm.read', 'crop.read', 'crop.write',
      'livestock.read', 'livestock.write',
      'poultry.read', 'poultry.write',
      'worker.read', 'worker.write',
      'communication.read', 'reporting.read',
      'notification.read',
      'hr.read', 'leave.read', 'leave.write',
    ],
    VETERINARIAN: ['livestock.read', 'livestock.write', 'poultry.read', 'poultry.write', 'farm.read', 'hr.read'],
    WORKER: ['farm.read', 'crop.read', 'livestock.read', 'poultry.read', 'inventory.read', 'worker.read', 'communication.read', 'notification.read', 'leave.read', 'leave.write'],
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
      if (!permission) continue
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      })
    }
  }

  // 4. Create Subscription Plans
  const planData = [
    {
      name: 'FREE', displayName: 'Free Plan', description: 'Basic features for small farms',
      price: 0, currency: 'USD', billingCycle: 'NONE', maxUsers: 3, maxFarms: 1, maxStorage: 100,
      features: { modules: ['farm', 'crop', 'worker', 'communication', 'reporting'], farmTypes: ['CROP'] },
      sortOrder: 0,
    },
    {
      name: 'BASIC', displayName: 'Basic Plan', description: 'Essential features for growing farms',
      price: 29.99, currency: 'USD', billingCycle: 'MONTHLY', maxUsers: 10, maxFarms: 3, maxStorage: 500,
      features: { modules: ['farm', 'crop', 'livestock', 'inventory', 'worker', 'communication', 'reporting'], farmTypes: ['CROP', 'LIVESTOCK'] },
      sortOrder: 1,
    },
    {
      name: 'PRO', displayName: 'Professional Plan', description: 'Advanced features for professional farm management',
      price: 79.99, currency: 'USD', billingCycle: 'MONTHLY', maxUsers: 50, maxFarms: 20, maxStorage: 5120,
      features: { modules: ['farm', 'crop', 'livestock', 'poultry', 'inventory', 'finance', 'worker', 'communication', 'reporting'], farmTypes: ['CROP', 'LIVESTOCK', 'POULTRY', 'DAIRY'] },
      sortOrder: 2,
    },
    {
      name: 'ENTERPRISE', displayName: 'Enterprise Plan', description: 'Unlimited features for large organizations',
      price: 199.99, currency: 'USD', billingCycle: 'MONTHLY', maxUsers: 999999, maxFarms: 999999, maxStorage: 51200,
      features: { modules: ['farm', 'crop', 'livestock', 'poultry', 'inventory', 'finance', 'worker', 'communication', 'reporting', 'api_access', 'priority_support'], farmTypes: ['CROP', 'LIVESTOCK', 'POULTRY', 'DAIRY', 'AQUACULTURE'] },
      sortOrder: 3,
    },
  ]

  for (const plan of planData) {
    await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: { ...plan },
      create: { ...plan },
    })
  }

  // 5. Create Feature Flags
  const featureFlagData = [
    { key: 'farm.enabled', name: 'Farm Management', category: 'module', description: 'Farms, fields, GPS mapping' },
    { key: 'crop.enabled', name: 'Crop Management', category: 'module', description: 'Crops, crop cycles, irrigation, pest & disease, yield' },
    { key: 'livestock.enabled', name: 'Livestock Management', category: 'module', description: 'Livestock, health, breeding, weight tracking' },
    { key: 'poultry.enabled', name: 'Poultry Management', category: 'module', description: 'Flocks, feeding, vaccination, mortality' },
    { key: 'inventory.enabled', name: 'Inventory Management', category: 'module', description: 'Stock, equipment, low stock alerts' },
    { key: 'finance.enabled', name: 'Finance Management', category: 'module', description: 'Expenses, sales, profitability, contracts, marketplace' },
    { key: 'worker.enabled', name: 'Worker Management', category: 'module', description: 'Workers, tasks, attendance, leave, roster, shifts' },
    { key: 'communication.enabled', name: 'Communication', category: 'module', description: 'Internal messaging and correspondence' },
    { key: 'reporting.enabled', name: 'Reporting & Analytics', category: 'module', description: 'Reports, scheduled reports, analytics' },
    { key: 'notification.enabled', name: 'Notifications', category: 'module', description: 'System-wide notifications' },
    { key: 'platform.mobile_access', name: 'Mobile App Access', category: 'platform', description: 'Enable/disable mobile app access' },
    { key: 'platform.web_access', name: 'Web App Access', category: 'platform', description: 'Enable/disable web app access' },
    { key: 'platform.admin_access', name: 'Admin App Access', category: 'platform', description: 'Enable/disable admin app access' },
    { key: 'platform.api_access', name: 'API Access', category: 'platform', description: 'Enable/disable API access' },
    { key: 'integration.email', name: 'Email Notifications', category: 'integration', description: 'Enable/disable email notifications' },
    { key: 'integration.push', name: 'Push Notifications', category: 'integration', description: 'Enable/disable push notifications' },
    { key: 'integration.sms', name: 'SMS Notifications', category: 'integration', description: 'Enable/disable SMS notifications' },
  ]

  for (const flag of featureFlagData) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { name: flag.name, description: flag.description },
      create: { ...flag, defaultValue: true, isEnabled: true },
    })
  }

  console.log('Seeding complete! (roles, permissions, plans, feature flags)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
