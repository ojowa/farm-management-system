/**
 * Platform admin types for the console app.
 * These are distinct from the generic platform types in platform.ts
 * because they match the exact shapes returned by the platform admin API.
 */

export interface PlatformAdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  organizationName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface PlatformAdminRole {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: { permission: { id: string; name: string; category: string } }[];
}

export interface PlatformPermission {
  id: string;
  name: string;
  description: string | null;
  category: string;
}

export interface PlatformOrganization {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
  userCount: number;
  farmCount: number;
  createdAt: string;
}

export interface PlatformSubscriptionPlan {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  price: number;
  currency: string;
  billingCycle: string;
  interval: 'monthly' | 'yearly';
  maxUsers?: number;
  maxFarms?: number;
  maxWorkers?: number;
  maxStorage?: number;
  features: string[];
  organizationCount?: number;
  isActive: boolean;
}

export interface PlatformFeature {
  id: string;
  key: string;
  name: string;
  description?: string;
  category?: string;
  isEnabled: boolean;
  overrideCount?: number;
}

export interface PlatformApiKey {
  id: string;
  keyPrefix: string;
  name: string;
  service?: string;
  isActive: boolean;
  user?: { id: string; firstName: string; lastName: string; email: string };
  lastUsedAt?: string;
  createdAt: string;
}

export interface PlatformConfigItem {
  id: string;
  key: string;
  value: string;
  description?: string;
  category: string | null;
  updatedAt: string;
}

export interface PlatformAuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userName: string;
  userEmail: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  ipAddress?: string;
  createdAt: string;
}

export interface PlatformBroadcast {
  id: string;
  title: string;
  message: string;
  type: string;
  isActive: boolean;
  createdAt: string;
}

export interface PlatformServiceHealth {
  name: string;
  status: string;
  latencyMs?: number;
  uptime?: number;
  lastCheck?: string;
  metadata?: Record<string, unknown>;
}

export interface PlatformHealthSummary {
  total: number;
  healthy: number;
  unhealthy: number;
  totalMs: number;
}

export interface ConsoleDashboardStats {
  totalOrgs: number;
  totalUsers: number;
  activeOrgs: number;
  suspendedOrgs: number;
}

export interface SelectOption {
  value: string;
  label: string;
  id?: string;
}
