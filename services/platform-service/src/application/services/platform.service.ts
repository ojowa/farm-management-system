import { Injectable, Inject, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import {
  FeatureFlagRepository,
  FeatureFlagOverrideRepository,
  SubscriptionPlanRepository,
  AuditLogRepository,
  SystemHealthRepository,
  BroadcastRepository,
  PlatformConfigRepository,
} from '../../domain/repositories/platform.repository';

@Injectable()
export class PlatformFeatureFlagService {
  constructor(@Inject('FeatureFlagRepository') private readonly featureFlagRepo: FeatureFlagRepository, @Inject('FeatureFlagOverrideRepository') private readonly overrideRepo: FeatureFlagOverrideRepository, @Inject('AuditLogRepository') private readonly auditLogRepo: AuditLogRepository, 
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

  async update(id: string,  data: { isEnabled?: boolean; name?: string; description?: string },  auditUserId: string) {
    await this.findOne(id);
    const updated = await this.featureFlagRepo.update(id, data);
    await this.auditLogRepo.create({ userId: auditUserId, action: 'feature.toggle', entity: 'FeatureFlag', entityId: id });
    return updated;
  }

  async getOverrides(featureId: string) {
    const overrides = await this.overrideRepo.findByFeatureFlagId(featureId);
    return { overrides };
  }

  async setOverride(featureId: string,  data: { organizationId: string; isEnabled: boolean },  auditUserId: string) {
    if (!data.organizationId || data.isEnabled === undefined) {
      throw new BadRequestException('organizationId and isEnabled are required');
    }
    await this.findOne(featureId);
    const override = await this.overrideRepo.upsert({ featureFlagId: featureId, ...data });
    await this.auditLogRepo.create({ userId: auditUserId, action: 'feature.override.set', entity: 'FeatureFlagOverride', entityId: override.id });
    return override;
  }

  async deleteOverride(featureId: string,  orgId: string,  auditUserId: string) {
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
    @Inject('SubscriptionPlanRepository') private readonly planRepo: SubscriptionPlanRepository, @Inject('AuditLogRepository') private readonly auditLogRepo: AuditLogRepository, 
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
  },  auditUserId: string) {
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

  async updatePlan(id: string,  data: Partial<{
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
  }>,  auditUserId: string) {
    await this.findOnePlan(id);
    const updated = await this.planRepo.update(id, data);
    await this.auditLogRepo.create({ userId: auditUserId, action: 'subscription.plan.update', entity: 'SubscriptionPlan', entityId: id });
    return updated;
  }

  async deletePlan(id: string,  auditUserId: string) {
    await this.findOnePlan(id);
    await this.planRepo.delete(id);
    await this.auditLogRepo.create({ userId: auditUserId, action: 'subscription.plan.delete', entity: 'SubscriptionPlan', entityId: id });
    return { message: 'Plan deleted successfully' };
  }
}

@Injectable()
export class PlatformAuditService {
  constructor(@Inject('AuditLogRepository') private readonly auditLogRepo: AuditLogRepository) {}

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
  constructor(@Inject('SystemHealthRepository') private readonly healthRepo: SystemHealthRepository) {}

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

@Injectable()
export class PlatformUserService {
  constructor(@Inject('AuditLogRepository') private readonly auditLogRepo: AuditLogRepository) {}

  async findAllUsers(query: { page?: number; limit?: number; search?: string }) {
    const { prisma } = await import('@farm/database');
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { role: true, organization: true },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role?.name || 'UNKNOWN',
        organizationId: u.organizationId,
        organizationName: u.organization?.name || null,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt?.toISOString() || null,
        createdAt: u.createdAt.toISOString(),
      })),
      total,
    };
  }

  async findUser(id: string) {
    const { prisma } = await import('@farm/database');
    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true, organization: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role?.name || 'UNKNOWN',
      organizationId: user.organizationId,
      organizationName: user.organization?.name || null,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateUser(id: string, data: any, auditUserId: string) {
    const { prisma } = await import('@farm/database');
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await prisma.user.update({
      where: { id },
      data: {
        firstName: data.firstName ?? undefined,
        lastName: data.lastName ?? undefined,
        email: data.email ?? undefined,
        isActive: data.isActive ?? undefined,
      },
    });
    await this.auditLogRepo.create({ userId: auditUserId, action: 'user.update', entity: 'User', entityId: id });
    return updated;
  }

  async deactivateUser(id: string, auditUserId: string) {
    const { prisma } = await import('@farm/database');
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await prisma.user.update({ where: { id }, data: { isActive: false } });
    await this.auditLogRepo.create({ userId: auditUserId, action: 'user.deactivate', entity: 'User', entityId: id });
    return updated;
  }

  async toggleUserActive(id: string, auditUserId: string) {
    const { prisma } = await import('@farm/database');
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
    await this.auditLogRepo.create({ userId: auditUserId, action: 'user.toggle-active', entity: 'User', entityId: id });
    return updated;
  }

  async impersonateUser(id: string, auditUserId: string) {
    const { prisma } = await import('@farm/database');
    const user = await prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!user) throw new NotFoundException('User not found');
    await this.auditLogRepo.create({ userId: auditUserId, action: 'user.impersonate', entity: 'User', entityId: id });
    return { message: 'Impersonation token generated', targetUser: { id: user.id, email: user.email, role: user.role?.name } };
  }

  async forceLogoutUser(id: string, auditUserId: string) {
    const { prisma } = await import('@farm/database');
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await prisma.refreshToken.deleteMany({ where: { userId: id } });
    await prisma.userSession.deleteMany({ where: { userId: id } });
    await this.auditLogRepo.create({ userId: auditUserId, action: 'user.force-logout', entity: 'User', entityId: id });
    return { message: 'All sessions terminated' };
  }

  async getUserSessions(id: string) {
    const { prisma } = await import('@farm/database');
    const sessions = await prisma.userSession.findMany({ where: { userId: id } });
    return { sessions };
  }
}

