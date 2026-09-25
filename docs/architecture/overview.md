# Architecture

Single source of truth for the Farm Management System architecture.

## Overview

The Farm Management System is a multi-tenant SaaS platform built with a **modular monolith** architecture. An API Gateway serves as the single entry point, routing requests to a unified App Server (modular monolith) that contains all domain modules sharing a PostgreSQL database.

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Apps                         │
│  ┌──────┐  ┌──────┐  ┌─────────┐  ┌──────────────────┐ │
│  │ Web  │  │Admin │  │Console  │  │Mobile (Expo Go)  │ │
│  │:4004 │  │:4001 │  │:3004    │  │:8082              │ │
│  └──┬───┘  └──┬───┘  └──┬──────┘  └───────┬──────────┘ │
│     │ cookies │ cookies │ cookies         │ Bearer     │
└─────┼─────────┼─────────┼─────────────────┼────────────┘
      │         │         │                 │
┌─────▼─────────▼─────────▼─────────────────▼────────────┐
│                  API Gateway :4000                       │
│         JWT Auth · CORS · WebSocket · Routing           │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│              App Server (Modular Monolith) :4001         │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Auth  │  Farm  │  Crop  │  Livestock  │  Poultry  │  │
│  │  Finance  │  HR  │  Org  │  Notification │  Reporting│  │
│  │  Platform  │  Realtime  │  Worker  │  Inventory │  │
│  └────────────────────────────────────────────────────┘  │
│           All modules share Prisma + PostgreSQL          │
└─────────────────────────────┬────────────────────────────┘
                              │
                     ┌────────▼────────┐
                     │  PostgreSQL     │
                     │  :5432          │
                     │  (42 models)    │
                     └─────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Monorepo** | npm 11.10.0 workspaces (two independent workspace roots) |
| **Backend** | NestJS 11.x (API Gateway + App Server) |
| **Frontend** | Next.js 15.1.7 + React 19 (web/admin/console) |
| **Mobile** | Expo SDK 54 + React Native 0.81.5 |
| **Database** | PostgreSQL 16 + Prisma 6.19.3 |
| **Connection Pooling** | PgBouncer 1.23.1 (transaction mode) / Neon pooler |
| **Auth** | JWT (jsonwebtoken) + bcryptjs + TOTP (otplib) |
| **Validation** | Zod |
| **Real-time** | Socket.IO (NestJS WebSockets) |
| **Push Notifications** | Firebase Admin SDK |
| **Email** | Nodemailer |
| **Testing** | Vitest (admin), Jest (services, mobile) |
| **Deployment** | Render.com (production), Docker Compose (local) |

## Monorepo Structure

The project uses **independent install roots** within a single repository: one backend workspace and two standalone frontend apps:

```
FMS/
├── package.json              # Root: orchestration scripts only (no workspaces)
├── farm-client/              # Frontend root (orchestrator package.json, no workspaces)
│   ├── package.json          # Delegates to admin/ and console/ via npm --prefix
│   ├── admin/                # Standalone npm project — own lockfile & node_modules
│   │   ├── src/              # Farm owner/manager dashboard (Next.js, port 4003)
│   │   └── packages/         # Bundled: api-client, auth, hooks, types, ui, validation
│   ├── console/              # Standalone npm project — own lockfile & node_modules
│   │   ├── src/              # Platform admin console (Next.js, port 4002)
│   │   └── packages/         # Bundled: api-client, auth, types, ui
│   ├── mobile/               # Mobile app (Expo SDK 54, port 8082) — fully standalone
│   │   └── packages/ui-native/  # Shared React Native components (not yet imported)
├── farm-server/              # Backend workspace root
│   ├── package.json          # Workspaces: app-server, packages/server/*
│   ├── app-server/           # Modular monolith (NestJS, port 4000)
│   └── packages/server/      # Server shared libraries
│       ├── auth/             # JWT, guards, decorators
│       ├── database/         # Prisma schema + client + RLS
│       ├── domain-core/      # DDD base classes (Entity, VO, Event)
│       ├── env/              # Environment config loader
│       ├── types/            # Server TypeScript types
│       ├── utils/            # Utility functions
│       └── validation/       # Server Zod schemas
├── infra/                    # Infrastructure (Docker, etc.)
├── scripts/                  # Build/start orchestration
└── docs/                     # Documentation
```

