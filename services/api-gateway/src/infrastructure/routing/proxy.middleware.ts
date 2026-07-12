import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ServiceRoute } from '../../domain/routes';
import { RoutingService } from '../../application/services/routing.service';

const JWT_SECRET = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
};
const jwtVerify = (jwt as any).verify as (token: string, secret: string) => any;

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ProxyMiddleware.name);
  private proxyHandlers: Record<string, RequestHandler> = {};

  constructor(private readonly routingService: RoutingService) {
    this.initProxies();
  }

  private initProxies() {
    const routes = this.routingService.getAllRoutes();
    const groupedByTarget = new Map<string, ServiceRoute[]>();

    for (const route of routes) {
      const existing = groupedByTarget.get(route.target) || [];
      existing.push(route);
      groupedByTarget.set(route.target, existing);
    }

    for (const [target, targetRoutes] of groupedByTarget) {
      const pathFilter = (path: string) => {
        return targetRoutes.some(r => path === r.path || path.startsWith(r.path + '/'));
      };

      const mainRoute = targetRoutes[0];
      const handler = createProxyMiddleware({
        target,
        changeOrigin: true,
        pathFilter,
        pathRewrite: mainRoute.rewrite !== false
          ? (url) => {
              for (const route of targetRoutes) {
                if (url === route.path || url.startsWith(route.path + '/')) {
                  return url.replace(new RegExp(`^${route.path}`), '') || '/';
                }
              }
              return url;
            }
          : undefined,
        on: {
          proxyReq: (proxyReq: any, req: any, _res: any) => {
            if (req.body) {
              const contentType = req.headers['content-type'];
              if (contentType && contentType.includes('application/json')) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
              } else if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
                const bodyData = new URLSearchParams(req.body).toString();
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
              }
            }
          },
          proxyRes: (proxyRes: any, req: any) => {
            const service = this.routingService.getServiceName(req.url.split('?')[0]);
            this.logger.debug(`${req.method} ${req.url} -> ${service} (${proxyRes.statusCode})`);
          },
        },
      });

      for (const route of targetRoutes) {
        this.proxyHandlers[route.path] = handler;
      }
    }
  }

  use(req: Request, res: Response, next: NextFunction) {
    if (req.method === 'OPTIONS') {
      return next();
    }

    const path = req.url.split('?')[0];

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
        if (req.cookies?.accessToken) {
          res.clearCookie('accessToken', { path: '/' });
        }
      }
    }

    if (!this.routingService.isPublicPath(path)) {
      if (!req.headers['x-user-id']) {
        res.status(401).json({
          statusCode: 401,
          message: 'Authentication required',
        });
        return;
      }
    }

    for (const [routePath, handler] of Object.entries(this.proxyHandlers)) {
      if (path === routePath || path.startsWith(routePath + '/')) {
        return handler(req, res, next);
      }
    }

    next();
  }
}
