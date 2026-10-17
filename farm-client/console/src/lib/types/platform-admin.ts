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
  /** End of the current paid period; null for comps / never-checked-out orgs. */
  subscriptionPaidThrough?: string | null;
  /** Live Paystack subscription mirror, when the org has ever checked out. */
  billing?: {
    status: string;
    cancelReason: string | null;
    nextBillingDate: string | null;
    customerEmail: string | null;
  } | null;
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
  features: {
    /** Modules the plan includes (farm, crop, livestock, poultry, ...). */
    modules: string[];
    /** Farm types allowed — derived from `modules` server-side. */
    farmTypes: string[];
    /** Plan benefits that are NOT modules (api_access, priority_support). */
    perks?: string[];
  };
  organizationCount?: number;
  /** Paystack plan code, created lazily on first recurring checkout. */
  paystackPlanCode?: string | null;
  isActive: boolean;
}

export interface PlatformPayment {
  id: string;
  reference: string;
  organizationId: string;
  /** Resolved org name; null when the org was hard-deleted. */
  organizationName?: string | null;
  planId: string | null;
  planName: string;
  kind: string;
  /** Prisma Decimal — JSON-serializes as a string. */
  amount: string | number;
  currency: string;
  status: string;
  channel: string | null;
  paidAt: string | null;
  createdAt: string;
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
  /** Resident set size in bytes, when the probed service reports it. */
  memoryUsage?: number;
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
