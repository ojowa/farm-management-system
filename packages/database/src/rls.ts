import { PrismaClient } from '@prisma/client';

let currentOrganizationId: string | null = null;
let isSuperAdmin = false;

/**
 * Set the current organization for this request.
 * Called by middleware after JWT verification.
 */
export function setOrganizationId(orgId: string) {
  currentOrganizationId = orgId;
}

/**
 * Mark this request as a super admin (bypasses RLS).
 */
export function setSuperAdmin(bypass: boolean) {
  isSuperAdmin = bypass;
}

/**
 * Get the current organization ID.
 */
export function getOrganizationId(): string | null {
  return currentOrganizationId;
}

/**
 * Check if current request is a super admin.
 */
export function getIsSuperAdmin(): boolean {
  return isSuperAdmin;
}

/**
 * Clear the current organization (call at end of request).
 */
export function clearOrganizationId() {
  currentOrganizationId = null;
  isSuperAdmin = false;
}

/**
 * Prisma extension that automatically sets the PostgreSQL session
 * variable `app.current_organization` before every query.
 *
 * RLS policies in PostgreSQL read this variable to enforce tenant isolation.
 * Super admins get `app.is_super_admin = 'true'` which bypasses all RLS.
 */
export function withRLS(prisma: PrismaClient) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, args, query }) {
          const orgId = currentOrganizationId;
          const superAdmin = isSuperAdmin;

          if (superAdmin) {
            // Super admins bypass RLS entirely
            await prisma.$executeRawUnsafe(
              `SET app.is_super_admin = 'true'`
            );
          } else if (orgId) {
            // Regular users are scoped to their organization
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
