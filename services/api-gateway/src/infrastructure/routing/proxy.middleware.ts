import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { lastValueFrom } from 'rxjs';
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

  constructor(
    private readonly routingService: RoutingService,
    private readonly httpService: HttpService,
  ) {
    this.logger.log('ProxyMiddleware initialized');
  }

  use(req: any, res: any, next: () => void) {
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

    const route = this.routingService.findRoute(path);
    if (!route) {
      return next();
    }

    this.forwardRequest(req, res, route, token).catch((error) => {
      this.logger.error(`Proxy error: ${error.message}`);
      if (!res.headersSent) {
        res.status(502).json({
          statusCode: 502,
          message: 'Service unavailable',
        });
      }
    });
  }

  private async forwardRequest(
    req: any,
    res: any,
    route: ServiceRoute,
    token: string | null,
  ): Promise<void> {
    const targetUrl = this.buildTargetUrl(req, route);
    const serviceName = route.service;

    const headers: Record<string, string> = {
      'content-type': req.headers['content-type'] || 'application/json',
    };

    if (req.headers['x-user-id']) headers['x-user-id'] = req.headers['x-user-id'] as string;
    if (req.headers['x-user-role']) headers['x-user-role'] = req.headers['x-user-role'] as string;
    if (req.headers['x-organization-id']) headers['x-organization-id'] = req.headers['x-organization-id'] as string;
    if (req.headers['x-user-email']) headers['x-user-email'] = req.headers['x-user-email'] as string;
    if (token) headers['authorization'] = `Bearer ${token}`;

    this.logger.debug(`${req.method} ${req.url} -> ${serviceName} (${targetUrl})`);

    const response: AxiosResponse = await lastValueFrom(
      this.httpService.request({
        method: req.method,
        url: targetUrl,
        headers,
        data: req.body,
        validateStatus: () => true,
      }),
    );

    const skipHeaders = ['transfer-encoding', 'content-encoding', 'content-length'];
    for (const [key, value] of Object.entries(response.headers)) {
      if (!skipHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, value as string | string[]);
      }
    }

    res.status(response.status).json(response.data);
  }

  private buildTargetUrl(req: any, route: ServiceRoute): string {
    const target = new URL(route.target);
    const path = req.url.split('?')[0];
    const queryString = req.url.includes('?') ? `?${req.url.split('?')[1]}` : '';

    if (route.rewrite !== false) {
      const rewrittenPath = this.routingService.rewritePath(path);
      return `${target.origin}${rewrittenPath}${queryString}`;
    }

    return `${target.origin}${path}${queryString}`;
  }
}
