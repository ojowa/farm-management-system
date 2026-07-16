# Architecture

Single source of truth for the Farm Management System architecture.

## Overview

The Farm Management System is a multi-tenant SaaS platform built with a microservices architecture following Domain-Driven Design (DDD) principles. An API Gateway serves as the single entry point, routing requests to 13 backend services that share a PostgreSQL database.

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Apps                         │
│  ┌──────┐  ┌──────┐  ┌─────────┐  ┌──────────────────┐ │
│  │ Web  │  │Admin │  │Console  │  │Mobile (Expo Go)  │ │
│  │:3001 │  │:3000 │  │:3004    │  │:8082              │ │
│  └──┬───┘  └──┬───┘  └──┬──────┘  └───────┬──────────┘ │
│     │ cookies │ cookies │ cookies         │ Bearer     │
└─────┼─────────┼─────────┼─────────────────┼────────────┘
      │         │         │                 │
┌─────▼─────────▼─────────▼─────────────────▼────────────┐
│                  API Gateway :4000                       │
│         JWT Auth · CORS · WebSocket · Routing           │
└──────┬──────┬──────┬──────┬──────┬──────┬──────────────┘
       │      │      │      │      │      │
┌──────▼──┐┌──▼───┐┌─▼────┐│┌─────▼──┐┌──▼────────────┐
│  Auth   ││ Farm ││Crop  │││Finance ││Notification    │
│  :4001  ││:4002 ││:4011 │││:4006   ││:4005           │
└─────────┘└──────┘└──────┘│└────────┘└────────────────┘
                            │
┌──────────────┐┌───────────▼┐┌──────────┐┌────────────┐
│  Livestock   ││  Poultry   ││  Worker  ││  HR        │
│  :4003       ││  :4004     ││  :4007   ││  :4012     │
└──────────────┘└────────────┘└──────────┘└────────────┘

┌──────────────┐┌────────────┐┌─────────────────────────┐
│  Reporting   ││  Org       ││  Platform               │
│  :4008       ││  :4009     ││  :4020                  │
└──────────────┘└────────────┘└─────────────────────────┘

                    ┌──────────────┐
                    │  PostgreSQL  │
                    │  :5432       │
                    │  (42 models) │
                    └──────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Monorepo** | Turborepo + pnpm 10.27.0 workspaces |
| **Backend** | NestJS 11.x (platform-service on 10.x) |
| **Frontend** | Next.js 15.1.7 + React 19 (web/admin/console) |
| **Mobile** | Expo SDK 54 + React Native 0.81.5 |
| **Database** | PostgreSQL 16 + Prisma 6.4.1 |
| **Connection Pooling** | PgBouncer 1.23.1 (transaction mode) |
| **Auth** | JWT (jsonwebtoken) + bcryptjs + TOTP (otplib) |
| **Validation** | Zod |
| **Real-time** | Socket.IO (NestJS WebSockets) |
| **Push Notifications** | Firebase Admin SDK |
| **Email** | Nodemailer |
| **Testing** | Vitest (admin, web), Jest (services, mobile) |
| **Deployment** | Render.com (production), Docker Compose (local) |

## Monorepo Structure

```
├── apps/                    # Frontend applications
│   ├── web/                 # Worker-facing (Next.js, port 3001)
│   ├── admin/               # Farm owner/manager dashboard (Next.js, port 3000)
│   ├── console/             # Platform admin console (Next.js, port 3004)
│   └── mobile/              # Mobile app (Expo SDK 54, port 8082)
├── services/                # Backend microservices (NestJS)
│   ├── api-gateway/         # Central gateway (port 4000)
│   ├── auth-service/        # Authentication (port 4001)
│   ├── farm-service/        # Farm management (port 4002)
│   ├── livestock-service/   # Livestock management (port 4003)
│   ├── poultry-service/     # Poultry management (port 4004)
│   ├── notification-service/# Notifications (port 4005)
│   ├── finance-service/     # Finance tracking (port 4006)
│   ├── worker-service/      # Worker management (port 4007)
│   ├── reporting-service/   # Report generation (port 4008)
│   ├── organization-service/# Multi-tenant orgs (port 4009)
│   ├── crop-service/        # Crop lifecycle (port 4011)
│   ├── hr-service/          # HR operations (port 4012)
│   └── platform-service/    # Platform admin (port 4020)
├── packages/                # Shared libraries
│   ├── database/            # Prisma schema + client
│   ├── auth/                # JWT, cookie helpers
│   ├── types/               # TypeScript types
│   ├── validation/          # Zod schemas
│   ├── utils/               # Utility functions
│   ├── domain-core/         # DDD base classes
│   ├── api-client/          # Axios API client
│   ├── ui/                  # Shared React components
│   └── domains/             # 10 bounded context packages
│       ├── identity/        # User, Role, Permission, Organization
│       ├── farm/            # Farm, Field
│       ├── crop/            # Crop, CropCycle, CropStage
│       ├── livestock/       # Livestock, HealthRecord, BreedingRecord
│       ├── poultry/         # Flock, PoultryHouse, Pen
│       ├── finance/         # Expense, Sale, Contract
│       ├── hr/              # Worker, Task, Attendance, Leave
│       ├── notification/    # Notification, DeviceToken
│       ├── reporting/       # Report, ScheduledReport
│       └── platform/        # FeatureFlag, SubscriptionPlan, AuditLog
└── docs/                    # Documentation
```

