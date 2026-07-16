> **⚠️ SUPERSEDED** — This document has been merged into [ARCHITECTURE.md](./ARCHITECTURE.md).  
> Content below is kept for historical reference but may be outdated.

# Farm Management System — Platform Console Architecture

> Master control panel for the entire Farm Management System infrastructure.
> Sole ICT manager authority over all admin, web, and mobile endpoints.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Database Schema (New Models)](#3-database-schema-new-models)
4. [Backend: Platform Service](#4-backend-platform-service)
5. [Frontend: Console App](#5-frontend-console-app)
6. [Feature Flags System](#6-feature-flags-system)
7. [Subscription & Billing Management](#7-subscription--billing-management)
8. [Audit Logging & Monitoring](#8-audit-logging--monitoring)
9. [API Endpoints Reference](#9-api-endpoints-reference)
10. [Security Model](#10-security-model)
11. [Step-by-Step Implementation Plan](#11-step-by-step-implementation-plan)
12. [Todo Checklist](#12-todo-checklist)

---

## 1. Overview

### What the Console Is

A **separate Next.js application** (`apps/console`) that serves as the
single point of control for the entire platform. It sits **above** the
admin, web, and mobile apps and has unrestricted access to every
resource across all organizations.

### Who Uses It

- **Platform Owner / ICT Manager** — full god-level access
- **Support Admin** — read-only access for troubleshooting

### What It Controls

| Area | Scope |
|------|-------|
| **User Management** | All users across all apps (admin, web, mobile) |
| **Organization Management** | Create, suspend, delete, configure any org |
| **Subscription Management** | Plans, billing, trial periods, limits |
| **Feature Flags** | Enable/disable any module globally or per-org |
| **Infrastructure** | Service health, logs, database access |
| **Security** | Force-logout, impersonation, audit trail |
| **Announcements** | System-wide broadcasts to all orgs |

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PLATFORM CONSOLE                         │
│                    (apps/console)                            │
│  Next.js App — Port 3004                                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 PLATFORM SERVICE                            │
│           (services/platform-service)                       │
│  NestJS — Port 4020                                         │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Users    │ │ Orgs     │ │ Subs     │ │ Feature Flags │  │
│  │ Module   │ │ Module   │ │ Module   │ │ Module        │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Audit    │ │ Health   │ │ Broadcast│ │ Config        │  │
│  │ Module   │ │ Module   │ │ Module   │ │ Module        │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Postgres │ │ Redis    │ │ All      │
        │ Database │ │ Cache    │ │ Services │
        └──────────┘ └──────────┘ └──────────┘
```

### Why a Separate Service

1. **Security isolation** — console auth bypasses tenant RLS
2. **Independent deployment** — console updates don't affect tenant apps
3. **Direct DB access** — raw queries without tenant filtering
4. **Special middleware** — platform-admin-only guards

---

## 3. Database Schema (New Models)

### 3.1 FeatureFlag

```prisma
model FeatureFlag {
  id            String   @id @default(uuid())
  key           String   @unique           // e.g. "poultry.enabled"
  name          String                     // Display name
  description   String?
  category      String   @default("core") // core, module, integration
  defaultValue  Boolean  @default(true)   // Global default
  isEnabled     Boolean  @default(true)   // Global override
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  orgOverrides  FeatureFlagOverride[]
}
```

### 3.2 FeatureFlagOverride

```prisma
model FeatureFlagOverride {
  id              String      @id @default(uuid())
  featureFlagId   String
  organizationId  String
  isEnabled       Boolean
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  featureFlag     FeatureFlag @relation(fields: [featureFlagId], references: [id], onDelete: Cascade)
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([featureFlagId, organizationId])
  @@index([organizationId])
}
```

### 3.3 SubscriptionPlan

```prisma
model SubscriptionPlan {
  id            String   @id @default(uuid())
  name          String   @unique           // FREE, BASIC, PRO, ENTERPRISE
  displayName   String                     // "Free Plan", "Pro Plan"
  description   String?
  price         Decimal  @default(0)
  currency      String   @default("USD")
  billingCycle  String   @default("MONTHLY") // MONTHLY, YEARLY, NONE
  maxUsers      Int      @default(5)
  maxFarms      Int      @default(1)
  maxStorage    Int      @default(100)      // MB
  features      Json     @default("[]")     // Array of feature keys included
  isActive      Boolean  @default(true)
  sortOrder     Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  organizations Organization[]
}
```

### 3.4 AuditLog (Extend Existing)

```prisma
// Add to existing AuditLog model:
// action     String    // e.g. "user.login", "org.suspend", "feature.toggle"
// resource   String    // e.g. "User", "Organization", "FeatureFlag"
// resourceId String?
// oldValues  Json?
// newValues  Json?
// ipAddress  String?
// userAgent  String?
```

### 3.5 PlatformConfig

```prisma
model PlatformConfig {
  id          String   @id @default(uuid())
  key         String   @unique
  value       Json
  description String?
  category    String   @default("general") // general, email, push, security
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 3.6 SystemHealth

```prisma
model SystemHealth {
  id          String   @id @default(uuid())
  serviceName String                     // "auth-service", "hr-service", etc.
  status      String   @default("healthy") // healthy, degraded, down
  uptime      Int      @default(0)        // seconds
  memoryUsage Json?                       // { heapUsed, heapTotal, rss }
  lastCheck   DateTime @default(now())
  metadata    Json?

  @@unique([serviceName])
  @@index([status])
  @@index([lastCheck])
}
```

### 3.7 Broadcast

```prisma
model Broadcast {
  id          String   @id @default(uuid())
  title       String
  message     String
  type        String   @default("INFO") // INFO, WARNING, CRITICAL, MAINTENANCE
  targetOrgs  String[] @default([])     // Empty = all orgs
  isActive    Boolean  @default(true)
  startsAt    DateTime @default(now())
  expiresAt   DateTime?
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([isActive])
  @@index([startsAt])
}
```

### 3.8 UserSession (for cross-app tracking)

```prisma
model UserSession {
  id          String   @id @default(uuid())
  userId      String
  app         String                     // "admin", "web", "mobile"
  deviceInfo  Json?
  ipAddress   String?
  isActive    Boolean  @default(true)
  loginAt     DateTime @default(now())
  lastActive  DateTime @default(now())
  logoutAt    DateTime?

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([app])
  @@index([isActive])
}
```

### 3.9 Add Relations to Organization

```prisma
// Add to existing Organization model:
// subscriptionPlanId  String?
// subscriptionPlan    SubscriptionPlan? @relation(fields: [subscriptionPlanId], references: [id])
// featureOverrides    FeatureFlagOverride[]
// broadcasts          Broadcast[]
// sessions            UserSession[]  (via User)
```

---

## 4. Backend: Platform Service

### 4.1 Service Structure

```
services/platform-service/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── guards/
│   │   │   │   └── platform-admin.guard.ts
│   │   │   └── strategies/
│   │   │       └── platform-jwt.strategy.ts
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   └── users.service.ts
│   │   ├── organizations/
│   │   │   ├── organizations.module.ts
│   │   │   ├── organizations.controller.ts
│   │   │   └── organizations.service.ts
│   │   ├── subscriptions/
│   │   │   ├── subscriptions.module.ts
│   │   │   ├── subscriptions.controller.ts
│   │   │   └── subscriptions.service.ts
│   │   ├── features/
│   │   │   ├── features.module.ts
│   │   │   ├── features.controller.ts
│   │   │   └── features.service.ts
│   │   ├── audit/
│   │   │   ├── audit.module.ts
│   │   │   ├── audit.controller.ts
│   │   │   └── audit.service.ts
│   │   ├── health/
│   │   │   ├── health.module.ts
│   │   │   ├── health.controller.ts
│   │   │   └── health.service.ts
│   │   ├── broadcasts/
│   │   │   ├── broadcasts.module.ts
│   │   │   ├── broadcasts.controller.ts
│   │   │   └── broadcasts.service.ts
│   │   └── config/
│   │       ├── config.module.ts
│   │       ├── config.controller.ts
│   │       └── config.service.ts
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── platform-admin.decorator.ts
│   │   ├── interceptors/
│   │   │   └── audit.interceptor.ts
│   │   └── middleware/
│   │       └── platform-auth.middleware.ts
│   └── prisma/
│       └── prisma.service.ts
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

### 4.2 Key Guards

#### Platform Admin Guard

```typescript
// guards/platform-admin.guard.ts
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Only SUPER_ADMIN and SUPPORT_ADMIN can access console
    if (!['SUPER_ADMIN', 'SUPPORT_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Platform admin access required');
    }
    return true;
  }
}
```

#### Feature Flag Guard

```typescript
// guards/feature-flag.guard.ts
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(private features: FeaturesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const orgId = request.user?.organizationId;
    const featureKey = this.getFeatureKey(context);

    if (orgId) {
      return this.features.isEnabledForOrg(featureKey, orgId);
    }
    return this.features.isEnabledGlobally(featureKey);
  }
}
```

### 4.3 Key Services

#### Features Service

```typescript
@Injectable()
export class FeaturesService {
  async isEnabledGlobally(key: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    return flag?.isEnabled ?? false;
  }

  async isEnabledForOrg(key: string, orgId: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key },
      include: { orgOverrides: { where: { organizationId: orgId } } },
    });
    if (!flag) return false;
    if (flag.orgOverrides.length > 0) {
      return flag.orgOverrides[0].isEnabled;
    }
    return flag.isEnabled;
  }

  async toggleGlobal(key: string, enabled: boolean): Promise<void> {
    await this.prisma.featureFlag.update({
      where: { key },
      data: { isEnabled: enabled },
    });
  }

  async setOrgOverride(key: string, orgId: string, enabled: boolean): Promise<void> {
    await this.prisma.featureFlagOverride.upsert({
      where: { featureFlagId_organizationId: { featureFlagId: flagId, organizationId: orgId } },
      update: { isEnabled: enabled },
      create: { featureFlagId: flagId, organizationId: orgId, isEnabled: enabled },
    });
  }
}
```

#### Organizations Service

```typescript
@Injectable()
export class OrganizationsService {
  async suspendOrg(orgId: string, reason: string): Promise<void> {
    await this.prisma.organization.update({
      where: { id: orgId },
      data: { subscriptionStatus: 'SUSPENDED' },
    });
    // Revoke all active sessions for this org
    await this.prisma.userSession.updateMany({
      where: { user: { organizationId: orgId } },
      data: { isActive: false, logoutAt: new Date() },
    });
  }

  async impersonateUser(platformAdminId: string, targetUserId: string): Promise<string> {
    // Generate impersonation JWT
    const token = this.jwtService.sign({
      impersonatorId: platformAdminId,
      userId: targetUserId,
      isImpersonation: true,
    });
    return token;
  }

  async getOrgStats(orgId: string) {
    const [userCount, farmCount, storageUsed] = await Promise.all([
      this.prisma.user.count({ where: { organizationId: orgId } }),
      this.prisma.farm.count({ where: { organizationId: orgId } }),
      this.prisma.$queryRaw`SELECT pg_database_size(current_database()) as size`,
    ]);
    return { userCount, farmCount, storageUsed };
  }
}
```

---

## 5. Frontend: Console App

### 5.1 App Structure

```
apps/console/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout with providers
│   │   ├── page.tsx                      # Redirects to /dashboard
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx              # Console login (separate from admin)
│   │   │   └── layout.tsx
│   │   └── (platform)/
│   │       ├── layout.tsx                # Platform admin layout with sidebar
│   │       ├── dashboard/
│   │       │   └── page.tsx              # Overview: stats, health, alerts
│   │       ├── users/
│   │       │   ├── page.tsx              # All users across all orgs
│   │       │   └── [userId]/
│   │       │       └── page.tsx          # User detail, impersonate, session mgmt
│   │       ├── organizations/
│   │       │   ├── page.tsx              # All organizations list
│   │       │   └── [orgId]/
│   │       │       ├── page.tsx          # Org detail, stats, config
│   │       │       └── members/
│   │       │           └── page.tsx      # Org members management
│   │       ├── subscriptions/
│   │       │   ├── page.tsx              # Plan management
│   │       │   ├── plans/
│   │       │   │   └── page.tsx          # Create/edit plans
│   │       │   └── billing/
│   │       │       └── page.tsx          # Billing overview
│   │       ├── features/
│   │       │   ├── page.tsx              # Global feature flags
│   │       │   └── [flagId]/
│   │       │       └── page.tsx          # Flag detail + org overrides
│   │       ├── audit/
│   │       │   └── page.tsx              # Audit log viewer
│   │       ├── health/
│   │       │   └── page.tsx              # Service health dashboard
│   │       ├── broadcasts/
│   │       │   ├── page.tsx              # Create/manage broadcasts
│   │       │   └── [id]/
│   │       │       └── page.tsx          # Broadcast detail
│   │       └── settings/
│   │           └── page.tsx              # Platform-wide settings
│   ├── components/
│   │   ├── layout/
│   │   │   ├── ConsoleSidebar.tsx
│   │   │   ├── ConsoleHeader.tsx
│   │   │   └── ConsoleLayout.tsx
│   │   ├── dashboard/
│   │   │   ├── StatsCards.tsx
│   │   │   ├── ServiceHealthGrid.tsx
│   │   │   ├── RecentActivity.tsx
│   │   │   └── AlertBanner.tsx
│   │   ├── users/
│   │   │   ├── UserTable.tsx
│   │   │   ├── UserDetail.tsx
│   │   │   └── ImpersonateButton.tsx
│   │   ├── organizations/
│   │   │   ├── OrgTable.tsx
│   │   │   ├── OrgDetail.tsx
│   │   │   └── OrgStats.tsx
│   │   ├── subscriptions/
│   │   │   ├── PlanCard.tsx
│   │   │   ├── PlanForm.tsx
│   │   │   └── BillingTable.tsx
│   │   ├── features/
│   │   │   ├── FeatureToggle.tsx
│   │   │   ├── FeatureTable.tsx
│   │   │   └── OrgOverridePanel.tsx
│   │   └── ui/
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Dialog.tsx
│   │       ├── Input.tsx
│   │       ├── Label.tsx
│   │       ├── Select.tsx
│   │       ├── Switch.tsx
│   │       └── Table.tsx
│   ├── hooks/
│   │   ├── usePlatformStats.ts
│   │   ├── useFeatureFlags.ts
│   │   ├── useOrganizations.ts
│   │   └── useAuditLog.ts
│   ├── lib/
│   │   ├── api.ts                        # Console API client
│   │   ├── auth.tsx                      # Console auth context
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── public/
├── package.json
├── tsconfig.json
└── next.config.js
```

### 5.2 Console Sidebar Navigation

```typescript
const CONSOLE_NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Users', href: '/users', icon: 'Users' },
  { label: 'Organizations', href: '/organizations', icon: 'Building2' },
  { divider: true },
  { label: 'Subscriptions', href: '/subscriptions', icon: 'CreditCard' },
  { label: 'Feature Flags', href: '/features', icon: 'ToggleLeft' },
  { divider: true },
  { label: 'Audit Log', href: '/audit', icon: 'ScrollText' },
  { label: 'Health', href: '/health', icon: 'Activity' },
  { label: 'Broadcasts', href: '/broadcasts', icon: 'Megaphone' },
  { divider: true },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
];
```

### 5.3 Console Login Flow

```
1. User visits console.farmapp.com (or localhost:3004)
2. Redirected to /login (console-specific login page)
3. Only SUPER_ADMIN and SUPPORT_ADMIN roles allowed
4. On success:
   - Store console JWT in httpOnly cookie (not shared with admin/web/mobile)
   - Redirect to /dashboard
5. Console JWT contains: { userId, role, isPlatformAdmin: true }
```

---

## 6. Feature Flags System

### 6.1 Default Feature Flags

```typescript
const DEFAULT_FEATURE_FLAGS = [
  // Core modules
  { key: 'farm.enabled', name: 'Farm Management', category: 'module' },
  { key: 'crop.enabled', name: 'Crop Management', category: 'module' },
  { key: 'livestock.enabled', name: 'Livestock Management', category: 'module' },
  { key: 'poultry.enabled', name: 'Poultry Management', category: 'module' },
  { key: 'inventory.enabled', name: 'Inventory Management', category: 'module' },
  { key: 'finance.enabled', name: 'Finance Management', category: 'module' },
  { key: 'worker.enabled', name: 'Worker Management', category: 'module' },
  { key: 'task.enabled', name: 'Task Management', category: 'module' },
  { key: 'leave.enabled', name: 'Leave Management', category: 'module' },
  { key: 'roster.enabled', name: 'Roster Management', category: 'module' },
  { key: 'messaging.enabled', name: 'Internal Messaging', category: 'module' },
  { key: 'correspondence.enabled', name: 'Correspondence', category: 'module' },
  { key: 'reporting.enabled', name: 'Reporting & Analytics', category: 'module' },
  { key: 'notification.enabled', name: 'Notifications', category: 'module' },

  // Platform features
  { key: 'platform.mobile_access', name: 'Mobile App Access', category: 'platform' },
  { key: 'platform.web_access', name: 'Web App Access', category: 'platform' },
  { key: 'platform.admin_access', name: 'Admin App Access', category: 'platform' },
  { key: 'platform.api_access', name: 'API Access', category: 'platform' },

  // Integrations
  { key: 'integration.email', name: 'Email Notifications', category: 'integration' },
  { key: 'integration.push', name: 'Push Notifications', category: 'integration' },
  { key: 'integration.sms', name: 'SMS Notifications', category: 'integration' },
];
```

### 6.2 How Feature Flags Work

```
Request → Check user org → Look up feature flag
  → If org override exists → Use override value
  → Else → Use global value
  → If enabled → Allow request
  → If disabled → Return 403 "Feature not available for your plan"
```

### 6.3 Feature Flag Usage in Other Services

```typescript
// In any service (e.g., hr-service):
import { PrismaClient } from '@farm/database';

@Injectable()
export class LeaveService {
  constructor(private prisma: PrismaClient) {}

  async createLeaveRequest(orgId: string, data: CreateLeaveDto) {
    // Check if leave module is enabled for this org
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key: 'leave.enabled' },
      include: { orgOverrides: { where: { organizationId: orgId } } },
    });

    const isEnabled = flag?.orgOverrides.length > 0
      ? flag.orgOverrides[0].isEnabled
      : flag?.isEnabled ?? false;

    if (!isEnabled) {
      throw new ForbiddenException('Leave management is not enabled for your organization');
    }

    // Proceed with leave creation...
  }
}
```

---

## 7. Subscription & Billing Management

### 7.1 Subscription Plans

| Plan | Users | Farms | Storage | Features |
|------|-------|-------|---------|----------|
| **FREE** | 3 | 1 | 100MB | farm, crop, basic reporting |
| **BASIC** | 10 | 3 | 500MB | + livestock, inventory, messaging |
| **PRO** | 50 | 20 | 5GB | + finance, worker, task, leave, roster |
| **ENTERPRISE** | Unlimited | Unlimited | 50GB | + correspondence, reporting, API, priority support |

### 7.2 Subscription States

```
TRIAL → ACTIVE → PAST_DUE → SUSPENDED
  ↓                              ↓
  └──── CANCELLED ←──────────────┘
```

### 7.3 How Subscription Enforces Limits

```typescript
// In any service that checks limits:
@Injectable()
export class SubscriptionGuard {
  async checkLimit(orgId: string, resource: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { subscriptionPlan: true },
    });

    if (org.subscriptionStatus === 'SUSPENDED') {
      throw new ForbiddenException('Organization subscription is suspended');
    }

    const plan = org.subscriptionPlan;
    if (!plan) {
      throw new ForbiddenException('No subscription plan assigned');
    }

    // Check specific limits
    switch (resource) {
      case 'users':
        const userCount = await this.prisma.user.count({ where: { organizationId: orgId } });
        if (userCount >= plan.maxUsers) {
          throw new ForbiddenException(`User limit reached (${plan.maxUsers})`);
        }
        break;
      case 'farms':
        const farmCount = await this.prisma.farm.count({ where: { organizationId: orgId } });
        if (farmCount >= plan.maxFarms) {
          throw new ForbiddenException(`Farm limit reached (${plan.maxFarms})`);
        }
        break;
    }
  }
}
```

---

## 8. Audit Logging & Monitoring

### 8.1 What Gets Logged

| Action | Details |
|--------|---------|
| **Auth events** | login, logout, failed login, password change |
| **User management** | create, update, delete, impersonate, force-logout |
| **Organization management** | create, suspend, activate, delete, update settings |
| **Subscription changes** | plan change, status change, limit override |
| **Feature flag changes** | toggle global, set org override |
| **Broadcasts** | create, update, delete |
| **System config** | update platform settings |

### 8.2 Audit Log Structure

```typescript
interface AuditLogEntry {
  id: string;
  timestamp: Date;
  actorId: string;          // Who did it
  actorEmail: string;
  actorRole: string;        // SUPER_ADMIN, SUPPORT_ADMIN
  action: string;           // "org.suspend", "feature.toggle"
  resource: string;         // "Organization", "FeatureFlag"
  resourceId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}