@Injectable()
export class PlatformOrganizationService {
  constructor(@Inject('AuditLogRepository') private readonly auditLogRepo: AuditLogRepository) {}

  async findAllOrganizations(query: { page?: number; limit?: number; search?: string; subscriptionPlan?: string; subscriptionStatus?: string }) {
    const { prisma } = await import('@farm/database');
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.subscriptionPlan) where.subscriptionPlan = query.subscriptionPlan;
    if (query.subscriptionStatus) where.subscriptionStatus = query.subscriptionStatus;

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { users: true, farms: true } } },
      }),
      prisma.organization.count({ where }),
    ]);

    return {
      organizations: orgs.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        email: o.email,
        subscriptionPlan: o.subscriptionPlan,
        subscriptionStatus: o.subscriptionStatus,
        userCount: o._count.users,
        farmCount: o._count.farms,
        createdAt: o.createdAt.toISOString(),
      })),
      total,
    };
  }

  async findOrganization(id: string) {
    const { prisma } = await import('@farm/database');
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        users: { include: { role: true }, orderBy: { createdAt: 'desc' } },
        _count: { select: { users: true, farms: true } },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return {
      ...org,
      userCount: org._count.users,
      farmCount: org._count.farms,
      users: org.users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt?.toISOString() || null,
      })),
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    };
  }

  async createOrganization(data: any, auditUserId: string) {
    const { prisma } = await import('@farm/database');
    const org = await prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
        email: data.email,
        phone: data.phone,
        industry: data.industry,
        subscriptionPlan: data.subscriptionPlan || 'FREE',
        subscriptionStatus: data.subscriptionStatus || 'TRIAL',
      },
    });
    await this.auditLogRepo.create({ userId: auditUserId, action: 'organization.create', entity: 'Organization', entityId: org.id });
    return org;
  }

  async updateOrganization(id: string, data: any, auditUserId: string) {
    const { prisma } = await import('@farm/database');
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        website: data.website ?? undefined,
        industry: data.industry ?? undefined,
      },
    });
    await this.auditLogRepo.create({ userId: auditUserId, action: 'organization.update', entity: 'Organization', entityId: id });
    return updated;
  }

  async deleteOrganization(id: string, auditUserId: string) {
    const { prisma } = await import('@farm/database');
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');

    await prisma.organization.delete({ where: { id } });
    await this.auditLogRepo.create({ userId: auditUserId, action: 'organization.delete', entity: 'Organization', entityId: id });
    return { message: 'Organization deleted' };
  }

  async suspendOrganization(id: string, auditUserId: string) {
    const { prisma } = await import('@farm/database');
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');

    const updated = await prisma.organization.update({ where: { id }, data: { subscriptionStatus: 'SUSPENDED' } });
    await this.auditLogRepo.create({ userId: auditUserId, action: 'organization.suspend', entity: 'Organization', entityId: id });
    return updated;
  }

  async activateOrganization(id: string, auditUserId: string) {
    const { prisma } = await import('@farm/database');
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');

    const updated = await prisma.organization.update({ where: { id }, data: { subscriptionStatus: 'ACTIVE' } });
    await this.auditLogRepo.create({ userId: auditUserId, action: 'organization.activate', entity: 'Organization', entityId: id });
    return updated;
  }

  async getOrganizationStats(id: string) {
    const { prisma } = await import('@farm/database');
    const org = await prisma.organization.findUnique({ where: { id }, include: { _count: { select: { users: true, farms: true, workers: true } } } });
    if (!org) throw new NotFoundException('Organization not found');
    return {
      organizationId: id,
      userCount: org._count.users,
      farmCount: org._count.farms,
      workerCount: org._count.workers,
      subscriptionPlan: org.subscriptionPlan,
      subscriptionStatus: org.subscriptionStatus,
    };
  }

  async getOrganizationMembers(id: string) {
    const { prisma } = await import('@farm/database');
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');

    const members = await prisma.userOrganization.findMany({
      where: { organizationId: id },
      include: { user: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        roleInOrg: m.roleInOrg,
        isActive: m.isActive,
        user: {
          id: m.user.id,
          email: m.user.email,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          role: m.user.role?.name,
        },
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  async updateOrganizationSubscription(id: string, data: { subscriptionPlan?: string; subscriptionStatus?: string }, auditUserId: string) {
    const { prisma } = await import('@farm/database');
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        subscriptionPlan: data.subscriptionPlan ?? undefined,
        subscriptionStatus: data.subscriptionStatus ?? undefined,
      },
    });
    await this.auditLogRepo.create({ userId: auditUserId, action: 'organization.subscription.update', entity: 'Organization', entityId: id });
    return updated;
  }
}

