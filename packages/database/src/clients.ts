import { PrismaClient } from '@prisma/client';
import { withRLS, getOrganizationId } from './rls';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { loadEnv } from '@farm/env';

// Guarantee env is loaded before anything reads process.env (e.g. DATABASE_URL).
// This protects against ES import hoisting where consumers' loadEnv() calls
// would otherwise run AFTER this module is already evaluated.
loadEnv();
dotenv.config({ path: join(__dirname, '..', '..', '..', '.env') });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL;

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    databaseUrl
      ? { datasources: { db: { url: databaseUrl } } }
      : undefined,
  );

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
        const data = args.data as any;
        if (orgId && data && !data.organizationId) {
          data.organizationId = orgId;
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
        const create = args.create as any;
        if (orgId) {
          if (create && !create.organizationId) {
            create.organizationId = orgId;
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
