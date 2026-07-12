import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import {
  FeatureFlagRepository,
  FeatureFlagOverrideRepository,
  SubscriptionPlanRepository,
  AuditLogRepository,
  SystemHealthRepository,
} from '../../domain/repositories/platform.repository';

@Injectable()
export class PlatformFeatureFlagService {
  constructor(
    private readonly featureFlagRepo: FeatureFlagRepository,
    private readonly overrideRepo: FeatureFlagOverrideRepository,
    private readonly auditLogRepo: AuditLogRepository,
  ) {}

  async findAll() {
    const features = await this.featureFlagRepo.findMany();
    return { features };
  }

  async findOne(id: string) {
    const feature = await this.featureFlagRepo.findById(id);
    if (!feature) throw new NotFoundException('Feature flag not found');
    return feature;
  }

  async update(id: string, data: { isEnabled?: boolean; name?: string; description?: string }, auditUserId: string) {
    await this.findOne(id);
    const updated = await this.featureFlagRepo.update(id, data);
    await this.auditLogRepo.create({ userId: auditUserId, action: 'feature.toggle', entity: 'FeatureFlag', entityId: id });
    return updated;
  }

  async getOverrides(featureId: string) {
    const overrides = await this.overrideRepo.findByFeatureFlagId(featureId);
    return { overrides };
  }

  async setOverride(featureId: string, data: { organizationId: string; isEnabled: boolean }, auditUserId: string) {
    if (!data.organizationId || data.isEnabled === undefined) {
      throw new BadRequestException('organizationId and isEnabled are required');
    }
    await this.findOne(featureId);
    const override = await this.overrideRepo.upsert({ featureFlagId: featureId, ...data });
    await this.auditLogRepo.create({ userId: auditUserId, action: 'feature.override.set', entity: 'FeatureFlagOverride', entityId: override.id });
    return override;
  }

  async deleteOverride(featureId: string, orgId: string, auditUserId: string) {
    const override = await this.overrideRepo.findByIds(featureId, orgId);
    if (!override) throw new NotFoundException('Override not found');
    await this.overrideRepo.delete(featureId, orgId);
    await this.auditLogRepo.create({ userId: auditUserId, action: 'feature.override.delete', entity: 'FeatureFlagOverride', entityId: override.id });
    return { message: 'Override removed successfully' };
  }
}

@Injectable()
export class PlatformSubscriptionService {
  constructor(
    private readonly planRepo: SubscriptionPlanRepository,
    private readonly auditLogRepo: AuditLogRepository,
  ) {}

  async findAllPlans() {
    const plans = await this.planRepo.findMany();
    return { plans };
  }

  async findOnePlan(id: string) {
    const plan = await this.planRepo.findById(id);
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async createPlan(data: {
    name: string;
    displayName: string;
    description?: string;
    price?: number;
    currency?: string;
    billingCycle?: string;
    maxUsers?: number;
    maxFarms?: number;
    maxStorage?: number;
    features?: any;
    sortOrder?: number;
  }, auditUserId: string) {
    if (!data.name || !data.displayName) throw new BadRequestException('name and displayName are required');
    const existingPlan = await this.planRepo.findByName(data.name);
    if (existingPlan) throw new ConflictException('Plan with this name already exists');

    const plan = await this.planRepo.create({
      name: data.name,
      displayName: data.displayName,
      description: data.description || null,
      price: data.price || 0,
      currency: data.currency || 'USD',
      billingCycle: data.billingCycle || 'MONTHLY',
      maxUsers: data.maxUsers || 5,
      maxFarms: data.maxFarms || 1,
      maxStorage: data.maxStorage || 100,
      features: data.features || [],
      isActive: true,
      sortOrder: data.sortOrder || 0,
    });

    await this.auditLogRepo.create({ userId: auditUserId, action: 'subscription.plan.create', entity: 'SubscriptionPlan', entityId: plan.id });
    return plan;
  }

  async updatePlan(id: string, data: Partial<{
    displayName: string;
    description: string;
    price: number;
    currency: string;
    billingCycle: string;
    maxUsers: number;
    maxFarms: number;
    maxStorage: number;
    features: any;
    isActive: boolean;
    sortOrder: number;
  }>, auditUserId: string) {
    await this.findOnePlan(id);
    const updated = await this.planRepo.update(id, data);
    await this.auditLogRepo.create({ userId: auditUserId, action: 'subscription.plan.update', entity: 'SubscriptionPlan', entityId: id });
    return updated;
  }

  async deletePlan(id: string, auditUserId: string) {
    await this.findOnePlan(id);
    await this.planRepo.delete(id);
    await this.auditLogRepo.create({ userId: auditUserId, action: 'subscription.plan.delete', entity: 'SubscriptionPlan', entityId: id });
    return { message: 'Plan deleted successfully' };
  }
}

@Injectable()
export class PlatformAuditService {
  constructor(private readonly auditLogRepo: AuditLogRepository) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    action?: string;
    entity?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.auditLogRepo.findMany(query);
  }

