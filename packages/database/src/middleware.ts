import { runWithRlsContext, setOrganizationId, setSuperAdmin, clearOrganizationId } from './rls';

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
 * Uses AsyncLocalStorage so each concurrent request gets its own
 * isolated org context — no cross-request contamination.
 *
 * - Regular users: scoped to their organization via RLS
 * - Super admins: bypass RLS, see all organizations
 *
 * Usage (Express):
 *   import { rlsMiddleware } from '@farm/database';
 *   app.use(rlsMiddleware);
 */
export function rlsMiddleware(req: RlsRequest, res: RlsResponse, next: () => void) {
  runWithRlsContext(() => {
    const orgId = req.headers['x-organization-id'] as string | undefined;
    const role = req.headers['x-user-role'] as string | undefined;

    if (role === 'SUPER_ADMIN') {
      setSuperAdmin(true);
    } else if (orgId) {
      setOrganizationId(orgId);
    }

    res.on('finish', () => {
      clearOrganizationId();
    });

    next();
  });
}
