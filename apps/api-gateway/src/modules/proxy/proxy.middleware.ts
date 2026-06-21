import { Injectable, NestMiddleware } from '@nestjs/common';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { Request, Response, NextFunction } from 'express';

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
  };

  use(req: Request, res: Response, next: NextFunction) {
    const routePath = Object.keys(this.proxies).find((p) => req.url.startsWith(p));
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