```

### 8.3 Health Monitoring

The console pings each service every 30 seconds:

```typescript
const SERVICES = [
  { name: 'auth-service', url: 'http://localhost:4001/health' },
  { name: 'hr-service', url: 'http://localhost:4012/health' },
  { name: 'farm-service', url: 'http://localhost:4002/health' },
  { name: 'worker-service', url: 'http://localhost:4007/health' },
  { name: 'notification-service', url: 'http://localhost:4005/health' },
  { name: 'api-gateway', url: 'http://localhost:4000/health' },
  { name: 'database', url: 'internal' },  // Direct Prisma query
  { name: 'redis', url: 'internal' },
];
```

---

## 9. API Endpoints Reference

### 9.1 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/platform/auth/login` | Console login |
| POST | `/api/platform/auth/logout` | Console logout |
| GET | `/api/platform/auth/me` | Get current platform admin |

### 9.2 Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/platform/users` | List all users (with search, filter, pagination) |
| GET | `/api/platform/users/:id` | Get user detail |
| PATCH | `/api/platform/users/:id` | Update user |
| DELETE | `/api/platform/users/:id` | Deactivate user |
| POST | `/api/platform/users/:id/impersonate` | Impersonate user |
| POST | `/api/platform/users/:id/force-logout` | Force logout all sessions |
| GET | `/api/platform/users/:id/sessions` | Get user sessions |

