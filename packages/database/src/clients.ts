import { PrismaClient } from '@prisma/client';
import { withRLS } from './rls';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = basePrisma;
}

/**
 * Base PrismaClient — use for system-level queries (seed, migrations).
 */
export const prisma = basePrisma;

/**
 * RLS-aware PrismaClient — use for tenant-scoped queries.
 * Automatically filters rows by organizationId via PostgreSQL RLS.
 */
export const scopedPrisma = withRLS(basePrisma);

export {
  setOrganizationId,
  setSuperAdmin,
  getOrganizationId,
  getIsSuperAdmin,
  clearOrganizationId,
} from './rls';
