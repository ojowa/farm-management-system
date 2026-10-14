import { PrismaClient } from '@prisma/client';
import { withRLS, getOrganizationId } from './rls';
import { makeSoftDeleteHook } from './soft-delete';
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
 * Base PrismaClient with soft delete applied to tenant-content models —
 * use for system-level queries (seed, migrations). Rows of models outside
 * SOFT_DELETE_MODELS (auth plumbing, platform tables, shared catalogs)
 * are deleted for real.
 */
export const prisma = basePrisma.$extends({
  query: { $allModels: makeSoftDeleteHook(basePrisma) },
});

/**
 * RLS-aware PrismaClient — use for tenant-scoped queries.
 *
 * - Automatically filters rows by organizationId via PostgreSQL RLS (reads).
 * - Automatically injects organizationId from AsyncLocalStorage context (writes).
 */
/**
 * The create hooks below stamp organizationId from the RLS context so no
 * insert can forget its tenant. Some models have no organizationId column at
 * all (Field, PoultryHouse, Pen, Breed, FeedingRecord, …) — injecting the
 * field would make Prisma reject the query, so on a validation error we
 * retry once without the injected column. A validation error caused by
 * something else in the payload fails again on the retry and still surfaces.
 */
function isValidationError(err: unknown): boolean {
  const e = err as { name?: string; constructor?: { name?: string } } | null;
  return e?.name === 'PrismaClientValidationError' || e?.constructor?.name === 'PrismaClientValidationError';
}

const stampedPrisma = withRLS(basePrisma).$extends({
  query: {
    $allModels: {
      async create({ args, query }: { args: any; query: (args: any) => Promise<any> }) {
        const orgId = getOrganizationId();
        const data = args.data as any;
        if (orgId && data && !data.organizationId) {
          data.organizationId = orgId;
          try {
            return await query(args);
          } catch (err) {
            if (!isValidationError(err)) throw err;
            delete data.organizationId;
            return query(args);
          }
        }
        return query(args);
      },
      async createMany({ args, query }: { args: any; query: (args: any) => Promise<any> }) {
        const orgId = getOrganizationId();
        if (orgId && args.data) {
          const items = Array.isArray(args.data) ? args.data : [args.data];
          const original = args.data;
          args.data = items.map((item: any) =>
            item.organizationId ? item : { ...item, organizationId: orgId }
          );
          try {
            return await query(args);
          } catch (err) {
            if (!isValidationError(err)) throw err;
            args.data = original;
            return query(args);
          }
        }
        return query(args);
      },
      async upsert({ args, query }: { args: any; query: (args: any) => Promise<any> }) {
        const orgId = getOrganizationId();
        const create = args.create as any;
        if (orgId) {
          if (create && !create.organizationId) {
            create.organizationId = orgId;
            try {
              return await query(args);
            } catch (err) {
              if (!isValidationError(err)) throw err;
              delete create.organizationId;
              return query(args);
            }
          }
        }
        return query(args);
      },
    },
  },
});

/**
 * RLS-aware PrismaClient with soft delete applied on top — the workhorse
 * exported for tenant-facing modules. Soft delete runs outermost so that
 * delete/deleteMany are converted before any other hook sees them.
 */
export const scopedPrisma = stampedPrisma.$extends({
  query: { $allModels: makeSoftDeleteHook(basePrisma) },
});

export {
  setOrganizationId,
  setSuperAdmin,
  getOrganizationId,
  getIsSuperAdmin,
  clearOrganizationId,
  runWithRlsContext,
} from './rls';