### 9.3 Organizations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/platform/organizations` | List all organizations |
| GET | `/api/platform/organizations/:id` | Get org detail |
| POST | `/api/platform/organizations` | Create organization |
| PATCH | `/api/platform/organizations/:id` | Update organization |
| DELETE | `/api/platform/organizations/:id` | Delete organization |
| POST | `/api/platform/organizations/:id/suspend` | Suspend org |
| POST | `/api/platform/organizations/:id/activate` | Activate org |
| GET | `/api/platform/organizations/:id/members` | Get org members |
| GET | `/api/platform/organizations/:id/stats` | Get org statistics |

### 9.4 Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/platform/subscriptions/plans` | List all plans |
| POST | `/api/platform/subscriptions/plans` | Create plan |
| PATCH | `/api/platform/subscriptions/plans/:id` | Update plan |
| DELETE | `/api/platform/subscriptions/plans/:id` | Delete plan |
| PATCH | `/api/platform/organizations/:id/subscription` | Assign plan to org |

### 9.5 Feature Flags

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/platform/features` | List all feature flags |
| PATCH | `/api/platform/features/:id` | Toggle global flag |
| GET | `/api/platform/features/:id/overrides` | Get org overrides |
| POST | `/api/platform/features/:id/overrides` | Set org override |
| DELETE | `/api/platform/features/:id/overrides/:orgId` | Remove org override |

### 9.6 Audit Log

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/platform/audit` | List audit logs (with filters) |
| GET | `/api/platform/audit/:id` | Get audit entry detail |

