import { PrismaClient } from '@prisma/client';
import { withRLS, getOrganizationId } from './rls';

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
 *
 * - Automatically filters rows by organizationId via PostgreSQL RLS (reads).
 * - Automatically injects organizationId from AsyncLocalStorage context (writes).
 */
export const scopedPrisma = withRLS(basePrisma).$extends({
  query: {
    $allModels: {
      async create({ args, query }) {
        const orgId = getOrganizationId();
        if (orgId && args.data && !args.data.organizationId) {
          args.data.organizationId = orgId;
        }
        return query(args);
      },
      async createMany({ args, query }) {
        const orgId = getOrganizationId();
        if (orgId && args.data) {
          const items = Array.isArray(args.data) ? args.data : [args.data];
          args.data = items.map((item: any) =>
            item.organizationId ? item : { ...item, organizationId: orgId }
          );
        }
        return query(args);
      },
      async upsert({ args, query }) {
        const orgId = getOrganizationId();
        if (orgId) {
          if (args.create && !args.create.organizationId) {
            args.create.organizationId = orgId;
          }
        }
        return query(args);
      },
    },
  },
});

export {
  setOrganizationId,
  setSuperAdmin,
  getOrganizationId,
  getIsSuperAdmin,
  clearOrganizationId,
  runWithRlsContext,
} from './rls';
