import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { lastValueFrom } from 'rxjs';
import jwt from 'jsonwebtoken';
import { ServiceRoute } from '../../domain/routes';
import { RoutingService } from '../../application/services/routing.service';

const SERVICE_SECRET = (): string => {
  const secret = process.env.SERVICE_SECRET;
  if (!secret) throw new Error('SERVICE_SECRET environment variable is required');
  return secret;
};

const jwtVerify = (jwt as any).verify as (token: string, secret: string, opts?: { algorithms?: string[] }) => any;
const jwtSign = (jwt as any).sign as (payload: any, secret: string, opts?: any) => string;

interface VerifiedUser {
  id: string;
  email: string | null;
  role: string;
  permissions: string[];
  organizationId: string | null;
}

function verifyAccessToken(token: string): VerifiedUser {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  try {
    const decoded = jwtVerify(token, secret, { algorithms: ['HS256'] }) as any;
    if (!decoded || !decoded.sub || !decoded.role) throw new Error('Invalid token payload: missing sub or role');
    return {
      id: decoded.sub,
      email: decoded.email ?? null,
      role: decoded.role,
      permissions: decoded.permissions ?? [],
      organizationId: decoded.organizationId ?? null,
    };
  } catch (err: any) {
    const tokenPreview = token.substring(0, 20) + '...' + token.substring(token.length - 10);
    throw new Error(`Token verification failed: ${err.message} | Token preview: ${tokenPreview}`);
  }
}

function signServiceToken(user: VerifiedUser): string {
  return jwtSign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      organizationId: user.organizationId,
      type: 'service',
    },
    SERVICE_SECRET(),
    { expiresIn: '30s' },
  );
}

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ProxyMiddleware.name);

  constructor(
    private readonly routingService: RoutingService,
    private readonly httpService: HttpService,
  ) {
    this.logger.log('ProxyMiddleware initialized');
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      this.logger.error('[Auth] JWT_SECRET environment variable is NOT set!');
    } else {
      this.logger.log(`[Auth] JWT_SECRET loaded (length: ${jwtSecret.length})`);
    }
    const serviceSecret = process.env.SERVICE_SECRET;
    if (!serviceSecret) {
      this.logger.error('[Auth] SERVICE_SECRET environment variable is NOT set!');
    } else {
      this.logger.log(`[Auth] SERVICE_SECRET loaded (length: ${serviceSecret.length})`);
    }
  }

  private auditAuth(
    path: string,
    data: Record<string, unknown>,
  ): void {
    this.logger.log(`[AuthAudit] ${path} ${JSON.stringify({ t: new Date().toISOString(), ...data })}`);
  }

  use(req: any, res: any, next: () => void) {
    if (req.method === 'OPTIONS') return next();

    const path = req.url.split('?')[0];

    const route = this.routingService.findRoute(path);
    if (!route) return next();

    // If public, don't attempt token extraction/verification.
    if (this.routingService.isPublicPath(path)) {
      this.auditAuth(path, {
        decision: 'public',
        service: route.service,
        method: req.method,
      });
      return this.forwardRequest(req, res, route, null, null).catch((error) => {
        this.logger.error(`Proxy error: ${error.message}`);
        if (!res.headersSent) {
          res.status(502).json({
            statusCode: 502,
            message: 'Service unavailable',
          });
        }
      });
    }

    const cookieNames = Object.keys(req.cookies || {});
    let token: unknown = null;
    let tokenSource: 'cookie' | 'bearer' | 'none' = 'none';

    // Prefer accessToken cookie, else Authorization header.
    if (req.cookies?.accessToken !== undefined) {
      token = req.cookies.accessToken;
      tokenSource = 'cookie';
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const parts = String(authHeader).split(' ');
        if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
          token = parts[1];
          tokenSource = 'bearer';
        }
      }
    }

    let verifiedUser: VerifiedUser | null = null;

    if (typeof token === 'string' && token.length > 0) {
      try {
        verifiedUser = verifyAccessToken(token);
        req.headers['x-user-id'] = verifiedUser.id;
        req.headers['x-user-role'] = verifiedUser.role || '';
        req.headers['x-organization-id'] = verifiedUser.organizationId || '';
        req.headers['x-user-email'] = verifiedUser.email || '';
        this.auditAuth(path, {
          decision: 'allowed',
          tokenSource,
          userId: verifiedUser.id,
          role: verifiedUser.role,
          service: route.service,
          method: req.method,
        });
      } catch (err: any) {
        this.auditAuth(path, {
          decision: 'denied',
          reason: 'token_invalid',
          tokenSource,
          error: err.message,
          cookies: cookieNames,
        });
        if (req.cookies?.accessToken) {
          res.clearCookie('accessToken', { path: '/' });
        }
      }
    } else {
      this.auditAuth(path, {
        decision: 'denied',
        reason: 'no_token',
        tokenSource,
        cookies: cookieNames,
        hasAuthHeader: !!req.headers.authorization,
      });
    }

    if (!req.headers['x-user-id']) {
      this.logger.warn(`[Auth] 401 for ${path} - no x-user-id header`);
      res.status(401).json({
        statusCode: 401,
        message: 'Authentication required',
      });
      return;
    }

    let serviceToken: string | null = null;
    if (verifiedUser) {
      try {
        serviceToken = signServiceToken(verifiedUser);
      } catch (err: any) {
        this.logger.error(`Failed to sign service token: ${err.message}`);
      }
    }

    this.forwardRequest(req, res, route, typeof token === 'string' ? token : null, serviceToken).catch((error) => {
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
    serviceToken: string | null,
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
    if (serviceToken) headers['x-service-token'] = serviceToken;

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

    if (response.status >= 400) {
      this.logger.warn(`[Proxy] ${req.method} ${req.url} -> ${serviceName}: ${response.status}`, response.data);
    }

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

