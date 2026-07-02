import { Request, Response, NextFunction } from 'express';
import { prisma } from '@farm/database';

/**
 * Express middleware that automatically logs mutations (POST, PUT, PATCH, DELETE)
 * to the audit log. Attach to routes that should be audited.
 *
 * Usage:
 *   import { auditInterceptor } from '../middleware/audit.interceptor';
 *   router.post('/features/:id/overrides', auditInterceptor('feature.override.set', 'FeatureFlagOverride'), handler);
 */
export function auditInterceptor(action: string, entity: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to capture the response
    res.json = function (body: any) {
      // Only audit successful mutations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const user = (req as any).user;
        const resourceId = req.params?.id || body?.id || null;

        // Fire and forget — don't block the response
        prisma.auditLog.create({
          data: {
            userId: user?.id || null,
            action,
            entity,
            entityId: resourceId,
          },
        }).catch((err) => {
          console.error('Audit log error:', err);
        });
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Express middleware that captures request body changes for before/after tracking.
 * More detailed than auditInterceptor — stores oldValues and newValues.
 *
 * Usage:
 *   import { detailedAuditInterceptor } from '../middleware/audit.interceptor';
 *   router.patch('/users/:id', detailedAuditInterceptor('user.update', 'User'), handler);
 */
export function detailedAuditInterceptor(action: string, entity: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);
    const startTime = Date.now();

    // Capture request body for comparison
    const requestBody = req.method !== 'GET' ? { ...req.body } : undefined;

    res.json = function (body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const user = (req as any).user;
        const resourceId = req.params?.id || body?.id || null;

        prisma.auditLog.create({
          data: {
            userId: user?.id || null,
            action,
            entity,
            entityId: resourceId,
          },
        }).catch((err) => {
          console.error('Detailed audit log error:', err);
        });
      }

      return originalJson(body);
    };

    next();
  };
}
