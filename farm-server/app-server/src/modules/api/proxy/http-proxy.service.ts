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
      routes: ['farms', 'fields'],
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
      routes: ['poultry', 'medications'],
    },
    {
      name: 'finance',
      baseUrl: process.env.FINANCE_SERVICE_URL || 'http://localhost:4014',
      routes: ['finance', 'expenses', 'sales', 'contracts', 'marketplace', 'profitability'],
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
  ): Promise<any> {
    const service = this.findService(path);
    if (!service) {
      throw new ServiceUnavailableException(`No service found for path: ${path}`);
    }

    const targetUrl = `${service.baseUrl}/${path}`;
    const headers: Record<string, string> = {
      'Content-Type': (req.headers['content-type'] as string) || 'application/json',
      'x-user-id': verifiedUser?.id || '',
      'x-user-role': verifiedUser?.role || '',
      'x-organization-id': verifiedUser?.organizationId || '',
      'x-user-email': verifiedUser?.email || '',
      'x-request-id': (req as any).requestId || '',
      'x-platform': (req.headers['x-platform'] as string) || '',
      'x-device-id': (req.headers['x-device-id'] as string) || '',
    };

    if (serviceToken) {
      headers['x-service-token'] = serviceToken;
    }

    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    try {
      const response = await axios({
        method: req.method as any,
        url: targetUrl,
        data: req.body,
        params: req.query,
        headers,
        timeout: Number(process.env.PROXY_TIMEOUT_MS) || 30000,
      });
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId || '',
      };
    } catch (error: any) {
      this.logger.error(`Proxy error for ${service.name}: ${error.message}`);
      if (error.response) {
        return {
          success: false,
          data: error.response.data,
          timestamp: new Date().toISOString(),
          requestId: (req as any).requestId || '',
        };
      }
      throw new ServiceUnavailableException(`Service ${service.name} is unavailable`);
    }
  }
}
