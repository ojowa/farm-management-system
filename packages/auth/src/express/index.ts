import type { Request, Response, NextFunction } from 'express';
import {
  AuthError,
  extractBearerToken,
  verifyAccessToken,
  type VerifiedUser,
} from '../jwt';
import { userHasPermission, userHasAnyRole } from '../roles';

export interface AuthenticatedRequest extends Request {
  user: VerifiedUser;
}

export interface RequireAuthOptions {
  /** Required roles. If omitted, only a valid token is required. */
  roles?: readonly string[];
  /** Required permission (e.g. `farm.write`). If omitted, only a valid token is required. */
  permission?: string;
}

const sendAuthError = (res: Response, err: unknown): void => {
  const status = err instanceof AuthError ? err.statusCode : 401;
  const message = err instanceof Error ? err.message : 'Authentication failed';
  res.status(status).json({ statusCode: status, message });
};

/**
 * Express middleware that verifies the bearer token and optionally enforces
 * a role or permission. Place it on individual routes or whole routers via
 * `router.use(authMiddleware({ ... }))`.
 */
export const authMiddleware = (options: RequireAuthOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return sendAuthError(res, new AuthError(401, 'Authentication required'));
    }
    let user: VerifiedUser;
    try {
      user = verifyAccessToken(token);
    } catch (err) {
      return sendAuthError(res, new AuthError(401, 'Invalid or expired token'));
    }

    if (options.roles && options.roles.length > 0 && !userHasAnyRole(user.role, options.roles)) {
      return sendAuthError(res, new AuthError(403, 'Insufficient role'));
    }
    if (options.permission && !userHasPermission(user.permissions, options.permission)) {
      return sendAuthError(res, new AuthError(403, 'Insufficient permission'));
    }

    (req as Request & { user?: VerifiedUser }).user = user;
    return next();
  };
};

/**
 * Convenience: require an authenticated user, no role or permission checks.
 */
export const requireAuth = authMiddleware();

/**
 * Wrap async controller handlers so thrown errors propagate to the Express
 * error pipeline instead of crashing the process.
 */
export const asyncHandler =
  <T extends Request = Request>(
    fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
  ) =>
  (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