### 9.7 Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/platform/health` | Get all service health |
| POST | `/api/platform/health/check` | Trigger health check |

### 9.8 Broadcasts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/platform/broadcasts` | List broadcasts |
| POST | `/api/platform/broadcasts` | Create broadcast |
| PATCH | `/api/platform/broadcasts/:id` | Update broadcast |
| DELETE | `/api/platform/broadcasts/:id` | Delete broadcast |

### 9.9 Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/platform/settings` | Get all platform settings |
| PATCH | `/api/platform/settings` | Update platform settings |

---

## 10. Security Model

### 10.1 Authentication

- Console has **separate JWT secret** (`PLATFORM_JWT_SECRET`)
- Console tokens contain `isPlatformAdmin: true`
- Tokens are stored in httpOnly cookies (not accessible to JS)
- Short-lived access tokens (15 min) + long-lived refresh tokens (7 days)

### 10.2 Authorization

```
SUPER_ADMIN   → Full access to everything
SUPPORT_ADMIN → Read-only access (no mutations)
```

### 10.3 Impersonation

```
1. Platform admin clicks "Impersonate" on a user
2. Console generates impersonation token
3. Opens new tab with target app + impersonation token
4. All actions are logged as "impersonated by {admin}"
5. Impersonation session ends when admin clicks "Stop Impersonation"
```

