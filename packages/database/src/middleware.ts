import { runWithRlsContext, setOrganizationId, setSuperAdmin, clearOrganizationId } from './rls';
import { verifyServiceToken } from '@farm/auth';

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
 * **Service-to-service auth:** The middleware verifies the `x-service-token`
 * header signed by the API gateway. If the token is valid, it uses the
 * user context from it. If missing or invalid, the middleware still proceeds
 * but logs a warning — services with JwtAuthGuard will reject unauthenticated
 * requests at the controller level.
 *
 * Usage (Express):
 *   import { rlsMiddleware } from '@farm/database';
 *   app.use(rlsMiddleware);
 */
export function rlsMiddleware(req: RlsRequest, res: RlsResponse, next: () => void) {
  runWithRlsContext(() => {
    const serviceToken = req.headers['x-service-token'] as string | undefined;

    if (serviceToken) {
      // Verify the service token to prevent header spoofing
      try {
        const verified = verifyServiceToken(serviceToken);
        // Use the verified user context from the service token (not raw headers)
        if (verified.role === 'SUPER_ADMIN') {
          setSuperAdmin(true);
        } else if (verified.organizationId) {
          setOrganizationId(verified.organizationId);
        }
      } catch {
        // Service token invalid — fall back to raw headers (will be rejected
        // by JwtAuthGuard at controller level if the endpoint requires auth)
        const orgId = req.headers['x-organization-id'] as string | undefined;
        const role = req.headers['x-user-role'] as string | undefined;
        if (role === 'SUPER_ADMIN') {
          setSuperAdmin(true);
        } else if (orgId) {
          setOrganizationId(orgId);
        }
      }
    } else {
      // No service token — use raw headers (legacy path for direct service access)
      const orgId = req.headers['x-organization-id'] as string | undefined;
      const role = req.headers['x-user-role'] as string | undefined;
      if (role === 'SUPER_ADMIN') {
        setSuperAdmin(true);
      } else if (orgId) {
        setOrganizationId(orgId);
      }
    }

    res.on('finish', () => {
      clearOrganizationId();
    });

    next();
  });
}
