import { Injectable } from '@nestjs/common';
import { prisma } from '@farm/database';

const SERVICES = [
  { name: 'auth-service', url: 'http://localhost:4001/health', port: 4001 },
  { name: 'farm-service', url: 'http://localhost:4002/health', port: 4002 },
  { name: 'livestock-service', url: 'http://localhost:4003/health', port: 4003 },
  { name: 'poultry-service', url: 'http://localhost:4004/health', port: 4004 },
  { name: 'notification-service', url: 'http://localhost:4005/health', port: 4005 },
  { name: 'finance-service', url: 'http://localhost:4006/health', port: 4006 },
  { name: 'worker-service', url: 'http://localhost:4007/health', port: 4007 },
  { name: 'reporting-service', url: 'http://localhost:4008/health', port: 4008 },
  { name: 'organization-service', url: 'http://localhost:4009/health', port: 4009 },
  { name: 'inventory-service', url: 'http://localhost:4010/health', port: 4010 },
  { name: 'crop-service', url: 'http://localhost:4011/health', port: 4011 },
  { name: 'hr-service', url: 'http://localhost:4012/health', port: 4012 },
  { name: 'platform-service', url: 'http://localhost:4020/health-check', port: 4020 },
  { name: 'api-gateway', url: 'http://localhost:4000/health', port: 4000 },
];

@Injectable()
export class PlatformHealthService {
  async getHealth() {
    const services = await prisma.systemHealth.findMany({ orderBy: { serviceName: 'asc' } });

    let dbStatus = 'healthy';
    let dbLatency = 0;
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - start;
    } catch {
      dbStatus = 'down';
    }

    return {
      services: services.map((s) => ({
        name: s.serviceName,
        status: s.status,
        uptime: s.uptime,
        memoryUsage: s.memoryUsage,
        lastCheck: s.lastCheck,
        metadata: s.metadata,
      })),
      database: { name: 'postgresql', status: dbStatus, latencyMs: dbLatency },
      lastUpdated: new Date().toISOString(),
    };
  }

  async checkAll() {
    const results = [];
    const startTime = Date.now();

    const checkPromises = SERVICES.map(async (service) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const start = Date.now();

        const response = await fetch(service.url, { signal: controller.signal });
        clearTimeout(timeout);

        const latencyMs = Date.now() - start;
        const data = await response.json();
        const status = response.ok ? 'healthy' : 'degraded';

        await prisma.systemHealth.upsert({
          where: { serviceName: service.name },
          update: { status, uptime: data.uptime || 0, memoryUsage: data.memory || null, lastCheck: new Date(), metadata: { ...data, latencyMs } },
          create: { serviceName: service.name, status, uptime: data.uptime || 0, memoryUsage: data.memory || null, lastCheck: new Date(), metadata: { ...data, latencyMs } },
        });

        return { name: service.name, status, latencyMs };
      } catch {
        await prisma.systemHealth.upsert({
          where: { serviceName: service.name },
          update: { status: 'down', lastCheck: new Date() },
          create: { serviceName: service.name, status: 'down', lastCheck: new Date() },
        });
        return { name: service.name, status: 'down', latencyMs: -1 };
      }
    });

    const serviceResults = await Promise.all(checkPromises);

    let dbStatus = 'healthy';
    let dbLatency = 0;
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - start;
    } catch {
      dbStatus = 'down';
    }
    serviceResults.push({ name: 'postgresql', status: dbStatus, latencyMs: dbLatency });

    const totalMs = Date.now() - startTime;
    const healthyCount = serviceResults.filter((s) => s.status === 'healthy').length;

    return {
      results: serviceResults,
      summary: { total: serviceResults.length, healthy: healthyCount, unhealthy: serviceResults.length - healthyCount, totalMs },
      checkedAt: new Date().toISOString(),
    };
  }
}
