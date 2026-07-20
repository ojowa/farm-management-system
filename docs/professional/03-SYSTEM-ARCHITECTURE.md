# System Architecture

**Document Classification:** Internal — Confidential
**Version:** 2.0 | **Date:** July 2026 | **Status:** Modular Monolith Implemented

---

## 1. Architecture Overview

FMS uses a **modular monolith + thin API Gateway** architecture. All external traffic
enters through the API Gateway (`:4000`), which handles authentication, CORS, and
request routing to a single NestJS application server (`:4001`) containing all domain
modules as NestJS modules.

### 1.1 Architecture Principles

| Principle | Implementation |
|-----------|---------------|
| **Single entry point** | API Gateway at `:4000` — all external requests pass through it |
| **Domain isolation** | Each domain is a NestJS module with its own controllers, services, repositories |
| **Shared database** | All modules share one PostgreSQL schema; isolation via `organizationId` + RLS |
| **Stateless services** | No in-memory session state; JWT + database-stored refresh tokens |
| **In-process communication** | Cross-module calls use NestJS DI (no HTTP between modules) |
| **Defense in depth** | Guards, interceptors, filters, rate limiting, input validation at every layer |

---

## 2. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Applications                         │
│   Admin (:3000)  Web (:3001)  Console (:3004)  Mobile (:8082)      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    API Gateway (:4000)                               │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  • JWT verification (HS256, cookie → Bearer fallback)       │   │
│  │  • CORS handling (configurable origins)                      │   │
│  │  • Rate limiting (via downstream modules)                    │   │
│  │  • Request routing to app-server                             │   │
│  │  • WebSocket relay (Socket.IO)                               │   │
│  │  • Swagger / OpenAPI docs at /docs                           │   │
│  │  • Auth audit logging [AuthAudit]                            │   │
│  │                                                              │   │
│  │  NO business logic. NO Prisma. NO domain code.              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    App Server (:4001) — Modular Monolith             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    NestJS Modules                             │   │
│  │                                                              │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │   │
│  │  │  Auth   │ │  Farm   │ │  Crop   │ │Livestock│          │   │
│  │  │ Module  │ │ Module  │ │ Module  │ │ Module  │          │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │   │
│  │                                                              │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │   │
│  │  │Poultry  │ │Finance  │ │   HR    │ │Platform │          │   │
│  │  │ Module  │ │ Module  │ │ Module  │ │ Module  │          │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │   │
│  │                                                              │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │   │
│  │  │Notif.   │ │Report.  │ │  Org    │ │Realtime │          │   │
│  │  │ Module  │ │ Module  │ │ Module  │ │ Module  │          │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │   │
│  │                                                              │   │
│  │  All modules use @farm/database (shared Prisma + RLS)        │   │
│  │  All modules use @farm/auth for guards                       │   │
│  │  Cross-module calls are NestJS DI injections (no HTTP)       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Shared Infrastructure                            │   │
│  │  @farm/database (Prisma + RLS)  │  @farm/env                 │   │
│  │  @farm/auth (JWT + RBAC)        │  @farm/utils               │   │
│  │  Socket.IO (single instance)    │  @farm/validation (Zod)    │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PostgreSQL 16                                     │
│                    66 Prisma models                                  │
│                    RLS per organization                              │
│                    PgBouncer connection pooling                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Module Topology

| Module | Controllers | Services | Repositories | Cross-Module DI |
|--------|------------|----------|--------------|----------------|
| **AuthModule** | 9 | 6 | 4 | — |
| **FarmModule** | 2 | 1 | 2 | — |
| **CropModule** | 2 | 1 | 2 | — |
| **LivestockModule** | 4 | 1 | 5 | — |
| **PoultryModule** | 8 | 1 | 1 | — |
| **FinanceModule** | 5 | 1 | 6 | — |
| **HrModule** | 10 | 1 | 12 | — |
| **NotificationModule** | 2 | 1 | 2 | EmailModule, PushModule |
| **OrganizationModule** | 1 | 1 | 1 | — |
| **PlatformModule** | 9 | 9 | 7 | — |
| **ReportingModule** | 2 | 1 | 2 | — |
| **RealtimeModule** | 1 | 1 | — | — |
| **Total** | **55** | **25** | **46** | — |

---

## 4. Domain-Driven Design (DDD) Layer Structure

Each domain module follows the same DDD layer pattern within the original service directories:

```
service/src/<domain>/
├── domain/                    # Entities, Value Objects, Events, Repository interfaces
│   ├── entities/              # Domain entities (e.g., User, Farm, CropCycle)
│   ├── value-objects/         # Value objects (e.g., Email, Money, DateRange)
│   ├── events/                # Domain events (e.g., FarmCreated, CropHarvested)
│   └── repositories/          # Repository interfaces (contracts)
│
├── application/               # Use cases, DTOs, Commands/Queries
│   ├── services/              # Application services (orchestration)
│   ├── dto/                   # Data Transfer Objects
│   └── commands/              # Command objects
│
├── infrastructure/            # External integrations
│   ├── persistence/           # Prisma repository implementations
│   ├── messaging/             # Event services
│   └── external/              # Email, Firebase, S3 integrations
│
└── presentation/              # API layer
    ├── controllers/           # NestJS controllers
    ├── filters/               # Exception filters
    ├── guards/                # Auth/role guards
    └── interceptors/          # Logging, transformation
```

### 4.1 DDD Layer Responsibilities

| Layer | Responsibility | Example |
|-------|---------------|---------|
| **Domain** | Business rules, entity validation, domain events | `Farm` entity validates type, geolocation |
| **Application** | Orchestrate use cases, DTO mapping, transaction boundaries | `FarmService.create()` coordinates creation |
| **Infrastructure** | Database access, external service calls | `PrismaFarmRepository` implements `FarmRepository` |
| **Presentation** | HTTP handling, input validation, error formatting | `FarmController.create()` validates DTO |

---

## 5. Cross-Module Communication

### 5.1 In-Process (NestJS DI)

All cross-module communication uses NestJS dependency injection. No HTTP calls between modules.

```typescript
// Example: FinanceModule imports FarmModule for farm lookups
@Module({
  imports: [FarmModule],
  controllers: [ExpenseController],
  providers: [FinanceApplicationService],
})
export class FinanceModule {}

// FinanceApplicationService can now inject FarmApplicationService
@Injectable()
export class FinanceApplicationService {
  constructor(
    private readonly farmService: FarmApplicationService, // Direct DI
  ) {}
}
```

### 5.2 Real-time (WebSocket via Socket.IO)

- Single Socket.IO server in the RealtimeModule
- WebSocket connections authenticated via JWT on connect
- Events broadcast: `notification:new`, `farm:update`, `task:update`
- Per-user rooms for targeted notifications

### 5.3 Event System (In-Process)

- Modules can use NestJS EventEmitter2 for decoupled communication
- No external message queue required
- Simplified deployment and debugging

---

## 6. Data Flow Diagrams

### 6.1 Login Flow (Browser → Cookie-Based)

```
Browser (Console :3004)
    │
    │  POST /auth/login {email, password}
    ▼
Next.js Rewrite → Gateway :4000
    │
    │  Proxy to app-server :4001
    ▼
App Server :4001
    │
    │  AuthModule.AuthController
    │  1. Validate credentials (bcrypt)
    │  2. Generate access token (JWT, 15min)
    │  3. Generate refresh token (7-day JWT, SHA-256 hash in DB)
    │  4. Set httpOnly cookies: accessToken, refreshToken
    │  5. Return user object
    ▼
Browser receives:
    │  Set-Cookie: accessToken=...; HttpOnly; SameSite=Lax
    │  Set-Cookie: refreshToken=...; HttpOnly; SameSite=Lax
    │  Body: {user: {...}, requiresMFA: false}
    ▼
Browser → GET /auth/me (with cookies)
    │
    ▼
Gateway :4000 verifies accessToken from cookie
    │  Extracts: x-user-id, x-user-role, x-organization-id
    ▼
App Server → AuthModule returns user profile → 200 OK
```

### 6.2 Authenticated API Request Flow

```
Frontend
    │
    │  GET /farms (with cookies or Bearer token)
    ▼
API Gateway :4000
    │
    │  1. Extract token from cookie or Authorization header
    │  2. Verify JWT signature + expiry
    │  3. Decode claims (id, email, role, permissions, organizationId)
    │  4. Inject headers: x-user-id, x-user-role, x-organization-id
    │  5. Proxy to app-server
    ▼
App Server :4001
    │
    │  FarmModule.FarmController
    │  1. RLS middleware sets organizationId context
    │  2. Check permissions via @farm/auth guards
    │  3. FarmApplicationService queries with org scope
    │  4. Return scoped results
    ▼
Gateway → Frontend (response)
```

