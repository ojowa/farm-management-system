const { PrismaClient } = require('./node_modules/.pnpm/@prisma+client@6.19.3_prism_512fca8994ff5e581c2171847f185257/node_modules/@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const p = new PrismaClient({ log: ['error'] });
  try {
    const user = await p.user.findUnique({
      where: { email: 'Admin@fms.com' },
      include: { role: true },
    });
    console.log('User found:', !!user);
    if (user) {
      console.log('  email:', user.email);
      console.log('  role:', user.role?.name);
      console.log('  isActive:', user.isActive);
      console.log('  hash:', user.passwordHash);
      const match = await bcrypt.compare('password123', user.passwordHash);
      console.log('  password match:', match);
    }
  } catch (e) {
    console.error('DB Error:', e.message);
  } finally {
    await p.$disconnect();
  }
}
main();
