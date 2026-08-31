# Plan: Replicate OJChat Microservices Architecture to FMS Backend

## Current State

| Aspect | OJChat (Source) | FMS (Target) |
|--------|-----------------|---------------|
| **Architecture** | True microservices: 13 separate NestJS HTTP servers | Modular monolith: 2 processes (Gateway + App Server) |
| **Inter-service comms** | HTTP reverse proxy via `axios` | TCP socket forwarding via `ClientProxy` |
| **ORM** | TypeORM with entity classes | Prisma 6.4.1 |
| **Multi-tenancy** | Single-tenant | Multi-tenant with RLS |
| **Domain design** | Flat service structure (controllers, services, DTOs) | DDD layers (domain, application, infrastructure, presentation) |
| **NestJS version** | 10.x | 11.x |

## What "Replicate" Means

Since FMS already works and has a different data model, the goal is to **replicate OJChat's architectural patterns** into FMS, not copy its code. Specifically:

1. **Split the App Server into separate NestJS microservices** (one per domain module)
2. **Replace TCP proxy with HTTP reverse proxy** in the API Gateway
3. **Keep FMS's Prisma, DDD, and RLS** — these are improvements over OJChat
4. **Add individual `main.ts` entry points** for each service (FMS already has stubs in `src/microservices/`)

---

## Phase 1: Restructure into Independent Services

### 1.1 Create separate NestJS apps for each FMS domain module

Currently FMS has 12 modules in `farm server/app-server/src/modules/`. Each needs to become its own NestJS application with its own `main.ts` and port.

| Module | New Port | Current Location |
|--------|----------|------------------|
| `auth` | 4001 | `app-server/src/modules/auth/` |
| `organization` | 4002 | `app-server/src/modules/organization/` |
| `farm` | 4003 | `app-server/src/modules/farm/` |
| `crop` | 4004 | `app-server/src/modules/crop/` |
| `livestock` | 4005 | `app-server/src/modules/livestock/` |
| `poultry` | 4006 | `app-server/src/modules/poultry/` |
| `finance` | 4007 | `app-server/src/modules/finance/` |
| `hr` | 4008 | `app-server/src/modules/hr/` |
| `notification` | 4009 | `app-server/src/modules/notification/` |
| `platform` | 4010 | `app-server/src/modules/platform/` |
| `reporting` | 4011 | `app-server/src/modules/reporting/` |
| `realtime` | 4012 | `app-server/src/modules/realtime/` |

**Action:** For each module, create:
- `apps/<module>/src/main.ts` — bootstrap NestJS HTTP server on its port
- `apps/<module>/src/app.module.ts` — module definition with database, config imports
- `apps/<module>/nest-cli.json` — NestJS project config
- `apps/<module>/tsconfig.app.json` — TypeScript config
- `apps/<module>/package.json` — dependencies (or reference shared packages)

### 1.2 Register all apps in root `nest-cli.json`

