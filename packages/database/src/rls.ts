import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

interface RlsContext {
  organizationId: string | null;
  isSuperAdmin: boolean;
}

const asyncLocalStorage = new AsyncLocalStorage<RlsContext>();

/**
 * Set the current organization for this request.
 * Called by middleware after JWT verification.
 */
export function setOrganizationId(orgId: string) {
  const store = asyncLocalStorage.getStore();
  if (store) store.organizationId = orgId;
}

/**
 * Mark this request as a super admin (bypasses RLS).
 */
export function setSuperAdmin(bypass: boolean) {
  const store = asyncLocalStorage.getStore();
  if (store) store.isSuperAdmin = bypass;
}

/**
 * Get the current organization ID.
 */
export function getOrganizationId(): string | null {
  return asyncLocalStorage.getStore()?.organizationId ?? null;
}

/**
 * Check if current request is a super admin.
 */
export function getIsSuperAdmin(): boolean {
  return asyncLocalStorage.getStore()?.isSuperAdmin ?? false;
}

/**
 * Clear the current organization (call at end of request).
 */
export function clearOrganizationId() {
  const store = asyncLocalStorage.getStore();
  if (store) {
    store.organizationId = null;
    store.isSuperAdmin = false;
  }
}

/**
 * Prisma extension that automatically sets the PostgreSQL session
 * variable `app.current_organization` before every query.
 *
 * Uses AsyncLocalStorage so each concurrent request has its own
 * isolated org context — no cross-request contamination.
 */
export function withRLS(prisma: PrismaClient) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, args, query }) {
          const store = asyncLocalStorage.getStore();
          const orgId = store?.organizationId ?? null;
          const superAdmin = store?.isSuperAdmin ?? false;

          if (superAdmin) {
            await prisma.$executeRawUnsafe(
              `SET app.is_super_admin = 'true'`
            );
          } else if (orgId) {
            await prisma.$executeRawUnsafe(
              `SET app.is_super_admin = 'false'`
            );
            await prisma.$executeRawUnsafe(
              `SET app.current_organization = '${orgId.replace(/'/g, "''")}'`
            );
          }

          return query(args);
        },
      },
    },
  });
}

/**
 * Run a callback within an RLS context.
 * Used by middleware to establish the async context for each request.
 */
export function runWithRlsContext<T>(callback: () => T): T {
  return asyncLocalStorage.run(
    { organizationId: null, isSuperAdmin: false },
    callback
  );
}
