import { Injectable, NestMiddleware } from '@nestjs/common';
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
};
const jwtVerify = (jwt as any).verify as (token: string, secret: string) => any;

/** Paths that do NOT require authentication */
const PUBLIC_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/verify-mfa',
  '/health',
  '/docs',
]);

/** Check if a path starts with any public prefix */
function isPublicPath(path: string): boolean {
  if (path === '/auth/login' || path.startsWith('/auth/login?')) return true;
  if (path === '/auth/register' || path.startsWith('/auth/register?')) return true;
  if (path === '/auth/refresh' || path.startsWith('/auth/refresh?')) return true;
  if (path === '/auth/verify-mfa' || path.startsWith('/auth/verify-mfa?')) return true;
  if (path === '/health') return true;
  if (path.startsWith('/docs')) return true;
  return false;
}

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  private proxies: Record<string, string> = {
    '/crops': `http://localhost:${process.env.CROP_SERVICE_PORT || 4011}`,
    '/farms': `http://localhost:${process.env.FARM_SERVICE_PORT || 4002}`,
    '/livestocks': `http://localhost:${process.env.LIVESTOCK_SERVICE_PORT || 4003}`,
    '/livestock': `http://localhost:${process.env.LIVESTOCK_SERVICE_PORT || 4006}`,
    '/poultry': `http://localhost:${process.env.POULTRY_SERVICE_PORT || 4004}`,
    '/notifications': `http://localhost:${process.env.NOTIFICATION_SERVICE_PORT || 4005}`,
    '/finance': `http://localhost:${process.env.FINANCE_SERVICE_PORT || 4006}`,
    '/workers': `http://localhost:${process.env.WORKER_SERVICE_PORT || 4007}`,
    '/tasks': `http://localhost:${process.env.HR_SERVICE_PORT || 4012}`,
    '/attendance': `http://localhost:${process.env.HR_SERVICE_PORT || 4012}`,
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
    '/api-keys': `http://localhost:${process.env.AUTH_SERVICE_PORT || 4001}`,
    '/weather': `http://localhost:${process.env.PLATFORM_SERVICE_PORT || 4020}`,
    '/documents': `http://localhost:${process.env.PLATFORM_SERVICE_PORT || 4020}`,
  };

  private noPathRewrite = new Set(['/weather', '/documents']);

  private proxyHandlers: Record<string, RequestHandler> = {};

  constructor() {
    for (const [routePath, target] of Object.entries(this.proxies)) {
      this.proxyHandlers[routePath] = createProxyMiddleware({
        target,
        changeOrigin: true,
        ...(this.noPathRewrite.has(routePath)
          ? {}
          : {
              pathRewrite: (url) =>
                url.replace(new RegExp(`^${routePath}`), ''),
            }),
      });
    }
  }

  use(req: Request, res: Response, next: NextFunction) {
    if (req.method === 'OPTIONS') {
      return next();
    }

    const path = req.url.split('?')[0];

    // ── JWT Extraction ───────────────────────────────────
    // Try cookie first, then Authorization header
    let token: string | null = null;

    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const parts = authHeader.split(' ');
        if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
          token = parts[1];
        }
      }
    }

    // ── Verify JWT and inject user context ───────────────
    if (token) {
      try {
        const decoded = jwtVerify(token, JWT_SECRET());
        if (decoded && decoded.sub) {
          req.headers['x-user-id'] = decoded.sub;
          req.headers['x-user-role'] = decoded.role || '';
          req.headers['x-organization-id'] = decoded.organizationId || '';
          req.headers['x-user-email'] = decoded.email || '';
        }
      } catch {
        // Token invalid/expired — clear cookies if present
        if (req.cookies?.accessToken) {
          res.clearCookie('accessToken', { path: '/' });
        }
        if (req.cookies?.refreshToken) {
          // Don't clear refresh token — it may be valid for renewal
        }
      }
    }

    // ── Auth check for non-public paths ──────────────────
    if (!isPublicPath(path)) {
      if (!req.headers['x-user-id']) {
        // No valid token — reject
        res.status(401).json({
          statusCode: 401,
          message: 'Authentication required',
        });
        return;
      }
    }

    // ── Route to proxy ───────────────────────────────────
    const routePath = Object.keys(this.proxyHandlers).find((p) =>
      path.startsWith(p)
    );
    if (routePath) {
      return this.proxyHandlers[routePath](req, res, next);
    }

    next();
  }
}
