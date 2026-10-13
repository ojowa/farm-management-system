import { Injectable, Inject, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
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

type HealthStatus = 'healthy' | 'degraded' | 'down';

interface HealthResult {
  name: string;
  status: HealthStatus;
  latencyMs: number;
}

interface ProbeTargetSpec {
  name: string;
  /** Optional env var pointing at a split deployment of this context. */
  env: string;
}

/**
 * Logical contexts probed by `checkAll()`.
 *
 * The modular monolith serves every bounded context from *this* process, so
 * there is no separate socket to dial unless a `*_SERVICE_URL` explicitly
 * points somewhere else (a split deployment). Without one, `probeService`
 * falls back to the in-process signal instead of inventing a
 * `localhost:40xx` URL that can only ever fail.
 */
const HEALTH_TARGETS: ProbeTargetSpec[] = [
  { name: 'auth-service', env: 'AUTH_SERVICE_URL' },
  { name: 'farm-service', env: 'FARM_SERVICE_URL' },
  { name: 'notification-service', env: 'NOTIFICATION_SERVICE_URL' },
  { name: 'finance-service', env: 'FINANCE_SERVICE_URL' },
  { name: 'reporting-service', env: 'REPORTING_SERVICE_URL' },
  { name: 'organization-service', env: 'ORGANIZATION_SERVICE_URL' },
  { name: 'hr-service', env: 'HR_SERVICE_URL' },
  { name: 'platform-service', env: 'PLATFORM_SERVICE_URL' },
];

@Injectable()
export class PlatformHealthService {
  private readonly logger = new Logger(PlatformHealthService.name);

  constructor(@Inject('SystemHealthRepository') private readonly healthRepo: SystemHealthRepository) {}

  async getHealth() {
    // Rows for services this deployment no longer probes (the gateway entry,
    // skipped when APP_SERVER_URL is unset) would otherwise sit in the grid
    // forever, frozen at their last real check with an old timestamp.
    const currentTargets = new Set<string>([
      ...HEALTH_TARGETS.map((t) => t.name),
      ...(process.env.APP_SERVER_URL ? ['app-server'] : []),
      'postgresql',
    ]);
    const services = (await this.healthRepo.findMany()).filter((s) => currentTargets.has(s.serviceName));
    const db = await this.probeDatabase();

    // "Last updated" has to mean "when a check last ran", not `new Date()` on
    // every read — otherwise the console shows a fresh timestamp whenever the
    // page loads, with or without a check having happened.
    const lastCheck = services.reduce<Date | null>(
      (latest, s) => (s.lastCheck && (!latest || s.lastCheck > latest) ? s.lastCheck : latest),
      null,
    );

    return {
      services: services.map((s) => ({
        name: s.serviceName,
        status: s.status,
        uptime: s.uptime,
        memoryUsage: s.memoryUsage,
        // Per-service latency is persisted inside `metadata` by checkAll();
        // surface it here so the console card can render it.
        latencyMs: typeof s.metadata?.latencyMs === 'number' ? s.metadata.latencyMs : undefined,
        lastCheck: s.lastCheck,
        metadata: s.metadata,
      })),
      database: { name: 'postgresql', status: db.status, latencyMs: db.latencyMs },
      lastUpdated: lastCheck ? lastCheck.toISOString() : null,
    };
  }

  async checkAll() {
    const startTime = Date.now();

    // The DB round-trip doubles as the in-process liveness signal below, so it
    // runs first; the remaining probes then run concurrently (the old
    // sequential loop could hold the request for up to 9 x 5 s, far beyond the
    // console client's 15 s timeout).
    const db = await this.probeDatabase();
    const results: HealthResult[] = await Promise.all(HEALTH_TARGETS.map((target) => this.probeService(target, db)));

    // The gateway is only probeable when it is explicitly addressable; inside
    // the Vercel function nothing binds a port, so guessing `localhost:4000`
    // just produced a permanent fake "down".
    const gatewayBase = process.env.APP_SERVER_URL;
    if (gatewayBase) {
      results.push(await this.probe({ name: 'app-server', base: gatewayBase, path: '/v1/health' }));
    }

    results.push({ name: 'postgresql', status: db.status, latencyMs: db.latencyMs });

    const healthyCount = results.filter((r) => r.status === 'healthy').length;
    return {
      results,
      summary: {
        total: results.length,
        healthy: healthyCount,
        unhealthy: results.length - healthyCount,
        totalMs: Date.now() - startTime,
      },
      checkedAt: new Date().toISOString(),
    };
  }

  private async probeDatabase(): Promise<{ status: HealthStatus; latencyMs: number }> {
    try {
      const start = Date.now();
      await this.healthRepo.queryRaw('SELECT 1');
      return { status: 'healthy', latencyMs: Date.now() - start };
    } catch {
      return { status: 'down', latencyMs: -1 };
    }
  }

  private async probeService(target: ProbeTargetSpec, db: { status: HealthStatus; latencyMs: number }): Promise<HealthResult> {
    const base = process.env[target.env];
    if (base) {
      // Split deployment: another process owns this context, dial it. This app
      // serves everything under the global `v1` prefix (main.ts), so the health
      // route it exposes is `/v1/health` — probing `/health` would 404.
      return this.probe({ name: target.name, base, path: '/v1/health' });
    }

    // In-process: this context lives in the very process answering the
    // request, so "can it reach the database" is the honest liveness signal.
    const status: HealthStatus = db.status === 'healthy' ? 'healthy' : 'down';
    if (status !== 'healthy') {
      this.logger.warn(`health: ${target.name} -> ${status} (in-process, database unavailable)`);
    }
    await this.healthRepo.upsert(target.name, {
      status,
      uptime: Math.round(process.uptime()),
      memoryUsage: process.memoryUsage().rss,
      lastCheck: new Date(),
      metadata: {
        resolved: 'in-process',
        topology: 'modular-monolith',
        timestamp: new Date().toISOString(),
        latencyMs: 0,
      },
    });
    return { name: target.name, status, latencyMs: 0 };
  }

  private async probe(target: { name: string; base: string; path: string }): Promise<HealthResult> {
    const url = `${target.base.replace(/\/+$/, '')}${target.path}`;
    const timeoutMs = Number(process.env.HEALTH_CHECK_TIMEOUT_MS) || 5000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();

    try {
      const response = await fetch(url, { signal: controller.signal });
      const latencyMs = Date.now() - start;

      // A live service that answers with a non-JSON body must not be reported
      // as "down": parsing sits in its own try/catch, not the transport's.
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      // 2xx = healthy; 404 = the service answers but has no health contract we
      // can trust (the old code folded this into "degraded", which is how a
      // broken probe URL hid behind nine yellow cards); anything else that
      // answers = degraded.
      const status: HealthStatus = response.ok ? 'healthy' : response.status === 404 ? 'down' : 'degraded';

      await this.healthRepo.upsert(target.name, {
        status,
        uptime: typeof payload?.uptime === 'number' ? payload.uptime : 0,
        memoryUsage: payload?.memory ?? null,
        lastCheck: new Date(),
        metadata: {
          ...(payload && typeof payload === 'object' ? payload : {}),
          httpStatus: response.status,
          latencyMs,
        },
      });

      if (status !== 'healthy') {
        this.logger.warn(`health: ${target.name} -> ${status} (HTTP ${response.status}) ${url}`);
      }
      return { name: target.name, status, latencyMs };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      const error = err?.name === 'AbortError' ? `timed out after ${timeoutMs}ms` : String(err?.message || err);
      this.logger.warn(`health: ${target.name} -> down (${error}) ${url}`);

      // Reset uptime/memory/metadata as well: the old write only set
      // `status` + `lastCheck`, so a down service kept showing its last
      // successful uptime and month-old timestamps beside a fresh lastCheck.
      await this.healthRepo.upsert(target.name, {
        status: 'down',
        uptime: 0,
        memoryUsage: null,
        lastCheck: new Date(),
        metadata: { error, url, latencyMs },
      });
      return { name: target.name, status: 'down', latencyMs: -1 };
    } finally {
      clearTimeout(timer);
    }
  }
}

@Injectable()
export class PlatformUserService {
  constructor(@Inject('AuditLogRepository') private readonly auditLogRepo: AuditLogRepository) {}

  async findAllUsers(query: { page?: number; limit?: number; search?: string }) {
    const { prisma } = await import('../../../../kernel/database');
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
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
      users: users.map((u: any) => this.mapUser(u)),
      total,
    };
  }

  /**
   * Shapes a user for API responses. Every read and write in this service
   * routes through here so a raw Prisma row (passwordHash, twoFactorSecret)
   * never reaches the console.
   */
  private mapUser(u: any) {
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role?.name || 'UNKNOWN',
      organizationId: u.organizationId ?? null,
      organizationName: u.organization?.name || null,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : null,
    };
  }

  async findUser(id: string) {
    const { prisma } = await import('../../../../kernel/database');
    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true, organization: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.mapUser(user);
  }

  /**
   * Full user edit from the console: profile fields, active flag, role, and
   * moving the user to another organization (`organizationId: null` detaches
   * them so they are no longer under any organization).
   */
  async updateUser(id: string, data: any, auditUserId: string) {
    const { prisma } = await import('../../../../kernel/database');
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updateData: any = {
      firstName: data.firstName?.trim() || undefined,
      lastName: data.lastName?.trim() || undefined,
      email: data.email?.trim() || undefined,
      isActive: typeof data.isActive === 'boolean' ? data.isActive : undefined,
    };

    // Organization move: only written when the caller actually sent one, so a
    // plain profile edit can never silently detach the user.
    const targetOrgId: string | null = 'organizationId' in data ? (data.organizationId || null) : undefined;
    const orgChanged = targetOrgId !== undefined && targetOrgId !== user.organizationId;
    if (orgChanged) {
      if (targetOrgId) {
        const org = await prisma.organization.findUnique({ where: { id: targetOrgId }, select: { id: true } });
        if (!org) throw new BadRequestException('Organization not found');
      }
      updateData.organizationId = targetOrgId;
    }

    const roleChanged = !!data.roleId && data.roleId !== user.roleId;
    if (roleChanged) {
      const role = await prisma.role.findUnique({ where: { id: data.roleId }, select: { id: true } });
      if (!role) throw new BadRequestException('Role not found');
      updateData.roleId = data.roleId;
    }

    if (updateData.email && updateData.email.toLowerCase() !== (user.email || '').toLowerCase()) {
      const clash = await prisma.user.findFirst({ where: { email: updateData.email }, select: { id: true } });
      if (clash) throw new ConflictException('Email already in use');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true, organization: true },
    });

    // The access token embeds role, permissions and organization — end live
    // sessions on those changes so the user comes back with fresh claims
    // instead of keeping the old org's access until the token expires.
    if (orgChanged || roleChanged) {
      await prisma.refreshToken.deleteMany({ where: { userId: id } });
      await prisma.userSession.deleteMany({ where: { userId: id } });
    }

    await this.auditLogRepo.create({ userId: auditUserId, action: 'user.update', entity: 'User', entityId: id });
    return this.mapUser(updated);
  }

  async deactivateUser(id: string, auditUserId: string) {
    const { prisma } = await import('../../../../kernel/database');
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      include: { role: true, organization: true },
    });
    await this.auditLogRepo.create({ userId: auditUserId, action: 'user.deactivate', entity: 'User', entityId: id });
    return this.mapUser(updated);
  }

  async toggleUserActive(id: string, auditUserId: string) {
    const { prisma } = await import('../../../../kernel/database');
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      include: { role: true, organization: true },
    });
    await this.auditLogRepo.create({ userId: auditUserId, action: 'user.toggle-active', entity: 'User', entityId: id });
    return this.mapUser(updated);
  }

  async impersonateUser(id: string, auditUserId: string) {
    const { prisma } = await import('../../../../kernel/database');
    const user = await prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!user) throw new NotFoundException('User not found');
    await this.auditLogRepo.create({ userId: auditUserId, action: 'user.impersonate', entity: 'User', entityId: id });
    return { message: 'Impersonation token generated', targetUser: { id: user.id, email: user.email, role: user.role?.name } };
  }

  async forceLogoutUser(id: string, auditUserId: string) {
    const { prisma } = await import('../../../../kernel/database');
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await prisma.refreshToken.deleteMany({ where: { userId: id } });
    await prisma.userSession.deleteMany({ where: { userId: id } });
    await this.auditLogRepo.create({ userId: auditUserId, action: 'user.force-logout', entity: 'User', entityId: id });
    return { message: 'All sessions terminated' };
  }

  async getUserSessions(id: string) {
    const { prisma } = await import('../../../../kernel/database');
    const sessions = await prisma.userSession.findMany({ where: { userId: id } });
    return { sessions };
  }
}