## Service Map

| Service | Port | Bounded Context | Key Models |
|---------|------|----------------|------------|
| API Gateway | 4000 | — | Routes, WebSocket |
| Auth Service | 4001 | Identity | User, Role, Permission, RefreshToken, ApiKey |
| Farm Service | 4002 | Farm | Farm, Field, Inventory |
| Crop Service | 4011 | Crop | Crop, CropCycle, CropStage, IrrigationSchedule |
| Livestock Service | 4003 | Livestock | Livestock, HealthRecord, BreedingRecord, WeightRecord |
| Poultry Service | 4004 | Poultry | Flock, PoultryHouse, Pen, FeedingRecord |
| Finance Service | 4006 | Finance | Expense, Sale, Budget, Contract, MarketListing |
| Worker Service | 4007 | HR | Worker, Task |
| HR Service | 4012 | HR | Attendance, Leave, Shift, Message, Correspondence |
| Notification Service | 4005 | Notification | Notification, DeviceToken, EmailTemplate |
| Reporting Service | 4008 | Reporting | Report, ScheduledReport |
| Organization Service | 4009 | Identity | Organization, UserOrganization |
| Platform Service | 4020 | Platform | FeatureFlag, SubscriptionPlan, SystemHealth, Broadcast |

## Authentication & Authorization

### Token Strategy

| App | Token Storage | Token Sending |
|-----|--------------|---------------|
| Web | httpOnly cookies | `withCredentials: true` |
| Admin | httpOnly cookies | `withCredentials: true` |
| Console | httpOnly cookies | `withCredentials: true` |
| Mobile | AsyncStorage + Redux | `Authorization: Bearer` header |

### Login Flow (Web/Admin/Console)

1. Client sends `POST /auth/login` with `{ email, password }`
2. Auth-service validates credentials via bcrypt
3. Auth-service returns `{ accessToken, refreshToken, user }`
4. **Controller sets httpOnly cookies** (`accessToken`, `refreshToken`)
5. Browser automatically sends cookies on subsequent requests
6. Gateway reads `req.cookies.accessToken`, extracts JWT claims
7. Gateway injects `x-user-id`, `x-user-role`, `x-organization-id` headers
8. Backend service receives request with tenant context

### Login Flow (Mobile)

1. Client sends `POST /auth/login` with `{ email, password }`
2. Auth-service validates and returns tokens in JSON body
3. Mobile stores tokens in AsyncStorage + Redux
4. Axios request interceptor attaches `Authorization: Bearer <accessToken>`
5. On 401, interceptor calls `POST /auth/refresh` with stored refreshToken
6. New tokens stored, original request retried

