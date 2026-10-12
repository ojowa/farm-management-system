import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { runWithRlsContext, setOrganizationId, setSuperAdmin, clearOrganizationId } from '../../../kernel/database';

/**
 * Establish the PostgreSQL RLS context for the request.
 *
 * In the old microservice topology the API gateway signed an
 * `x-service-token` header and each service's `rlsMiddleware` verified it to
 * learn the caller's organization. In the modular monolith the verified JWT
 * is already on the request (set by AuthMiddleware), so we derive the RLS
 * context directly from `req.verifiedUser` — no header round-trip, no
 * spoofable input.
 *
 * Runs inside AsyncLocalStorage, so each concurrent request gets an isolated
 * org context. Must be registered AFTER AuthMiddleware.
 */
@Injectable()
export class RlsContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RlsContextMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    runWithRlsContext(() => {
      const user = (req as any).verifiedUser;
      try {
        if (user) {
          if (user.role === 'SUPER_ADMIN') {
            setSuperAdmin(true);
          } else if (user.organizationId) {
            setOrganizationId(user.organizationId);
          }
        }
      } catch (err: any) {
        // Never fail the request because RLS context could not be set;
        // Prisma queries will run without org scoping and the controller's
        // JwtAuthGuard remains the authoritative gate.
        this.logger.warn(`Failed to set RLS context: ${err.message}`);
      }

      res.on('finish', () => {
        clearOrganizationId();
      });

      next();
    });
  }
}