Update `farm server/app-server/nest-cli.json` to list all 12+ projects (following OJChat's pattern).

### 1.3 Add startup scripts to root `package.json`

Add scripts to run all services individually or together (like OJChat's `"start:all"` script).

---

## Phase 2: Replace TCP Proxy with HTTP Reverse Proxy

### 2.1 Rewrite the API Gateway proxy

Currently: `farm server/api-gateway/src/infrastructure/routing/tcp-proxy.middleware.ts` uses `ClientProxy` (TCP).

Change to: HTTP reverse proxy using `HttpService` (axios), matching OJChat's `gateway-proxy.service.ts`.

**Action:**
- Create `farm server/api-gateway/src/infrastructure/routing/http-proxy.service.ts`
- Build a service URL routing table mapping route patterns → service base URLs
- Implement request forwarding via `axios` with timeout, retry, error handling
- Add request/response interceptors for logging, audit, request ID propagation

### 2.2 Update route definitions

Currently: `farm server/api-gateway/src/domain/routes/` uses TCP service names.

Change to: Map routes to HTTP URLs like `http://localhost:4003/api/farms`.

### 2.3 Add service health checks

Implement health check polling for each backend service (like OJChat's health module).

---

## Phase 3: Service-to-Service Authentication

### 3.1 Replace simple header forwarding with service JWT tokens

Currently: FMS gateway signs service tokens and forwards via `x-user-id` header.

Replicate OJChat's pattern: Gateway signs a short-lived JWT (`SERVICE_SECRET`) containing user claims, each service verifies it independently.

**Action:**
- Create shared `ServiceTokenService` in `packages/server/auth/`
- Gateway signs token on each proxied request
- Each service's `AuthGuard` verifies the service token (not the original user JWT)

---

## Phase 4: Shared Infrastructure

### 4.1 Create shared `libs/` packages (following OJChat's pattern)

| New Package | Purpose | Based On |
|-------------|---------|----------|
| `libs/common` | Shared DTOs, interfaces, decorators | OJChat's `libs/common` |
| `libs/config` | Configuration service (env loading) | Already exists at `packages/server/env` |
| `libs/database` | Prisma client factory, RLS middleware | Already exists at `packages/server/database` |
| `libs/logger` | Structured logging module | Create new, following OJChat's `libs/logger` |

### 4.2 Create shared interceptors and filters

Port from OJChat:
- `RequestLoggingInterceptor`
- `ResponseTransformInterceptor`
- `AuditLogInterceptor`
- `AllExceptionsFilter`
- `TimeoutInterceptor`

---

## Phase 5: Process Management & Deployment

### 5.1 Create unified startup script

Like OJChat's `start-all` script, create a script that:
- Starts all 12+ services in parallel
- Starts the API Gateway
- Optionally starts infrastructure (PostgreSQL, Redis) via Docker Compose

### 5.2 Update Docker Compose (if applicable)

Currently: `infra/docker-compose.yml` runs a single app-server container.

Change to: One container per microservice + API Gateway, or a single container with all processes managed by `pm2` or similar.

### 5.3 Update deployment config

- Update `render.yaml` or equivalent for multi-service deployment
- Add environment variable templates for each service's port, database URL, service secret, etc.

---

## Phase 6: Testing & Validation

### 6.1 Update integration tests

Ensure tests work with the new multi-service architecture.

### 6.2 Load testing

Verify the HTTP proxy adds acceptable latency vs the old TCP proxy.

### 6.3 Validate RLS still works

Critical: Ensure multi-tenant Row-Level Security functions correctly across service boundaries.

---

## Key Decisions to Make

| Decision | Options | Recommendation |
|----------|---------|----------------|
| **Service discovery** | Static URLs (env vars) vs service registry (Consul, etcd) | Static URLs — simpler, matches OJChat |
| **Process manager** | pm2 vs Docker per service vs single container | Docker per service — production-grade |
| **Database connections** | One connection pool per service vs shared | One pool per service — true isolation |
| **Shared code** | npm packages vs `libs/` directory | `libs/` directory — matches OJChat monorepo pattern |
| **Keep DDD?** | Yes (FMS advantage) vs flatten to match OJChat | Keep DDD — it's an improvement |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| HTTP proxy slower than TCP | Latency increase | Connection keep-alive, response caching |
| RLS broken across services | Data leak between tenants | Test RLS in each service independently |
| Service startup order dependencies | Cold start failures | Health checks, retry logic, graceful degradation |
| Code duplication across services | Maintenance burden | Aggressive use of shared `libs/` packages |

---

## Summary

The plan transforms FMS from a **2-process modular monolith** into a **14-process microservices architecture** (12 services + API Gateway + optionally app-server for backward compat), while preserving FMS's advantages (Prisma, DDD, RLS, multi-tenancy).

**Recommended starting point:** Phase 1 (creating the individual service entry points) as it's the foundation for everything else.
