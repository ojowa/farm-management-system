export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  organizationId?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'maintenance';
  targetRoles?: string[];
  targetOrganizations?: string[];
  publishedAt?: string;
  expiresAt?: string;
  createdBy: string;
}

export interface ConfigItem {
  key: string;
  value: string;
  description?: string;
  category: string;
  isPublic: boolean;
  updatedBy?: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  prefix: string;
  permissions: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface Feature {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage?: number;
  allowedRoles?: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  maxFarms?: number;
  maxWorkers?: number;
  isActive: boolean;
}

export interface PlatformStats {
  totalOrganizations: number;
  totalUsers: number;
  totalFarms: number;
  activeSubscriptions: number;
  systemHealth: 'healthy' | 'degraded' | 'down';
}
