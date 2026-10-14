import { runWithRlsContext, setOrganizationId, setSuperAdmin, clearOrganizationId } from './rls';
import { verifyServiceToken, verifyAccessToken, extractBearerToken } from '../auth';

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
 * Middleware that establishes the PostgreSQL RLS context for the request.
 *
 * The organization and role come ONLY from a verified credential:
 *   1. the gateway-signed `x-service-token` (proves the request was routed
 *      after JWT verification), or
 *   2. the bearer access token itself.
 *
 * Raw `x-organization-id` / `x-user-role` headers are deliberately NOT
 * trusted — they are spoofable by any client that can reach the service, and
 * trusting them would let one organization's caller set another's tenant
 * context. If neither credential is present the request runs without an org
 * context (JwtAuthGuard remains the authoritative gate at the controller).
 *
 * Uses AsyncLocalStorage so each concurrent request gets its own
 * isolated org context — no cross-request contamination.
 *
 * - Regular users: scoped to their organization via RLS
 * - Super admins: bypass RLS, see all organizations
 *
 * Usage (Express):
 *   import { rlsMiddleware } from './index';
 *   app.use(rlsMiddleware);
 */
export function rlsMiddleware(req: RlsRequest, res: RlsResponse, next: () => void) {
  runWithRlsContext(() => {
    const serviceToken = req.headers['x-service-token'] as string | undefined;
    const bearer = extractBearerToken(req.headers.authorization as string | undefined);
    let applied = false;

    const apply = (orgId: string | null, role: string | undefined) => {
      if (role === 'SUPER_ADMIN') {
        setSuperAdmin(true);
      } else if (orgId) {
        setOrganizationId(orgId);
      }
    };

    if (serviceToken) {
      // Verify the service token to prevent header spoofing.
      try {
        const verified = verifyServiceToken(serviceToken);
        apply(verified.organizationId, verified.role);
        applied = true;
      } catch {
        // Service token invalid — do NOT fall back to raw headers (they are
        // spoofable); try the bearer token instead.
      }
    }

    if (!applied && bearer) {
      try {
        const verified = verifyAccessToken(bearer);
        apply(verified.organizationId, verified.role);
        applied = true;
      } catch {
        // Invalid bearer token — leave org context unset; JwtAuthGuard
        // rejects unauthenticated requests at the controller level.
      }
    }

    if (!applied) {
      console.warn(
        '[RLS] No verified identity for this request; running without org context',
      );
    }

    res.on('finish', () => {
      clearOrganizationId();
    });

    next();
  });
}
