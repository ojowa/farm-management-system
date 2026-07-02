import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const getJWTSecret = (): string => process.env.JWT_SECRET || 'secret';

export interface PlatformAdmin {
  id: string;
  email: string | null;
  role: string;
  organizationId: string;
  isPlatformAdmin: boolean;
}

/**
 * Middleware that verifies platform admin access.
 * Only SUPER_ADMIN and SUPPORT_ADMIN roles are allowed.
 */
export const platformAdminGuard = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ statusCode: 401, message: 'Authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, getJWTSecret()) as any;

    if (!decoded?.sub || !decoded?.role) {
      res.status(401).json({ statusCode: 401, message: 'Invalid token payload' });
      return;
    }

    // Only SUPER_ADMIN and SUPPORT_ADMIN can access platform console
    if (!['SUPER_ADMIN', 'SUPPORT_ADMIN'].includes(decoded.role)) {
      res.status(403).json({ statusCode: 403, message: 'Platform admin access required' });
      return;
    }

    (req as any).user = {
      id: decoded.sub,
      email: decoded.email ?? null,
      role: decoded.role,
      organizationId: decoded.organizationId,
      isPlatformAdmin: true,
    };

    next();
  } catch (err) {
    res.status(401).json({ statusCode: 401, message: 'Invalid or expired token' });
  }
};

/**
 * Middleware that requires full SUPER_ADMIN access (not just SUPPORT_ADMIN).
 */
export const superAdminGuard = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  platformAdminGuard(req, res, () => {
    const user = (req as any).user as PlatformAdmin;
    if (user.role !== 'SUPER_ADMIN') {
      res.status(403).json({ statusCode: 403, message: 'Super admin access required' });
      return;
    }
    next();
  });
};