@Injectable()
export class PlatformBroadcastService {
  constructor(@Inject('BroadcastRepository') private readonly broadcastRepo: BroadcastRepository, @Inject('AuditLogRepository') private readonly auditLogRepo: AuditLogRepository) {}

  async findAllBroadcasts() {
    const broadcasts = await this.broadcastRepo.findMany();
    return { broadcasts };
  }

  async findBroadcast(id: string) {
    const broadcast = await this.broadcastRepo.findById(id);
    if (!broadcast) throw new NotFoundException('Broadcast not found');
    return broadcast;
  }

  async createBroadcast(data: { title: string; message: string; type?: string }, auditUserId: string) {
    if (!data.title || !data.message) throw new BadRequestException('title and message are required');
    const broadcast = await this.broadcastRepo.create({
      title: data.title,
      message: data.message,
      type: data.type || 'INFO',
      targetOrgs: [],
      isActive: true,
      startsAt: new Date(),
      expiresAt: null,
      createdById: auditUserId,
    });
    await this.auditLogRepo.create({ userId: auditUserId, action: 'broadcast.create', entity: 'Broadcast', entityId: broadcast.id });
    return broadcast;
  }

  async updateBroadcast(id: string, data: any, auditUserId: string) {
    const existing = await this.broadcastRepo.findById(id);
    if (!existing) throw new NotFoundException('Broadcast not found');
    const updated = await this.broadcastRepo.update(id, data);
    await this.auditLogRepo.create({ userId: auditUserId, action: 'broadcast.update', entity: 'Broadcast', entityId: id });
    return updated;
  }