  async findOne(id: string) {
    const log = await this.auditLogRepo.findById(id);
    if (!log) throw new NotFoundException('Audit log not found');
    return log;
  }
}

@Injectable()
export class PlatformHealthService {
  constructor(private readonly healthRepo: SystemHealthRepository) {}

  async getHealth() {
    const services = await this.healthRepo.findMany();
    let dbStatus = 'healthy';
    let dbLatency = 0;
    try {
      const start = Date.now();
      await this.healthRepo.queryRaw('SELECT 1');
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
    const SERVICES = [
      { name: 'auth-service', url: 'http://localhost:4001/health' },
      { name: 'farm-service', url: 'http://localhost:4002/health' },
      { name: 'livestock-service', url: 'http://localhost:4003/health' },
      { name: 'poultry-service', url: 'http://localhost:4004/health' },
      { name: 'notification-service', url: 'http://localhost:4005/health' },
      { name: 'finance-service', url: 'http://localhost:4006/health' },
      { name: 'worker-service', url: 'http://localhost:4007/health' },
      { name: 'reporting-service', url: 'http://localhost:4008/health' },
      { name: 'organization-service', url: 'http://localhost:4009/health' },
      { name: 'inventory-service', url: 'http://localhost:4010/health' },
      { name: 'crop-service', url: 'http://localhost:4011/health' },
      { name: 'hr-service', url: 'http://localhost:4012/health' },
      { name: 'platform-service', url: 'http://localhost:4020/health-check' },
      { name: 'api-gateway', url: 'http://localhost:4000/health' },
    ];

    const results = [];
    const startTime = Date.now();

    for (const service of SERVICES) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const start = Date.now();
        const response = await fetch(service.url, { signal: controller.signal });
        clearTimeout(timeout);
        const latencyMs = Date.now() - start;
        const data = await response.json();
        const status = response.ok ? 'healthy' : 'degraded';
        await this.healthRepo.upsert(service.name, { status, uptime: data.uptime || 0, memoryUsage: data.memory || null, lastCheck: new Date(), metadata: { ...data, latencyMs } });
        results.push({ name: service.name, status, latencyMs });
      } catch {
        await this.healthRepo.upsert(service.name, { status: 'down', lastCheck: new Date() });
        results.push({ name: service.name, status: 'down', latencyMs: -1 });
      }
    }

    let dbStatus = 'healthy';
    let dbLatency = 0;
    try {
      const start = Date.now();
      await this.healthRepo.queryRaw('SELECT 1');
      dbLatency = Date.now() - start;
    } catch {
      dbStatus = 'down';
    }
    results.push({ name: 'postgresql', status: dbStatus, latencyMs: dbLatency });

    const totalMs = Date.now() - startTime;
    const healthyCount = results.filter((s) => s.status === 'healthy').length;

    return {
      results,
      summary: { total: results.length, healthy: healthyCount, unhealthy: results.length - healthyCount, totalMs },
      checkedAt: new Date().toISOString(),
    };
  }
}