@Injectable()
export class PlatformOrganizationService {
  constructor(@Inject('AuditLogRepository') private readonly auditLogRepo: AuditLogRepository) {}

  async findAllOrganizations(query: { page?: number; limit?: number; search?: string; subscriptionPlan?: string; subscriptionStatus?: string }) {
    const { prisma } = await import('../../../../kernel/database');
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
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
      organizations: orgs.map((o: any) => ({
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
    const { prisma } = await import('../../../../kernel/database');
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
      users: org.users.map((u: any) => ({
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
    const name = String(data?.name ?? '').trim();
    if (!name) throw new BadRequestException('Organization name is required');

    // Empty strings violate the unique constraints on slug/email (only NULLs
    // are repeatable), so normalise blanks to null and derive a clean slug.
    const slug = String(data?.slug ?? '').trim().toLowerCase() ||
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const email = String(data?.email ?? '').trim() || null;
    const phone = String(data?.phone ?? '').trim() || null;
    const industry = String(data?.industry ?? '').trim() || null;

    const { prisma } = await import('../../../../kernel/database');
    let org;
    try {
      org = await prisma.organization.create({
        data: {
          name,
          slug,
          email,
          phone,
          industry,
          subscriptionPlan: data.subscriptionPlan || 'FREE',
          subscriptionStatus: data.subscriptionStatus || 'TRIAL',
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        const field = Array.isArray(e?.meta?.target) ? e.meta.target.join(', ') : e?.meta?.target || 'slug or email';
        throw new ConflictException(`An organization with that ${field} already exists`);
      }
      throw e;
    }
    await this.auditLogRepo.create({ userId: auditUserId, action: 'organization.create', entity: 'Organization', entityId: org.id });
    return org;
  }

  async updateOrganization(id: string, data: any, auditUserId: string) {
    const { prisma } = await import('../../../../kernel/database');
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
    const { prisma } = await import('../../../../kernel/database');
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');

    await prisma.organization.delete({ where: { id } });
    await this.auditLogRepo.create({ userId: auditUserId, action: 'organization.delete', entity: 'Organization', entityId: id });
    return { message: 'Organization deleted' };
  }

  async suspendOrganization(id: string, auditUserId: string) {
    const { prisma } = await import('../../../../kernel/database');
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');

    const updated = await prisma.organization.update({ where: { id }, data: { subscriptionStatus: 'SUSPENDED' } });
    await this.auditLogRepo.create({ userId: auditUserId, action: 'organization.suspend', entity: 'Organization', entityId: id });
    return updated;
  }

  async activateOrganization(id: string, auditUserId: string) {
    const { prisma } = await import('../../../../kernel/database');
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');

    const updated = await prisma.organization.update({ where: { id }, data: { subscriptionStatus: 'ACTIVE' } });
    await this.auditLogRepo.create({ userId: auditUserId, action: 'organization.activate', entity: 'Organization', entityId: id });
    return updated;
  }

  async getOrganizationStats(id: string) {
    const { prisma } = await import('../../../../kernel/database');
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

  /**
   * Members of an organization are simply its users (single-organization
   * model: `User.organizationId`). The legacy `UserOrganization` join table
   * is never written anywhere, so reading it returned an empty list for
   * every organization.
   */
  async getOrganizationMembers(id: string) {
    const { prisma } = await import('../../../../kernel/database');
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');

    const users = await prisma.user.findMany({
      where: { organizationId: id },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      members: users.map((u: any) => ({
        id: u.id,
        userId: u.id,
        roleInOrg: u.role?.name || 'UNKNOWN',
        isActive: u.isActive,
        user: {
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role?.name,
        },
        createdAt: u.createdAt.toISOString(),
      })),
    };
  }

  async updateOrganizationSubscription(id: string, data: { subscriptionPlan?: string; subscriptionStatus?: string }, auditUserId: string) {
    const { prisma } = await import('../../../../kernel/database');
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
    const { prisma } = await import('../../../../kernel/database');

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
      plans: plans.map((p: any) => ({ value: p.name, label: p.displayName, id: p.id })),
      statuses: distinctStatuses.map((s: any) => ({ value: s.subscriptionStatus, label: s.subscriptionStatus })),
      broadcastTypes: distinctBroadcastTypes.map((t: any) => ({ value: t.type, label: t.type })),
      roles: roles.map((r: any) => ({ value: r.name, label: r.description || r.name, id: r.id })),
    };
  }

  async getSubscriptionPlans() {
    const { prisma } = await import('../../../../kernel/database');
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      select: { id: true, name: true, displayName: true },
      orderBy: { sortOrder: 'asc' },
    });
    return { plans: plans.map((p: any) => ({ value: p.name, label: p.displayName, id: p.id })) };
  }

  async getSubscriptionStatuses() {
    const { prisma } = await import('../../../../kernel/database');
    const statuses = await prisma.organization.findMany({
      select: { subscriptionStatus: true },
      distinct: ['subscriptionStatus'],
    });
    return { statuses: statuses.map((s: any) => ({ value: s.subscriptionStatus, label: s.subscriptionStatus })) };
  }

  async getBroadcastTypes() {
    const { prisma } = await import('../../../../kernel/database');
    const types = await prisma.broadcast.findMany({
      select: { type: true },
      distinct: ['type'],
    });
    return { types: types.map((t: any) => ({ value: t.type, label: t.type })) };
  }

  async getRoles() {
    const { prisma } = await import('../../../../kernel/database');
    const roles = await prisma.role.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
    return { roles: roles.map((r: any) => ({ value: r.name, label: r.description || r.name, id: r.id })) };
  }

  async getPlatformAdminRoles() {
    const { prisma } = await import('../../../../kernel/database');
    const roles = await prisma.role.findMany({
      where: { isPlatformAdmin: true },
      select: { id: true, name: true, description: true },
    });
    return { roles: roles.map((r: any) => ({ value: r.name, label: r.description || r.name })) };
  }
}
