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
| **Monorepo** | npm 11.10.0 workspaces |
| **Backend** | NestJS 11.x (API Gateway + App Server) |
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
├── farm client/               # Frontend applications & client packages
│   ├── apps/                  # Frontend apps
│   │   ├── web/               # Worker-facing (Next.js, port 4004)
│   │   ├── admin/             # Farm owner/manager dashboard (Next.js, port 4001)
│   │   ├── console/           # Platform admin console (Next.js, port 3004)
│   │   └── mobile/            # Mobile app (Expo SDK 54, port 8082)
│   └── packages/              # Client shared libraries
│       ├── api-client/        # Axios API client
│       ├── auth/              # Auth types & helpers
│       ├── hooks/             # Shared React hooks
│       ├── types/             # TypeScript types
│       ├── ui/                # Shared React components
│       ├── ui-native/         # Shared React Native components
│       └── validation/        # Zod schemas
├── farm server/               # Backend services & server packages
│   ├── api-gateway/           # Central gateway (port 4000)
│   ├── app-server/            # Modular monolith (port 4001)
│   └── packages/              # Server shared libraries
│       ├── server/auth/       # JWT, guards, decorators
│       ├── server/database/   # Prisma schema + client + RLS
│       ├── server/env/        # Environment config loader
│       ├── server/types/      # Server TypeScript types
│       ├── server/utils/      # Utility functions
│       ├── server/validation/ # Server Zod schemas
│       └── server/domain-core/# DDD base classes (Entity, VO, Event)
├── infra/                     # Infrastructure (Docker, etc.)
└── docs/                      # Documentation
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
npm run dev             # All services
```

### Production (Render.com)

- 16 services deployed via `render.yaml` blueprint
- Neon PostgreSQL (hosted)
- Environment variables set in Render dashboard

See [DEPLOYMENT.md](./DEPLOYMENT.md) for details.

---

## Additional Architecture Details

_Unique content preserved from `docs/architecture/architecture-documentation.md` (1098 lines)._

---

### Security Architecture

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

### Audit Logging

Logged activities:

- User logins
- Record updates
- Inventory changes
- Financial modifications
- Permission changes

---

### Monitoring & Observability

| Area           | Tool       |
| -------------- | ---------- |
| Metrics        | Prometheus |
| Dashboards     | Grafana    |
| Logs           | Loki       |
| Error Tracking | Sentry     |

---

### CI/CD Pipeline

```
Git Push → GitHub Actions → Lint → Test → Build → Docker Image → Deploy
```

---

### Docker Architecture

Containers:

- API Gateway
- Backend Services
- PostgreSQL
- Redis
- Nginx

---

### Production Infrastructure

```
Cloudflare
     |
Load Balancer
     |
Nginx Reverse Proxy
     |
API Gateway
     |
Backend Services
     |
PostgreSQL + Redis
```

---

### Caching Architecture

Redis is used for:

- Authentication sessions
- Dashboard analytics
- Frequently accessed reports
- Notifications

---

### File Storage Architecture

**Storage Types**

- Poultry images
- Crop images
- Documents
- Reports
- Export files

**Storage Engine**: S3-compatible object storage.

---

### Analytics Architecture

**Poultry Analytics**

- Mortality rate
- Egg production rate
- Feed conversion ratio
- Growth performance

**Crop Analytics**

- Yield analysis
- Harvest forecasting
- Input cost analysis

**Financial Analytics**

- Revenue trends
- Expense tracking
- Profitability analysis

---

### Offline Synchronization

**Sync Process**

```
User Action → Local Database Save → Sync Queue → Background Sync Worker → API Synchronization → Conflict Resolution
```

**Conflict Resolution Strategies**

- Last write wins
- Timestamp comparison
- Manual resolution for critical conflicts

---

### Scalability Strategy

Services can scale independently. Scalable components:

- API services
- Notification workers
- Analytics workers
- Realtime gateways

---

### Future Architecture Expansion

- IoT integration
- Smart sensors
- AI disease prediction
- Weather integration
- GPS farm mapping
- Drone integration
- Machine learning analytics

---

### Development Standards

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
| Mobile Testing | Detox      |

---

### Recommended Development Phases

**Phase 1 — Foundation**: Monorepo setup, authentication, database schema, core APIs

**Phase 2 — Core Farm Operations**: Poultry, crop, inventory, worker modules

**Phase 3 — Mobile Offline Support**: Offline database, synchronization engine, conflict resolution

**Phase 4 — Analytics & Reporting**: Reporting dashboards, financial reports, poultry analytics, crop analytics

**Phase 5 — Advanced Features**: IoT integration, AI analytics, smart recommendations

---

### MVP Scope

**Poultry**: Flock management, feeding records, mortality tracking, egg production, vaccination records

**Crops**: Field management, crop cycles, harvest tracking

**Finance**: Expenses, sales

**Workers**: Attendance, worker management

---

### Recommended Team Structure

| Role              | Responsibility      |
| ----------------- | ------------------- |
| Product Manager   | Product direction   |
| Backend Engineer  | APIs & database     |
| Frontend Engineer | Web dashboard       |
| Mobile Engineer   | Mobile applications |
| DevOps Engineer   | Infrastructure      |
| UI/UX Designer    | Design system       |
| QA Engineer       | Testing             |
