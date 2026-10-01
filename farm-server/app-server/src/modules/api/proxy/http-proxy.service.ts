import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { Request, Response } from 'express';
import { signServiceToken, type VerifiedUser } from '@farm/auth-server';
import { ServiceRoute } from './routes';

export interface ServiceConfig {
  name: string;
  baseUrl: string;
  routes: string[];
}

export interface ProxyResult {
  /** HTTP status returned by the downstream service. */
  status: number;
  /** Response envelope handed back to the client. */
  body: any;
  /** `Set-Cookie` headers emitted by the downstream service, if any. */
  setCookie?: string[];
}

@Injectable()
export class GatewayProxyService {
  private readonly logger = new Logger(GatewayProxyService.name);

  private readonly services: ServiceConfig[] = [
    {
      name: 'auth',
      baseUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:4010',
      routes: ['auth', 'roles', 'permissions', 'admin', 'org-admin', 'api-keys', 'platform-roles', 'platform-permissions', 'platform-api-keys'],
    },
    {
      name: 'farm',
      baseUrl: process.env.FARM_SERVICE_URL || 'http://localhost:4011',
      routes: ['farms', 'fields', 'documents', 'inventory', 'equipment'],
    },
    {
      name: 'crop',
      baseUrl: process.env.CROP_SERVICE_URL || 'http://localhost:4020',
      routes: ['crops', 'crop-cycles', 'lifecycle', 'irrigation', 'pest-disease', 'yield'],
    },
    {
      name: 'livestock',
      baseUrl: process.env.LIVESTOCK_SERVICE_URL || 'http://localhost:4012',
      routes: ['livestock', 'health', 'breeding', 'weight'],
    },
    {
      name: 'poultry',
      baseUrl: process.env.POULTRY_SERVICE_URL || 'http://localhost:4013',
      routes: ['poultry', 'pens', 'breeds', 'flocks', 'poultry-houses', 'feeding-records', 'vaccination-records', 'mortality-records', 'medications', 'egg-production', 'poultry-sales'],
    },
    {
      name: 'finance',
      baseUrl: process.env.FINANCE_SERVICE_URL || 'http://localhost:4014',
      routes: ['finance', 'expenses', 'sales', 'contracts', 'marketplace', 'profitability', 'budgets'],
    },
    {
      name: 'hr',
      baseUrl: process.env.HR_SERVICE_URL || 'http://localhost:4015',
      routes: ['workers', 'tasks', 'attendance', 'leave', 'shifts', 'shift-assignments', 'messages', 'correspondence'],
    },
    {
      name: 'notification',
      baseUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4016',
      routes: ['notifications', 'devices'],
    },
    {
      name: 'organization',
      baseUrl: process.env.ORGANIZATION_SERVICE_URL || 'http://localhost:4017',
      routes: ['organizations'],
    },
    {
      name: 'platform',
      baseUrl: process.env.PLATFORM_SERVICE_URL || 'http://localhost:4018',
      routes: ['platform-features', 'platform-subscriptions', 'platform-organizations', 'platform-options', 'platform-health', 'platform-broadcasts', 'platform-audit', 'platform-config', 'platform-users'],
    },
    {
      name: 'reporting',
      baseUrl: process.env.REPORTING_SERVICE_URL || 'http://localhost:4019',
      routes: ['reports', 'schedule'],
    },
  ];

  findService(path: string): ServiceConfig | undefined {
    const segment = path.split('/').filter(Boolean)[0];
    return this.services.find((s) => s.routes.includes(segment));
  }

  findServiceByRoute(route: ServiceRoute): ServiceConfig | undefined {
    return this.services.find((s) => s.name === route.service.replace('-service', ''));
  }

  async proxyRequest(
    req: Request,
    res: Response,
    path: string,
    verifiedUser: VerifiedUser | null,
    serviceToken: string | null,
  ): Promise<ProxyResult> {
    const service = this.findService(path);
    if (!service) {
      throw new ServiceUnavailableException(`No service found for path: ${path}`);
    }

    const targetUrl = `${service.baseUrl}/${path}`;
    const contentType = String(req.headers['content-type'] || '');
    const isMultipart = contentType.toLowerCase().startsWith('multipart/form-data');
    const headers: Record<string, string> = {
      'Content-Type': contentType || 'application/json',
      'x-user-id': verifiedUser?.id || '',
      'x-user-role': verifiedUser?.role || '',
      'x-organization-id': verifiedUser?.organizationId || '',
      'x-user-email': verifiedUser?.email || '',
      'x-request-id': (req as any).requestId || '',
      'x-platform': (req.headers['x-platform'] as string) || '',
      'x-device-id': (req.headers['x-device-id'] as string) || '',
      // Propagate the real client IP so downstream rate limiting and audit
      // logs key on the end user, not the gateway's localhost address.
      'x-forwarded-for': String(req.ip || ''),
    };

    if (serviceToken) {
      headers['x-service-token'] = serviceToken;
    }

    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    // Cookie-based auth: the browser only ever talks to the gateway, so the
    // cookie jar has to be relayed downstream (services read
    // `req.cookies.accessToken` in JwtAuthGuard) and `Set-Cookie` has to be
    // relayed back so token rotation reaches the browser.
    if (req.headers.cookie) {
      headers['cookie'] = req.headers.cookie;
    }

    try {
      const response = await axios({
        method: req.method as any,
        url: targetUrl,
        // Multipart payloads are buffered by RawBodyMiddleware; everything
        // else was parsed by Express' JSON/urlencoded parsers.
        data: isMultipart ? ((req as any).rawBody ?? Buffer.alloc(0)) : req.body,
        params: req.query,
        headers,
        timeout: Number(process.env.PROXY_TIMEOUT_MS) || 30000,
        // A downstream 4xx/5xx is data we want to inspect and forward, not a
        // transport failure.
        validateStatus: () => true,
      });

      const setCookie = readSetCookie(response.headers);
      const ok = response.status >= 200 && response.status < 300;

      return {
        status: response.status,
        body: {
          success: ok,
          data: response.data,
          timestamp: new Date().toISOString(),
          requestId: (req as any).requestId || '',
        },
        setCookie,
      };
    } catch (error: any) {
      this.logger.error(`Proxy error for ${service.name}: ${error.message}`);
      if (error.response) {
        return {
          status: error.response.status,
          body: {
            success: false,
            data: error.response.data,
            timestamp: new Date().toISOString(),
            requestId: (req as any).requestId || '',
          },
          setCookie: readSetCookie(error.response.headers),
        };
      }
      throw new ServiceUnavailableException(`Service ${service.name} is unavailable`);
    }
  }
}

function readSetCookie(headers: any): string[] | undefined {
  const raw = headers?.['set-cookie'] ?? headers?.['Set-Cookie'];
  if (!raw) return undefined;
  const list = Array.isArray(raw) ? raw : [raw];
  return list.length ? list : undefined;
}
