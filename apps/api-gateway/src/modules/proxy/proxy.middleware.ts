import { Injectable, NestMiddleware } from '@nestjs/common';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { Request, Response, NextFunction } from 'express';
import { extractBearerToken, verifyAccessToken, AuthError } from '@farm/auth';

/**
 * Routes that the API gateway serves directly (authentication, health,
 * docs) without forwarding to a downstream service. Everything else is
 * proxied after the bearer token has been verified, so unauthenticated
 * traffic never reaches farm/crop/finance/etc.
 */
const PUBLIC_PREFIXES = ['/auth', '/health'];

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  private proxies: Record<string, string> = {
    '/crops': `http://localhost:${process.env.CROP_SERVICE_PORT || 3001}`,
    '/farms': `http://localhost:${process.env.FARM_SERVICE_PORT || 3003}`,
    '/livestocks': `http://localhost:${process.env.LIVESTOCK_SERVICE_PORT || 3004}`,
    '/poultry': `http://localhost:${process.env.POULTRY_SERVICE_PORT || 3005}`,
    '/notifications': `http://localhost:${process.env.NOTIFICATION_SERVICE_PORT || 3006}`,
    '/finance': `http://localhost:${process.env.FINANCE_SERVICE_PORT || 3007}`,
    '/workers': `http://localhost:${process.env.WORKER_SERVICE_PORT || 3008}`,
    '/reporting': `http://localhost:${process.env.REPORTING_SERVICE_PORT || 3009}`,
    '/organizations': `http://localhost:${process.env.ORGANIZATION_SERVICE_PORT || 3010}`,
    '/inventory': `http://localhost:${process.env.INVENTORY_SERVICE_PORT || 3011}`,
  };

  use(req: Request, res: Response, next: NextFunction) {
    // Allow CORS preflight to pass through even on protected routes.
    if (req.method === 'OPTIONS') {
      return next();
    }

    const path = req.url.split('?')[0];
    const isPublic = PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
    if (isPublic) {
      return next();
    }

    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ statusCode: 401, message: 'Authentication required' });
    }
    try {
      const user = verifyAccessToken(token);

      // Prevent client header spoofing. Only overwrite these headers with
      // values from the validated JWT.
      delete req.headers['x-user-id'];
      delete req.headers['x-user-role'];
      delete req.headers['x-organization-id'];
      delete req.headers['x-user-email'];

      // Forward the verified user info as headers so downstream services can
      // trust the principal without re-verifying the signature.
      req.headers['x-user-id'] = user.id;
      req.headers['x-user-role'] = user.role;
      req.headers['x-organization-id'] = user.organizationId;
      if (user.email) {
        req.headers['x-user-email'] = user.email;
      }
    } catch (err) {
      const status = err instanceof AuthError ? err.statusCode : 401;
      return res
        .status(status)
        .json({ statusCode: status, message: 'Invalid or expired token' });
    }


    const routePath = Object.keys(this.proxies).find((p) => path.startsWith(p));
    if (routePath) {
      const target = this.proxies[routePath];
      const proxy = createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: (url) => url.replace(new RegExp(`^${routePath}`), ''),
      });
      return proxy(req, res, next);
    }
    next();
  }
}
