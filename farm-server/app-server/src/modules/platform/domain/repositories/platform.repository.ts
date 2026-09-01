import {
  FeatureFlag,
  FeatureFlagOverride,
  SubscriptionPlan,
  AuditLog,
  SystemHealth,
  Broadcast,
  PlatformConfig,
} from '../entities/platform.entity';

export interface FeatureFlagRepository {
  findById(id: string): Promise<FeatureFlag | null>;
  findMany(options?: { category?: string }): Promise<FeatureFlag[]>;
  create(data: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlag>;
  update(id: string, data: Partial<FeatureFlag>): Promise<FeatureFlag>;
  delete(id: string): Promise<void>;
}

export interface FeatureFlagOverrideRepository {
  findByIds(featureFlagId: string, organizationId: string): Promise<FeatureFlagOverride | null>;
  findByFeatureFlagId(featureFlagId: string): Promise<FeatureFlagOverride[]>;
  upsert(data: { featureFlagId: string; organizationId: string; isEnabled: boolean }): Promise<FeatureFlagOverride>;
  delete(featureFlagId: string, organizationId: string): Promise<void>;
}

export interface SubscriptionPlanRepository {
  findById(id: string): Promise<SubscriptionPlan | null>;
  findByName(name: string): Promise<SubscriptionPlan | null>;
  findMany(): Promise<SubscriptionPlan[]>;
  create(data: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionPlan>;
  update(id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan>;
  delete(id: string): Promise<void>;
}

export interface AuditLogRepository {
  findById(id: string): Promise<AuditLog | null>;
  findMany(query: {
    page?: number;
    limit?: number;
    action?: string;
    entity?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ logs: AuditLog[]; total: number }>;
  create(data: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>;
}

export interface SystemHealthRepository {
  findMany(): Promise<SystemHealth[]>;
  upsert(serviceName: string, data: Partial<SystemHealth>): Promise<SystemHealth>;
  queryRaw(query: string): Promise<any>;
}

export interface BroadcastRepository {
  findById(id: string): Promise<Broadcast | null>;
  findMany(): Promise<Broadcast[]>;
  create(data: Omit<Broadcast, 'id' | 'createdAt' | 'updatedAt'>): Promise<Broadcast>;
  update(id: string, data: Partial<Broadcast>): Promise<Broadcast>;
  delete(id: string): Promise<void>;
}

export interface PlatformConfigRepository {
  findMany(): Promise<PlatformConfig[]>;
  findByKey(key: string): Promise<PlatformConfig | null>;
  upsert(key: string, value: any, description?: string): Promise<PlatformConfig>;
  delete(key: string): Promise<void>;
}
