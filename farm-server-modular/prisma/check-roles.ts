import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({
    where: { name: { in: ['SUPER_ADMIN', 'SUPPORT_ADMIN'] } },
    select: { id: true, name: true, isPlatformAdmin: true, isSystem: true }
  });
  console.log('Roles:', JSON.stringify(roles, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());