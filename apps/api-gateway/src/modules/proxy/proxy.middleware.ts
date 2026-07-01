import { Injectable, NestMiddleware } from '@nestjs/common';
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';
import { Request, Response, NextFunction } from 'express';
import { extractBearerToken, verifyAccessToken, AuthError } from '@farm/auth';

const PUBLIC_PREFIXES = ['/auth', '/health'];

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  private proxies: Record<string, string> = {
    '/crops': `http://localhost:${process.env.CROP_SERVICE_PORT || 4011}`,
    '/farms': `http://localhost:${process.env.FARM_SERVICE_PORT || 4002}`,
    '/livestocks': `http://localhost:${process.env.LIVESTOCK_SERVICE_PORT || 4003}`,
    '/poultry': `http://localhost:${process.env.POULTRY_SERVICE_PORT || 4004}`,
    '/notifications': `http://localhost:${process.env.NOTIFICATION_SERVICE_PORT || 4005}`,
    '/finance': `http://localhost:${process.env.FINANCE_SERVICE_PORT || 4006}`,
    '/workers': `http://localhost:${process.env.WORKER_SERVICE_PORT || 4007}`,
    '/tasks': `http://localhost:${process.env.WORKER_SERVICE_PORT || 4007}`,
    '/leave': `http://localhost:${process.env.HR_SERVICE_PORT || 4012}`,
    '/shifts': `http://localhost:${process.env.HR_SERVICE_PORT || 4012}`,
    '/shift-assignments': `http://localhost:${process.env.HR_SERVICE_PORT || 4012}`,
    '/messages': `http://localhost:${process.env.HR_SERVICE_PORT || 4012}`,
    '/correspondence': `http://localhost:${process.env.HR_SERVICE_PORT || 4012}`,
    '/reporting': `http://localhost:${process.env.REPORTING_SERVICE_PORT || 4008}`,
    '/organizations': `http://localhost:${process.env.ORGANIZATION_SERVICE_PORT || 4009}`,
    '/inventory': `http://localhost:${process.env.INVENTORY_SERVICE_PORT || 4010}`,
    '/medications': `http://localhost:${process.env.POULTRY_SERVICE_PORT || 4004}`,
    '/roles': `http://localhost:${process.env.AUTH_SERVICE_PORT || 4001}`,
    '/permissions': `http://localhost:${process.env.AUTH_SERVICE_PORT || 4001}`,
    '/admin': `http://localhost:${process.env.AUTH_SERVICE_PORT || 4001}`,
    '/org-admin': `http://localhost:${process.env.AUTH_SERVICE_PORT || 4001}`,
  };

  private proxyHandlers: Record<string, RequestHandler> = {};

  constructor() {
    for (const [routePath, target] of Object.entries(this.proxies)) {
      this.proxyHandlers[routePath] = createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: (url) => url.replace(new RegExp(`^${routePath}`), ''),
      });
    }
  }

  use(req: Request, res: Response, next: NextFunction) {
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

      delete req.headers['x-user-id'];
      delete req.headers['x-user-role'];
      delete req.headers['x-organization-id'];
      delete req.headers['x-user-email'];

      req.headers['x-user-id'] = user.id;
      req.headers['x-user-role'] = user.role;
      // SUPER_ADMIN can override org via x-selected-organization header
      if (user.role === 'SUPER_ADMIN' && req.headers['x-selected-organization']) {
        req.headers['x-organization-id'] = req.headers['x-selected-organization'];
      } else {
        req.headers['x-organization-id'] = user.organizationId;
      }
      if (user.email) {
        req.headers['x-user-email'] = user.email;
      }
    } catch (err) {
      const status = err instanceof AuthError ? err.statusCode : 401;
      return res
        .status(status)
        .json({ statusCode: status, message: 'Invalid or expired token' });
    }

    const routePath = Object.keys(this.proxyHandlers).find((p) => path.startsWith(p));
    if (routePath) {
      return this.proxyHandlers[routePath](req, res, next);
    }
    next();
  }
}