### JWT Payload

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "role": "FARM_MANAGER",
  "organizationId": "org-id",
  "iat": 1234567890,
  "exp": 1234568790
}
```

### RBAC

8 predefined roles: `SUPER_ADMIN`, `SUPPORT_ADMIN`, `ORG_OWNER`, `FARM_MANAGER`, `ACCOUNT_MANAGER`, `SUPERVISOR`, `VETERINARIAN`, `WORKER`

60+ granular permissions across domains: `farm:read`, `farm:write`, `crop:read`, `finance:write`, etc.

## Domain-Driven Design

### Layer Structure (per service)

```
service/
├── domain/              # Entities, Value Objects, Events, Repository interfaces
├── application/         # Services (use cases), DTOs
├── infrastructure/      # Prisma repositories, external integrations
├── presentation/        # Controllers, filters, guards
└── main.ts              # Bootstrap
```

### Repository Pattern

- Repository providers use string tokens: `{ provide: 'UserRepository', useClass: PrismaUserRepository }`
- Services that `@Inject('UserRepository')` need the `@Inject` decorator on constructor params
- Module-level services (crop, finance) use class-based DI — no `@Inject` needed

### Cross-Context Communication

Services communicate synchronously via HTTP through the API Gateway. The gateway extracts JWT claims and forwards tenant context headers (`x-user-id`, `x-user-role`, `x-organization-id`).

## Multi-Tenancy

### Data Isolation

Every data model (except `Organization`, `Role`, `Permission`) includes an `organizationId` field. All queries are filtered by this field.

### Request Flow

1. Gateway extracts `organizationId` from JWT
2. Gateway sets `x-organization-id` header
3. Service reads header and filters queries by `organizationId`
4. Users can only see data belonging to their organization

### Cross-Organization Access

- `SUPER_ADMIN` and `SUPPORT_ADMIN` can access all organizations
- `ORG_OWNER` can manage their organization's settings
- Other roles are restricted to their organization's data

## API Gateway

### Proxy Middleware

The gateway's `ProxyMiddleware` handles:

1. **Token extraction** — reads from `req.cookies.accessToken` or `Authorization: Bearer` header
2. **JWT verification** — validates token, extracts claims
3. **Header injection** — sets `x-user-id`, `x-user-role`, `x-organization-id`, `x-user-email`
4. **Route matching** — finds target service from route table
5. **Request forwarding** — proxies to backend service
6. **Response forwarding** — copies headers (including `Set-Cookie`) back to client

### Route Table

| Path | Target | Rewrite | Public |
|------|--------|---------|--------|
| `/auth` | auth-service:4001 | No | Yes |
| `/roles` | auth-service:4001 | No | No |
| `/farms` | farm-service:4002 | Yes | No |
| `/livestock` | livestock-service:4003 | Yes | No |
| `/poultry` | poultry-service:4004 | Yes | No |
| `/notifications` | notification-service:4005 | Yes | No |
| `/finance` | finance-service:4006 | Yes | No |
| `/workers` | worker-service:4007 | Yes | No |
| `/reporting` | reporting-service:4008 | Yes | No |
| `/organizations` | organization-service:4009 | Yes | No |
| `/crops` | crop-service:4011 | Yes | No |
| `/tasks` | hr-service:4012 | Yes | No |
| `/attendance` | hr-service:4012 | Yes | No |
| `/leave` | hr-service:4012 | Yes | No |
| `/shifts` | hr-service:4012 | Yes | No |
| `/messages` | hr-service:4012 | Yes | No |
| `/platform` | platform-service:4020 | Yes | No |

### CORS Configuration

- Allowed origins: localhost ports 3000-3010, 8081
- Credentials: `true`
- Exposed headers: `Set-Cookie`

## Database

### Overview

- **PostgreSQL 16** with **Prisma 6.4.1** ORM
- **42 models** across 11 domains
- **Shared schema** — all services use the same database
- **Connection pooling** via PgBouncer (transaction mode, 200 max clients)

### Key Aggregates

| Domain | Models | Key Relationships |
|--------|--------|-------------------|
| Identity | 10 | User → Organization, Role → Permission |
| Farm | 3 | Farm → Field → CropCycle |
| Crop | 7 | CropCycle → CropStage, YieldRecord, IrrigationSchedule |
| Poultry | 8 | Flock → FeedingRecord, VaccinationRecord, MortalityRecord |
| Livestock | 5 | Livestock → HealthRecord, BreedingRecord, WeightRecord |
| Finance | 5 | Expense, Sale, Budget → BudgetCategory, Contract |
| HR | 10 | Worker, Task, Attendance, Leave, Shift, Message |
| Notifications | 3 | Notification, DeviceToken, Document |
| Platform | 6 | FeatureFlag, SubscriptionPlan, SystemHealth, AuditLog |

See [DATABASE.md](./DATABASE.md) for the full model reference.

## Real-time Communication

### Socket.IO Integration

- Gateway creates a Socket.IO server on the same port (4000)
- Notification service connects as a client
- Events broadcast to connected clients per organization

### Event Types

| Event | Direction | Purpose |
|-------|-----------|---------|
| `notification:new` | Server → Client | New notification pushed |
| `notification:read` | Client → Server | Mark notification as read |
| `farm:update` | Server → Client | Farm data changed |
| `task:update` | Server → Client | Task status changed |

## Deployment

### Local Development

```bash
docker compose -f infra/docker-compose.yml up -d   # PostgreSQL + PgBouncer
pnpm dev                # All services
```

### Production (Render.com)

- 15 services deployed via `render.yaml` blueprint
- Neon PostgreSQL (hosted)
- Environment variables set in Render dashboard

See [DEPLOYMENT.md](./DEPLOYMENT.md) for details.