### 10.4 Rate Limiting

- Console API: 100 requests/minute per admin
- Impersonation: 5 concurrent sessions per admin
- Feature flag changes: 10/minute

### 10.5 IP Whitelisting (Optional)

- Console access can be restricted to specific IPs
- Configured in platform settings

---

## 11. Step-by-Step Implementation Plan

### Phase 1: Database & Core Backend (Week 1-2)

- [x] Add new Prisma models (FeatureFlag, FeatureFlagOverride, SubscriptionPlan, PlatformConfig, SystemHealth, Broadcast, UserSession)
- [x] Create platform-service NestJS project
- [x] Implement auth module with platform-admin guard
- [x] Implement users module (list, detail, impersonate, force-logout)
- [x] Implement organizations module (CRUD, suspend, activate, stats)
- [x] Run database migration

### Phase 2: Feature Flags & Subscriptions (Week 3)

- [x] Implement features module (CRUD, toggles, overrides)
- [x] Implement subscriptions module (plans CRUD, assignment)
- [x] Seed default feature flags
- [x] Seed default subscription plans
- [x] Create subscription guard for tenant services
- [x] Add feature flag middleware to existing services

### Phase 3: Console Frontend (Week 4-5)

- [x] Create Next.js console app
- [x] Build console login page
- [x] Build ConsoleLayout with sidebar
- [x] Build dashboard page
- [x] Build users management page
- [x] Build organizations management page
- [x] Build subscriptions management page
- [x] Build feature flags management page
- [x] Build audit log page
- [x] Build health dashboard
- [x] Build broadcasts page

