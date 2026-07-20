import { Injectable } from '@nestjs/common';
import { prisma } from '@farm/database';
import {
  FeatureFlagRepository,
  FeatureFlagOverrideRepository,
  SubscriptionPlanRepository,
  AuditLogRepository,
  SystemHealthRepository,
  BroadcastRepository,
  PlatformConfigRepository,
} from '../../domain/repositories/platform.repository';
import {
  FeatureFlag,
  FeatureFlagOverride,
  SubscriptionPlan,
  AuditLog,
  SystemHealth,
  Broadcast,
  PlatformConfig,
} from '../../domain/entities/platform.entity';

@Injectable()
export class PrismaFeatureFlagRepository implements FeatureFlagRepository {
  async findById(id: string): Promise<FeatureFlag | null> {
    return prisma.featureFlag.findUnique({ where: { id } }) as Promise<FeatureFlag | null>;
  }

  async findMany(options?: { category?: string }): Promise<FeatureFlag[]> {
    const where = options?.category ? { category: options.category } : {};
    return prisma.featureFlag.findMany({ where, orderBy: { category: 'asc' } }) as Promise<FeatureFlag[]>;
  }

  async create(data: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlag> {
    return prisma.featureFlag.create({ data }) as Promise<FeatureFlag>;
  }

  async update(id: string, data: Partial<FeatureFlag>): Promise<FeatureFlag> {
    return prisma.featureFlag.update({ where: { id }, data }) as Promise<FeatureFlag>;
  }

  async delete(id: string): Promise<void> {
    await prisma.featureFlag.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaFeatureFlagOverrideRepository implements FeatureFlagOverrideRepository {
  async findByIds(featureFlagId: string, organizationId: string): Promise<FeatureFlagOverride | null> {
    return prisma.featureFlagOverride.findUnique({
      where: { featureFlagId_organizationId: { featureFlagId, organizationId } },
    }) as Promise<FeatureFlagOverride | null>;
  }

  async findByFeatureFlagId(featureFlagId: string): Promise<FeatureFlagOverride[]> {
    return prisma.featureFlagOverride.findMany({ where: { featureFlagId } }) as Promise<FeatureFlagOverride[]>;
  }

  async upsert(data: { featureFlagId: string; organizationId: string; isEnabled: boolean }): Promise<FeatureFlagOverride> {
    return prisma.featureFlagOverride.upsert({
      where: {
        featureFlagId_organizationId: {
          featureFlagId: data.featureFlagId,
          organizationId: data.organizationId,
        },
      },
      update: { isEnabled: data.isEnabled },
      create: { featureFlagId: data.featureFlagId, organizationId: data.organizationId, isEnabled: data.isEnabled },
    }) as Promise<FeatureFlagOverride>;
  }

  async delete(featureFlagId: string, organizationId: string): Promise<void> {
    await prisma.featureFlagOverride.delete({
      where: { featureFlagId_organizationId: { featureFlagId, organizationId } },
    });
  }
}

@Injectable()
export class PrismaSubscriptionPlanRepository implements SubscriptionPlanRepository {
  async findById(id: string): Promise<SubscriptionPlan | null> {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
    return plan ? (plan as unknown as SubscriptionPlan) : null;
  }

  async findByName(name: string): Promise<SubscriptionPlan | null> {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { name } });
    return plan ? (plan as unknown as SubscriptionPlan) : null;
  }

  async findMany(): Promise<SubscriptionPlan[]> {
    const plans = await prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: 'asc' } });
    return plans.map(p => p as unknown as SubscriptionPlan);
  }

  async create(data: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionPlan> {
    const plan = await prisma.subscriptionPlan.create({ data: data as any });
    return plan as unknown as SubscriptionPlan;
  }

  async update(id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const plan = await prisma.subscriptionPlan.update({ where: { id }, data: data as any });
    return plan as unknown as SubscriptionPlan;
  }

  async delete(id: string): Promise<void> {
    await prisma.subscriptionPlan.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaAuditLogRepository implements AuditLogRepository {
  async findById(id: string): Promise<AuditLog | null> {
    return prisma.auditLog.findUnique({ where: { id } }) as Promise<AuditLog | null>;
  }

  async findMany(query: {
    page?: number;
    limit?: number;
    action?: string;
    entity?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query.entity) where.entity = query.entity;
    if (query.userId) where.userId = query.userId;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs: logs as AuditLog[], total };
  }

  async create(data: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    return prisma.auditLog.create({ data }) as Promise<AuditLog>;
  }
}

@Injectable()
export class PrismaSystemHealthRepository implements SystemHealthRepository {
  async findMany(): Promise<SystemHealth[]> {
    return prisma.systemHealth.findMany({ orderBy: { serviceName: 'asc' } }) as Promise<SystemHealth[]>;
  }

  async upsert(serviceName: string, data: Partial<SystemHealth>): Promise<SystemHealth> {
    const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = data;
    return prisma.systemHealth.upsert({
      where: { serviceName },
      update: rest as any,
      create: { serviceName, ...rest } as any,
    }) as Promise<SystemHealth>;
  }

  async queryRaw(query: string): Promise<any> {
    return prisma.$queryRaw`SELECT 1`;
  }
}

@Injectable()
export class PrismaBroadcastRepository implements BroadcastRepository {
  async findById(id: string): Promise<Broadcast | null> {
    return prisma.broadcast.findUnique({ where: { id } }) as Promise<Broadcast | null>;
  }

  async findMany(): Promise<Broadcast[]> {
    return prisma.broadcast.findMany({ orderBy: { createdAt: 'desc' } }) as Promise<Broadcast[]>;
  }

  async create(data: Omit<Broadcast, 'id' | 'createdAt' | 'updatedAt'>): Promise<Broadcast> {
    return prisma.broadcast.create({ data: data as any }) as Promise<Broadcast>;
  }

  async update(id: string, data: Partial<Broadcast>): Promise<Broadcast> {
    return prisma.broadcast.update({ where: { id }, data: data as any }) as Promise<Broadcast>;
  }

  async delete(id: string): Promise<void> {
    await prisma.broadcast.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaPlatformConfigRepository implements PlatformConfigRepository {
  async findMany(): Promise<PlatformConfig[]> {
    return prisma.platformConfig.findMany({ orderBy: { key: 'asc' } }) as Promise<PlatformConfig[]>;
  }

  async findByKey(key: string): Promise<PlatformConfig | null> {
    return prisma.platformConfig.findUnique({ where: { key } }) as Promise<PlatformConfig | null>;
  }

  async upsert(key: string, value: any, description?: string): Promise<PlatformConfig> {
    return prisma.platformConfig.upsert({
      where: { key },
      update: { value, description: description ?? undefined },
      create: { key, value, description: description || null },
    }) as Promise<PlatformConfig>;
  }

  async delete(key: string): Promise<void> {
    await prisma.platformConfig.delete({ where: { key } });
  }
}
