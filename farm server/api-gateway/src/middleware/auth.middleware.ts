import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, signServiceToken, type VerifiedUser } from '@farm/auth-server';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  private readonly publicPaths = new Set([
    '/auth/login',
    '/auth/register',
    '/auth/register-console',
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
    const cleanPath = url.split('?')[0];

    // Check if this is a public path
    const isPublic = this.publicPaths.has(cleanPath) ||
      cleanPath.startsWith('/auth/') ||
      cleanPath.startsWith('/docs') ||
      cleanPath.startsWith('/health');

    // Extract token from cookie or Authorization header
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

        // Sign a service token for downstream services
        try {
          const serviceToken = signServiceToken(verifiedUser);
          (req as any).serviceToken = serviceToken;
        } catch (err: any) {
          this.logger.error(`Failed to sign service token: ${err.message}`);
        }

        this.logger.debug(`[Auth] ${req.method} ${cleanPath} - user=${verifiedUser.id} role=${verifiedUser.role}`);
      } catch (err: any) {
        this.logger.debug(`[Auth] Token verification failed for ${cleanPath}: ${err.message}`);
        // For public paths, continue without auth
        if (!isPublic) {
          // Will be rejected by downstream service's JwtAuthGuard
        }
      }
    } else if (!isPublic) {
      this.logger.debug(`[Auth] No token for protected path: ${cleanPath}`);
      // Continue — downstream service's JwtAuthGuard will reject
    }

    next();
  }
}
