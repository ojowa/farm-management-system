import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // 1. Delete all existing users (cascade through related tables)
  await prisma.refreshToken.deleteMany()
  await prisma.userSession.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.userOrganization.deleteMany()
  await prisma.user.deleteMany()
  console.log('  Cleared all users and related records')

  // 2. Create System Roles
  const roleData = [
    { name: 'SUPER_ADMIN', description: 'Platform superadmin — full access to all organizations and system settings', isSystem: true },
    { name: 'SUPPORT_ADMIN', description: 'Platform support — read-only access for troubleshooting', isSystem: true },
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
        data: { description: role.description, isSystem: role.isSystem },
      })
      createdRoles.push(existing)
    } else {
      const created = await prisma.role.create({ data: role })
      createdRoles.push(created)
    }
  }

  // 3. Create Permissions
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
    { name: 'organization.read', description: 'View organization settings', category: 'Organization' },
    { name: 'organization.write', description: 'Edit organization settings', category: 'Organization' },
    { name: 'organization.delete', description: 'Delete organization', category: 'Organization' },
    { name: 'organization.manage', description: 'Manage organization membership and settings', category: 'Organization' },
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

  // 4. Assign permissions to roles
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
      'communication.read', 'communication.write',
      'reporting.read',
    ],
    ACCOUNTANT: ['finance.read', 'finance.write', 'farm.read', 'inventory.read', 'reporting.read'],
    SUPERVISOR: [
      'farm.read', 'crop.read', 'crop.write',
      'livestock.read', 'livestock.write',
      'poultry.read', 'poultry.write',
      'worker.read', 'worker.write',
      'communication.read', 'reporting.read',
    ],
    VETERINARIAN: ['livestock.read', 'livestock.write', 'poultry.read', 'poultry.write', 'farm.read'],
    WORKER: ['farm.read', 'crop.read', 'livestock.read', 'poultry.read', 'inventory.read', 'worker.read', 'communication.read'],
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

  // 5. Create Demo Organization
  const demoOrg = await prisma.organization.upsert({
    where: { id: 'demo-org-id' },
    update: {},
    create: {
      id: 'demo-org-id',
      name: 'Demo Farm',
      slug: 'demo-farm',
      email: 'demo@farm.com',
      subscriptionPlan: 'ENTERPRISE',
      subscriptionStatus: 'ACTIVE',
    },
  })

  // 6. Create Super Admin (no org — platform developer login)
  const superAdminRole = createdRoles.find(r => r.name === 'SUPER_ADMIN')!
  const passwordHash = await bcrypt.hash('password123', 12)

  await prisma.user.create({
    data: {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'Admin@fms.com',
      passwordHash,
      roleId: superAdminRole.id,
    },
  })
  console.log('  Created Super Admin: Admin@fms.com / password123 (no organization)')

  // 7. Create Demo Organization Owner (admin app login)
  const ownerRole = createdRoles.find(r => r.name === 'ORGANIZATION_OWNER')!

  await prisma.user.create({
    data: {
      organizationId: demoOrg.id,
      firstName: 'Demo',
      lastName: 'Owner',
      email: 'demo@farm.com',
      passwordHash,
      roleId: ownerRole.id,
    },
  })
  console.log('  Created Org Owner: demo@farm.com / password123')

  // 8. Create Demo Workers (web/mobile login)
  const workerUsers = [
    { role: 'FARM_MANAGER', firstName: 'Farm', lastName: 'Manager', email: 'farmmanager.demo@farm.com' },
    { role: 'ACCOUNTANT', firstName: 'Account', lastName: 'Manager', email: 'accountant.demo@farm.com' },
    { role: 'SUPERVISOR', firstName: 'Super', lastName: 'Visor', email: 'supervisor.demo@farm.com' },
    { role: 'VETERINARIAN', firstName: 'Vet', lastName: 'Doctor', email: 'veterinarian.demo@farm.com' },
    { role: 'WORKER', firstName: 'Farm', lastName: 'Worker', email: 'worker.demo@farm.com' },
  ]

  for (const w of workerUsers) {
    const role = createdRoles.find(r => r.name === w.role)!
    await prisma.user.create({
      data: {
        organizationId: demoOrg.id,
        firstName: w.firstName,
        lastName: w.lastName,
        email: w.email,
        passwordHash,
        roleId: role.id,
      },
    })
    console.log(`  Created ${w.role}: ${w.email} / password123`)
  }

  // 9. Create Subscription Plans
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

  // 10. Create Feature Flags (10 consolidated modules)
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

  // 11. Create Demo Farms
  const farm1 = await prisma.farm.upsert({
    where: { id: 'demo-farm-1' },
    update: {},
    create: {
      id: 'demo-farm-1',
      organizationId: demoOrg.id,
      name: 'Green Valley Farm',
      location: 'Ogun State, Nigeria',
      size: 50,
      farmType: 'CROP',
      status: 'active',
    },
  })

  const farm2 = await prisma.farm.upsert({
    where: { id: 'demo-farm-2' },
    update: {},
    create: {
      id: 'demo-farm-2',
      organizationId: demoOrg.id,
      name: 'Sunrise Livestock Ranch',
      location: 'Oyo State, Nigeria',
      size: 30,
      farmType: 'LIVESTOCK',
      status: 'active',
    },
  })
  console.log('  Created 2 demo farms')

  // 12. Create Fields for Farm 1
  const field1 = await prisma.field.create({
    data: { farmId: farm1.id, name: 'North Field', size: 25 },
  })
  const field2 = await prisma.field.create({
    data: { farmId: farm1.id, name: 'South Field', size: 20 },
  })

  // 13. Create Crops and CropCycles
  const maizeCrop = await prisma.crop.upsert({
    where: { id: 'crop-maize' },
    update: {},
    create: { id: 'crop-maize', name: 'Maize' },
  })
  const cassavaCrop = await prisma.crop.upsert({
    where: { id: 'crop-cassava' },
    update: {},
    create: { id: 'crop-cassava', name: 'Cassava' },
  })
  const tomatoCrop = await prisma.crop.upsert({
    where: { id: 'crop-tomato' },
    update: {},
    create: { id: 'crop-tomato', name: 'Tomato' },
  })

  await prisma.cropCycle.createMany({
    data: [
      { organizationId: demoOrg.id, fieldId: field1.id, cropId: maizeCrop.id, plantingDate: new Date('2026-03-01'), status: 'growing', health: 85 },
      { organizationId: demoOrg.id, fieldId: field2.id, cropId: cassavaCrop.id, plantingDate: new Date('2026-02-15'), status: 'growing', health: 90 },
      { organizationId: demoOrg.id, fieldId: field1.id, cropId: tomatoCrop.id, plantingDate: new Date('2025-11-01'), harvestDate: new Date('2026-02-01'), status: 'harvested', health: 100 },
    ],
    skipDuplicates: true,
  })
  console.log('  Created 3 crops and crop cycles')

  // 14. Create Demo Livestock
  await prisma.livestock.createMany({
    data: [
      { organizationId: demoOrg.id, farmId: farm2.id, species: 'Cattle', breed: 'Ndama', gender: 'Female', birthDate: new Date('2023-06-15'), status: 'healthy' },
      { organizationId: demoOrg.id, farmId: farm2.id, species: 'Cattle', breed: 'Ndama', gender: 'Male', birthDate: new Date('2023-03-10'), status: 'healthy' },
      { organizationId: demoOrg.id, farmId: farm2.id, species: 'Goat', breed: 'Sahel', gender: 'Female', birthDate: new Date('2024-01-20'), status: 'healthy' },
      { organizationId: demoOrg.id, farmId: farm2.id, species: 'Goat', breed: 'Sahel', gender: 'Female', birthDate: new Date('2024-03-05'), status: 'healthy' },
    ],
    skipDuplicates: true,
  })
  console.log('  Created 4 demo livestock')

  // 15. Create Demo Workers (detailed Worker model)
  await prisma.worker.createMany({
    data: [
      { organizationId: demoOrg.id, farmId: farm1.id, firstName: 'Farm', lastName: 'Manager', position: 'FARM_MANAGER', status: 'ACTIVE' },
      { organizationId: demoOrg.id, farmId: farm1.id, firstName: 'John', lastName: 'Worker', position: 'WORKER', status: 'ACTIVE' },
      { organizationId: demoOrg.id, farmId: farm1.id, firstName: 'Jane', lastName: 'Supervisor', position: 'SUPERVISOR', status: 'ACTIVE' },
      { organizationId: demoOrg.id, farmId: farm2.id, firstName: 'Vet', lastName: 'Doctor', position: 'VETERINARIAN', status: 'ACTIVE' },
      { organizationId: demoOrg.id, farmId: farm2.id, firstName: 'Ranch', lastName: 'Hand', position: 'WORKER', status: 'ACTIVE' },
    ],
    skipDuplicates: true,
  })
  console.log('  Created 5 demo workers')

  // 16. Create Demo Tasks
  await prisma.task.createMany({
    data: [
      { organizationId: demoOrg.id, farmId: farm1.id, title: 'Inspect maize field', description: 'Check for pests and growth progress', status: 'PENDING', priority: 'HIGH', assignedToName: 'Farm Manager' },
      { organizationId: demoOrg.id, farmId: farm1.id, title: 'Apply fertilizer to cassava', description: 'NPK fertilizer application', status: 'IN_PROGRESS', priority: 'MEDIUM', assignedToName: 'Farm Manager' },
      { organizationId: demoOrg.id, farmId: farm2.id, title: 'Vaccinate cattle', description: 'Annual vaccination schedule', status: 'PENDING', priority: 'HIGH' },
    ],
    skipDuplicates: true,
  })
  console.log('  Created 3 demo tasks')

  // 17. Create Demo Inventory
  await prisma.inventory.createMany({
    data: [
      { organizationId: demoOrg.id, farmId: farm1.id, name: 'NPK Fertilizer', category: 'Fertilizer', quantity: 50, unit: 'bags', minimumQuantity: 10 },
      { organizationId: demoOrg.id, farmId: farm1.id, name: 'Maize Seeds', category: 'Seeds', quantity: 20, unit: 'kg', minimumQuantity: 5 },
      { organizationId: demoOrg.id, farmId: farm2.id, name: 'Animal Feed', category: 'Feed', quantity: 100, unit: 'kg', minimumQuantity: 20 },
    ],
    skipDuplicates: true,
  })
  console.log('  Created 3 demo inventory items')

  console.log('')
  console.log('Seeding complete!')
  console.log('')
  console.log('--- Login Credentials ---')
  console.log('Console (Platform Developer): Admin@fms.com / password123')
  console.log('Admin (Farm Owner):           demo@farm.com / password123')
  console.log('Web/Mobile (Farm Manager):    farmmanager.demo@farm.com / password123')
  console.log('Web/Mobile (Accountant):      accountant.demo@farm.com / password123')
  console.log('Web/Mobile (Supervisor):      supervisor.demo@farm.com / password123')
  console.log('Web/Mobile (Veterinarian):    veterinarian.demo@farm.com / password123')
  console.log('Web/Mobile (Worker):          worker.demo@farm.com / password123')
  console.log('All passwords: password123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
