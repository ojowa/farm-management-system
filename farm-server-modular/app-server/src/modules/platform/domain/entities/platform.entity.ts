export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  defaultValue: boolean;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureFlagOverride {
  id: string;
  featureFlagId: string;
  organizationId: string;
  isEnabled: boolean;
  createdAt: Date;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  price: number;
  currency: string;
  billingCycle: string;
  maxUsers: number;
  maxFarms: number;
  maxStorage: number;
  features: any;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: Date;
}

export interface SystemHealth {
  id: string;
  serviceName: string;
  status: string;
  uptime: number | null;
  memoryUsage: any;
  lastCheck: Date;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  type: string;
  targetOrgs: string[];
  isActive: boolean;
  startsAt: Date;
  expiresAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformConfig {
  id: string;
  key: string;
  value: any;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}
