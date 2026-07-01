import { setOrganizationId, setSuperAdmin, clearOrganizationId } from './rls';

/**
 * Minimal request interface — works with Express, NestJS, or any HTTP framework.
 */
interface RlsRequest {
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Minimal response interface — works with Express, NestJS, or any HTTP framework.
 */
interface RlsResponse {
  on(event: string, listener: () => void): void;
}

/**
 * Middleware that extracts organizationId and role from the request
 * (set by the API gateway's proxy middleware) and configures the
 * RLS context for all subsequent Prisma queries in this request.
 *
 * - Regular users: scoped to their organization via RLS
 * - Super admins: bypass RLS, see all organizations
 *
 * Usage (Express):
 *   import { rlsMiddleware } from '@farm/database';
 *   app.use(rlsMiddleware);
 *
 * Usage (NestJS main.ts):
 *   import { rlsMiddleware } from '@farm/database';
 *   app.use(rlsMiddleware);
 */
export function rlsMiddleware(req: RlsRequest, res: RlsResponse, next: () => void) {
  const orgId = req.headers['x-organization-id'] as string | undefined;
  const role = req.headers['x-user-role'] as string | undefined;

  // Super admins bypass RLS
  if (role === 'SUPER_ADMIN') {
    setSuperAdmin(true);
  } else if (orgId) {
    setOrganizationId(orgId);
  }

  // Clear when the request finishes
  res.on('finish', () => {
    clearOrganizationId();
  });

  next();
}