---

## 7. Monorepo Structure

```
farm-management-system/
├── apps/
│   ├── admin/                    # Admin App (Next.js, port 3000)
│   ├── console/                  # Console App (Next.js, port 3004)
│   ├── web/                      # Web App (Next.js, port 3001)
│   └── mobile/                   # Mobile App (Expo, port 8082)
│
├── packages/
│   ├── api-client/               # Shared API client (Axios-based)
│   ├── auth/                     # Auth utilities (JWT, guards, RBAC)
│   ├── database/                 # Prisma client, RLS middleware
│   ├── domain-core/              # Shared kernel (base entities, events)
│   ├── domains/                  # 10 bounded context packages
│   │   ├── crop/
│   │   ├── farm/
│   │   ├── finance/
│   │   ├── hr/
│   │   ├── identity/
│   │   ├── livestock/
│   │   ├── notification/
│   │   ├── organization/
│   │   ├── platform/
│   │   └── poultry/
│   ├── env/                      # Shared env loader (@farm/env)
│   ├── hooks/                    # Shared React hooks
│   ├── types/                    # Shared TypeScript types
│   ├── ui/                       # Shared React UI components
│   ├── ui-native/                # Shared React Native components
│   └── validation/               # Shared Zod schemas
│
├── services/
│   ├── api-gateway/              # API Gateway (NestJS, port 4000) — thin proxy
│   ├── app-server/               # App Server (NestJS, port 4001) — modular monolith
│   ├── auth-service/             # Auth Service (original, retained for reference)
│   ├── farm-service/             # Farm Service (original, retained for reference)
│   ├── finance-service/          # Finance Service (original, retained for reference)
│   ├── hr-service/               # HR Service (original, retained for reference)
│   ├── notification-service/     # Notification Service (original, retained)
│   ├── organization-service/     # Organization Service (original, retained)
│   ├── platform-service/         # Platform Service (original, retained)
│   └── reporting-service/        # Reporting Service (original, retained)
│
├── infra/                        # Infrastructure (Docker, Terraform)
├── docs/                         # Documentation (this set)
├── scripts/                      # Build, seed, utility scripts
├── turbo.json                    # Turborepo configuration
├── pnpm-workspace.yaml           # pnpm workspace definition
└── tsconfig.base.json            # Shared TypeScript config
```

---

## 8. Infrastructure

### 8.1 Local Development

```
┌─────────────────────────────────────┐
│  Docker Compose                      │
│  ┌───────────────┐  ┌────────────┐  │
│  │ PostgreSQL 16  │  │ PgBouncer  │  │
│  │ :5432          │  │ :6432      │  │
│  └───────────────┘  └────────────┘  │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Turborepo dev                       │
│  pnpm dev → runs:                    │
│  • API Gateway (:4000)              │
│  • App Server (:4001)               │
│  • Next.js apps in parallel          │
└─────────────────────────────────────┘
```

### 8.2 Production (Render.com)

```
┌──────────────────────────────────────────────────┐
│  Render.com Blueprint (render.yaml)               │
│                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ API GW   │  │App Server│  │ Admin    │  ...  │
│  │ :4000    │  │ :4001    │  │ :3000    │       │
│  └──────────┘  └──────────┘  └──────────┘       │
│                                                    │
│  5 services deployed (down from 16)               │
│  Database: Neon (hosted PostgreSQL)               │
└──────────────────────────────────────────────────┘
```

---

## 9. Architecture Decision Records (ADRs)

| ADR | Decision | Status |
|-----|----------|--------|
| ADR-001 | Migrate all services from Express to NestJS | ✅ Accepted |
| ADR-002 | Use httpOnly cookies for browser auth, Bearer for mobile | ✅ Accepted |
| ADR-003 | DDD with shared PostgreSQL database (not per-service DB) | ✅ Accepted |
| ADR-004 | Centralised API Gateway (not service mesh) | ✅ Accepted |
| ADR-005 | Consolidate 9 services into modular monolith (app-server) | ✅ Implemented |
| ADR-006 | Cross-module communication via NestJS DI (not HTTP) | ✅ Implemented |

---

*For the full tech stack and version matrix, see [Technology Stack](./04-TECHNOLOGY-STACK.md).
For data models, see [Data Management](./05-DATA-MANAGEMENT.md).
For the modular monolith design rationale, see [Proposed Architecture](./PROPOSED-ARCHITECTURE.md).*