### Key Design Decision: Independent Install Roots

The frontend and backend are **completely independent** — zero cross-dependencies:
- `farm-client/admin` and `farm-client/console` are separate npm projects with their own lockfiles, `node_modules`, and private `packages/` (api-client, auth, types, ui are intentionally duplicated so each app installs/builds alone)
- `farm-client/package.json` is a thin orchestrator (`npm --prefix admin|console run …`) with no workspaces
- `farm-server/` has its own workspaces for app-server and server packages
- Each root can be installed, built, and deployed independently (each Render service `rootDir`s into a single app)
- Shared concepts (types, auth, validation) have separate implementations on each side

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
| `/farms` | farm-service:4002 | Yes | No |
| `/fields` | farm-service:4002 | Yes | No |
| `/livestocks` | livestock-service:4003 | Yes | No |
| `/poultry` | poultry-service:4004 | Yes | No |
| `/medications` | poultry-service:4004 | Yes | No |
| `/notifications` | notification-service:4005 | Yes | No |
| `/finance` | finance-service:4006 | Yes | No |
| `/workers` | worker-service:4007 | Yes | No |
| `/tasks` | worker-service:4007 | Yes | No |
| `/attendance` | worker-service:4007 | Yes | No |
| `/roster` | worker-service:4007 | Yes | No |
| `/messages` | worker-service:4007 | Yes | No |
| `/reports` | reporting-service:4008 | Yes | No |
| `/organizations` | organization-service:4009 | Yes | No |
| `/correspondence` | hr-service:4012 | Yes | No |
| `/shift-assignments` | hr-service:4012 | Yes | No |
| `/permissions` | auth-service:4001 | Yes | No |
| `/admin` | auth-service:4001 | Yes | No |
| `/org-admin` | auth-service:4001 | Yes | No |
| `/api-keys` | auth-service:4001 | Yes | No |
| `/platform-roles` | auth-service:4001 | Yes | No |
| `/platform-permissions` | auth-service:4001 | Yes | No |
| `/platform-api-keys` | auth-service:4001 | Yes | No |
| `/api` | platform-service:4020 | Yes | No |

### CORS Configuration

- Allowed origins: localhost ports 3000-3010, 8081-8082
- Credentials: `true`
- Exposed headers: `Set-Cookie`

## Database

### Overview

- **PostgreSQL 16** with **Prisma 6.19.3** ORM
- **42 models** across 11 domains
- **Shared schema** — all services use the same database
- **Connection pooling** via PgBouncer (transaction mode, 200 max clients) or Neon pooler

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

See [DATABASE.md](./database.md) for the full model reference.

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
npm run dev                                         # All services
```

### Production (Render.com)

- Deployed as a single service running all microservices via `concurrently`
- Neon PostgreSQL (hosted) with connection pooler
- Environment variables set in Render dashboard

See [DEPLOYMENT.md](./deployment/guide.md) for details.

---

## Security Architecture

**Application Security**

- JWT authentication
- Role-based access control
- Rate limiting
- Input validation
- SQL injection protection
- CSRF protection

**Data Security**

- Encrypted passwords
- HTTPS enforcement
- Database backups
- Audit logs

---

## CI/CD Pipeline

```
Git Push → GitHub Actions → Lint → Test → Build → Deploy
```

---

## Scalability Strategy

Services can scale independently. Scalable components:

- API services
- Notification workers
- Analytics workers
- Realtime gateways

---

## Development Standards

**Coding Standards**

- TypeScript strict mode
- ESLint
- Prettier
- Conventional commits
- Modular architecture

**Testing Standards**

| Test Type      | Tool       |
| -------------- | ---------- |
| Unit Testing   | Jest       |
| API Testing    | Supertest  |
| E2E Testing    | Playwright |
| Mobile Testing | Jest       |
