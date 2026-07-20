require('dotenv').config({ path: 'C:\\Users\\OJOWA\\Documents\\Farm Management System\\.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@fms.org' },
    include: { role: true }
  });
  console.log('User:', JSON.stringify(user, null, 2));
  await prisma.$disconnect();
}
main().catch(console.error);