  async deleteBroadcast(id: string, auditUserId: string) {
    const existing = await this.broadcastRepo.findById(id);
    if (!existing) throw new NotFoundException('Broadcast not found');
    await this.broadcastRepo.delete(id);
    await this.auditLogRepo.create({ userId: auditUserId, action: 'broadcast.delete', entity: 'Broadcast', entityId: id });
    return { message: 'Broadcast deleted' };
  }
}

@Injectable()
export class PlatformConfigService {
  constructor(@Inject('PlatformConfigRepository') private readonly configRepo: PlatformConfigRepository, @Inject('AuditLogRepository') private readonly auditLogRepo: AuditLogRepository) {}

  async findAllConfig() {
    const configs = await this.configRepo.findMany();
    return { configs };
  }

  async findConfigByKey(key: string) {
    const config = await this.configRepo.findByKey(key);
    if (!config) throw new NotFoundException(`Config key '${key}' not found`);
    return config;
  }

  async upsertConfigs(configs: Array<{ key: string; value: string; description?: string; category?: string }>, auditUserId: string) {
    const results = [];
    for (const c of configs) {
      const result = await this.configRepo.upsert(c.key, c.value, c.description);
      results.push(result);
    }
    await this.auditLogRepo.create({ userId: auditUserId, action: 'config.update', entity: 'PlatformConfig', entityId: configs.map((c) => c.key).join(',') });
    return { configs: results };
  }
}

@Injectable()
export class PlatformOptionsService {
  async getAllOptions() {
    const { prisma } = await import('@farm/database');

    const [plans, roles, distinctStatuses, distinctBroadcastTypes] = await Promise.all([
      prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        select: { id: true, name: true, displayName: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.role.findMany({
        select: { id: true, name: true, description: true },
        orderBy: { name: 'asc' },
      }),
      prisma.organization.findMany({
        select: { subscriptionStatus: true },
        distinct: ['subscriptionStatus'],
      }),
      prisma.broadcast.findMany({
        select: { type: true },
        distinct: ['type'],
      }),
    ]);

    return {
      plans: plans.map((p) => ({ value: p.name, label: p.displayName, id: p.id })),
      statuses: distinctStatuses.map((s) => ({ value: s.subscriptionStatus, label: s.subscriptionStatus })),
      broadcastTypes: distinctBroadcastTypes.map((t) => ({ value: t.type, label: t.type })),
      roles: roles.map((r) => ({ value: r.name, label: r.description || r.name, id: r.id })),
    };
  }

  async getSubscriptionPlans() {
    const { prisma } = await import('@farm/database');
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      select: { id: true, name: true, displayName: true },
      orderBy: { sortOrder: 'asc' },
    });
    return { plans: plans.map((p) => ({ value: p.name, label: p.displayName, id: p.id })) };
  }

  async getSubscriptionStatuses() {
    const { prisma } = await import('@farm/database');
    const statuses = await prisma.organization.findMany({
      select: { subscriptionStatus: true },
      distinct: ['subscriptionStatus'],
    });
    return { statuses: statuses.map((s) => ({ value: s.subscriptionStatus, label: s.subscriptionStatus })) };
  }

  async getBroadcastTypes() {
    const { prisma } = await import('@farm/database');
    const types = await prisma.broadcast.findMany({
      select: { type: true },
      distinct: ['type'],
    });
    return { types: types.map((t) => ({ value: t.type, label: t.type })) };
  }

  async getRoles() {
    const { prisma } = await import('@farm/database');
    const roles = await prisma.role.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
    return { roles: roles.map((r) => ({ value: r.name, label: r.description || r.name, id: r.id })) };
  }

  async getPlatformAdminRoles() {
    const { prisma } = await import('@farm/database');
    const roles = await prisma.role.findMany({
      where: { isPlatformAdmin: true },
      select: { id: true, name: true, description: true },
    });
    return { roles: roles.map((r) => ({ value: r.name, label: r.description || r.name })) };
  }
}
