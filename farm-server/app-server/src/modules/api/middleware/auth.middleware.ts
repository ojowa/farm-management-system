import { Injectable, NestMiddleware, Logger, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, verifyServiceToken, signServiceToken } from '@farm/auth-server';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  private readonly publicPaths = new Set([
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/verify-mfa',
    '/auth/otp/send',
    '/auth/otp/verify',
    '/auth/password/forgot',
    '/auth/password/reset',
    '/auth/biometric/login',
    '/health',
    '/health/ready',
    '/health/live',
    '/docs',
  ]);

  use(req: Request, _res: Response, next: NextFunction) {
    const url = (req as any).originalUrl || req.url;
    // Strip the global prefix (/v1) so public-path checks below match the
    // logical path (e.g. /v1/auth/login -> /auth/login).
    const cleanPath = url.split('?')[0].replace(/^\/v1(?=\/|$)/, '');

    const isPublic = this.publicPaths.has(cleanPath) ||
      cleanPath.startsWith('/docs') ||
      cleanPath.startsWith('/health');

    // Internal service-to-service relay (notification service -> gateway
    // socket broadcast). No user JWT exists for these calls: they are
    // authenticated by the SERVICE_SECRET-signed x-service-token alone, and
    // only for this single path — every other route still requires a user
    // token below.
    if (cleanPath === '/realtime/emit-internal') {
      const serviceToken = req.headers['x-service-token'];
      if (typeof serviceToken === 'string' && serviceToken) {
        try {
          verifyServiceToken(serviceToken);
        } catch (err: any) {
          this.logger.debug(`[Auth] Internal relay rejected: ${err.message}`);
          throw new UnauthorizedException('Invalid service token');
        }
        next();
        return;
      }
    }

    let token: string | null = null;

    if ((req as any).cookies?.accessToken) {
      token = (req as any).cookies.accessToken;
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const parts = String(authHeader).split(' ');
        if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
          token = parts[1];
        }
      }
    }

    if (token) {
      try {
        const verifiedUser = verifyAccessToken(token);
        (req as any).verifiedUser = verifiedUser;

        try {
          const serviceToken = signServiceToken(verifiedUser);
          (req as any).serviceToken = serviceToken;
        } catch (err: any) {
          this.logger.error(`Failed to sign service token: ${err.message}`);
        }
      } catch (err: any) {
        this.logger.debug(`[Auth] Token verification failed for ${cleanPath}: ${err.message}`);
        if (!isPublic) {
          throw new UnauthorizedException('Invalid or expired token');
        }
      }
    } else if (!isPublic) {
      throw new UnauthorizedException('Authentication required');
    }

    next();
  }
}