### Phase 4: Audit & Monitoring (Week 6)

- [x] Implement audit module with interceptor
- [x] Implement health module with service pings
- [x] Build audit log viewer
- [x] Build health dashboard
- [x] Add broadcast system

### Phase 5: Integration & Testing (Week 7)

- [x] Add feature flag checks to all tenant services
- [x] Add subscription limit checks to all tenant services
- [x] Test impersonation flow end-to-end
- [x] Test feature flag toggle effects
- [x] Test subscription limit enforcement

### Phase 6: Polish & Deploy (Week 8)

- [x] Add IP whitelisting
- [x] Add rate limiting
- [x] Add console-specific CSP headers
- [x] Deploy to production
- [x] Document admin procedures

---

## 12. Todo Checklist

### Database
- [x] Add FeatureFlag model to schema.prisma
- [x] Add FeatureFlagOverride model to schema.prisma
- [x] Add SubscriptionPlan model to schema.prisma
- [x] Add PlatformConfig model to schema.prisma
- [x] Add SystemHealth model to schema.prisma
- [x] Add Broadcast model to schema.prisma
- [x] Add UserSession model to schema.prisma
- [x] Add relations to Organization model
- [x] Add relations to User model
- [x] Run prisma migrate
- [x] Seed default feature flags
- [x] Seed default subscription plans

