import { Injectable } from '@nestjs/common';
import { prisma } from '@farm/database';
import {
  FeatureFlagRepository,
  FeatureFlagOverrideRepository,
  SubscriptionPlanRepository,
  AuditLogRepository,
  SystemHealthRepository,
} from '../../domain/repositories/platform.repository';
import {
  FeatureFlag,
  FeatureFlagOverride,
  SubscriptionPlan,
  AuditLog,
  SystemHealth,
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
    return prisma.subscriptionPlan.findUnique({ where: { id } }) as Promise<SubscriptionPlan | null>;
  }

  async findByName(name: string): Promise<SubscriptionPlan | null> {
    return prisma.subscriptionPlan.findUnique({ where: { name } }) as Promise<SubscriptionPlan | null>;
  }

  async findMany(): Promise<SubscriptionPlan[]> {
    return prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: 'asc' } }) as Promise<SubscriptionPlan[]>;
  }

  async create(data: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionPlan> {
    return prisma.subscriptionPlan.create({ data }) as Promise<SubscriptionPlan>;
  }

  async update(id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    return prisma.subscriptionPlan.update({ where: { id }, data }) as Promise<SubscriptionPlan>;
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
    return prisma.systemHealth.upsert({
      where: { serviceName },
      update: data,
      create: { serviceName, ...data } as any,
    }) as Promise<SystemHealth>;
  }

  async queryRaw(query: string): Promise<any> {
    return prisma.$queryRaw`SELECT 1`;
  }
}
