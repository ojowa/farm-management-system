import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // 1. Create Default Roles
  const roles = [
    'SUPER_ADMIN',
    'ORGANIZATION_OWNER',
    'FARM_MANAGER',
    'ACCOUNTANT',
    'SUPERVISOR',
    'WORKER',
    'VETERINARIAN',
  ]

  const createdRoles = await Promise.all(
    roles.map((role) =>
      prisma.role.upsert({
        where: { name: role },
        update: {},
        create: { name: role },
      })
    )
  )

  const ownerRole = createdRoles.find(r => r.name === 'ORGANIZATION_OWNER')!

  // 2. Create Organization
  const org = await prisma.organization.upsert({
    where: { id: 'default-org-id' },
    update: {},
    create: {
      id: 'default-org-id',
      name: 'Default Farm Organization',
      email: 'admin@farm.com',
    },
  })

  // 3. Create Admin User
  await prisma.user.upsert({
    where: { email: 'admin@farm.com' },
    update: {},
    create: {
      organizationId: org.id,
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@farm.com',
      passwordHash: '$2b$10$YourHashedPasswordHere', // Replace with a real hash
      roleId: ownerRole.id,
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