### Backend (Platform Service)
- [x] Create platform-service project structure
- [x] Implement prisma.service.ts
- [x] Implement auth module (login, logout, me)
- [x] Implement platform-admin.guard.ts
- [x] Implement users module
- [x] Implement organizations module
- [x] Implement features module
- [x] Implement subscriptions module
- [x] Implement audit module
- [x] Implement health module
- [x] Implement broadcasts module
- [x] Implement config module
- [x] Add audit interceptor to all mutations
- [ ] Add CORS config for console origin

### Frontend (Console App)
- [x] Create console Next.js project
- [x] Implement console login page
- [x] Implement ConsoleLayout with sidebar
- [x] Implement dashboard page
- [x] Implement users page
- [x] Implement organizations page
- [x] Implement subscriptions page
- [x] Implement feature flags page
- [x] Implement audit log page
- [x] Implement health page
- [x] Implement broadcasts page
- [ ] Implement settings page

### Integration
- [x] Add feature flag checks to hr-service
- [x] Add feature flag checks to worker-service
- [x] Add feature flag checks to farm-service
- [x] Add feature flag checks to inventory-service
- [x] Add feature flag checks to finance-service
- [x] Add feature flag checks to livestock-service
- [x] Add feature flag checks to poultry-service
- [x] Add feature flag checks to crop-service
- [x] Add feature flag checks to reporting-service
- [x] Add subscription guard to auth-service
- [x] Add subscription guard to farm-service
- [ ] Add UserSession tracking to all services
- [x] Add audit logging to all platform mutations

### Security
- [x] Create PLATFORM_JWT_SECRET env var
- [x] Configure console-specific CORS
- [x] Add rate limiting to console API
- [x] Add IP whitelisting (optional)
- [x] Add CSP headers
- [x] Test impersonation flow
- [x] Test force-logout flow

### Testing
- [x] Unit tests for feature flag service
- [x] Unit tests for subscription service
- [x] Integration tests for impersonation
- [x] Integration tests for feature flag toggling
- [x] E2E tests for console login flow
- [x] E2E tests for org suspension

---

*Document created: July 1, 2026*
*Last updated: July 1, 2026*
