# Proposed Architecture — Smoother Design

> **Philosophy:** Keep the domain boundaries, drop the operational overhead.
> One process, one database, one deployment — with the option to split later
> when (and if) you actually need to.

**Document Classification:** Internal — Confidential
**Version:** 1.0 | **Date:** July 2026

---

## 1. The Problem with the Current Architecture

The system currently runs **9 separate NestJS processes** that all connect to
**one PostgreSQL database** and share **one Prisma schema (66 models)**. This
creates the cost of microservices (9 processes, 9 connection pools, inter-service
HTTP calls, service tokens, startup ordering) without the benefits (independent
deployment, independent scaling, fault isolation).

### What Hurts Today

| Problem | Impact |
|---------|--------|
| 9 Node.js processes to start, debug, and deploy | High dev friction |
| Cross-service HTTP calls with no auth, no retry, no circuit breaker | Silent failures, lost notifications |
| 5 copy-pasted `NotificationAdapter` files | DRY violation, bug divergence |
| 66 models in one Prisma schema, any service queries any model | No real ownership boundaries |
| Duplicate WebSocket servers (gateway + notification-service) | Two connections, inconsistent state |
| Service tokens signed but never used by callers | Security gap |
| No startup ordering or health gating | Race conditions on boot |
| Gateway is a dumb HTTP proxy (what nginx does in 20 lines) | Over-engineered |

### What Works Well (Keep These)

| Strength | Why It Works |
|----------|-------------|
| RLS multi-tenancy via `AsyncLocalStorage` | Database-level tenant isolation — bulletproof |
| Centralised JWT verification at gateway | Single auth enforcement point |
| Shared packages (`@farm/auth`, `@farm/database`, `@farm/env`) | Code reuse without duplication |
| DDD layer structure (domain/application/infrastructure/presentation) | Clean separation of concerns |
| Unified Prisma schema | Atomic migrations, no cross-DB consistency issues |
| Next.js rewrites for CORS | Zero-config dev experience |

---

## 2. Proposed Architecture: Modular Monolith + Lightweight Gateway

### 2.1 Core Principle

> **One NestJS application, organized as NestJS modules along domain boundaries,
> behind a thin API gateway (or no gateway at all for simpler deployments).**

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Apps                                 │
│   Admin (:3000)  Web (:3001)  Console (:3004)  Mobile (:8082)      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    API Gateway (:4000) — Thin                       │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  • JWT verification (single middleware)                       │   │
│  │  • CORS handling                                             │   │
│  │  • Rate limiting (global + per-route)                        │   │
│  │  • Request logging / audit trail                             │   │
│  │  • WebSocket relay (Socket.IO)                               │   │
│  │  • Swagger / OpenAPI docs                                    │   │
│  │                                                              │   │
│  │  NO business logic. NO Prisma. NO domain code.              │   │
│  │  Just: auth → route → forward → respond.                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Proxies all requests to the single App Server below.               │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    App Server (:4001) — The Monolith                 │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    NestJS Modules                             │   │
│  │                                                              │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │   │
│  │  │  Auth   │ │  Farm   │ │  Crop   │ │Livestock│          │   │
│  │  │ Module  │ │ Module  │ │ Module  │ │ Module  │          │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘          │   │
│  │       │           │           │           │                 │   │
│  │  ┌────┴────┐ ┌────┴────┐ ┌───┴────┐ ┌───┴────┐           │   │
│  │  │Poultry  │ │Finance  │ │   HR   │ │Platform│           │   │
│  │  │ Module  │ │ Module  │ │ Module  │ │ Module  │          │   │
│  │  └────┬────┘ └────┬────┘ └───┬────┘ └───┬────┘           │   │
│  │       │           │          │           │                  │   │
│  │  ┌────┴────┐ ┌────┴────┐ ┌──┴─────┐ ┌──┴──────┐          │   │
│  │  │Notif.   │ │Report.  │ │  Org   │ │  Realtime│          │   │
│  │  │ Module  │ │ Module  │ │ Module  │ │  Module  │          │   │
│  │  └─────────┘ └─────────┘ └────────┘ └─────────┘          │   │
│  │                                                              │   │
│  │  All modules import from @farm/database (shared Prisma)      │   │
│  │  All modules use @farm/auth for guards                       │   │
│  │  Cross-module calls are plain TypeScript imports (no HTTP)   │   │
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
│                    PostgreSQL 16 (:5432)                             │
│                    66 models • RLS per org                           │
│                    PgBouncer (:6432)                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 What Changes

| Current (9 processes) | Proposed (2 processes) |
|----------------------|----------------------|
| `api-gateway` (:4000) | `api-gateway` (:4000) — thin proxy, no domain code |
| `auth-service` (:4001) | ┐ |
| `farm-service` (:4002) | │ |
| `crop-service` (:4011) | │ |
| `livestock-service` (:4003) | ├── `app-server` (:4001) — single NestJS app |
| `poultry-service` (:4004) | │   with 10 domain modules |
| `finance-service` (:4006) | │ |
| `hr-service` (:4012) | │ |
| `notification-service` (:4005) | │ |
| `reporting-service` (:4008) | │ |
| `organization-service` (:4009) | │ |
| `platform-service` (:4020) | ┘ |

**Net result: 9 processes → 2 processes.** 8 fewer Node.js instances, 8 fewer
connection pools, 8 fewer ports to manage, zero inter-service HTTP calls.

---

## 3. Module Structure (Inside the Monolith)

Each current service becomes a **NestJS module** inside the single app server.
The DDD layer structure is preserved within each module.

```
app-server/src/
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── domain/
│   │   │   ├── entities/        # User, Role, Permission, RefreshToken
│   │   │   ├── repositories/    # UserRepository (interface)
│   │   │   └── events/          # UserCreated, PasswordChanged
│   │   ├── application/
│   │   │   ├── auth.service.ts  # login, register, refresh, mfa
│   │   │   └── dto/
│   │   ├── infrastructure/
│   │   │   └── prisma-user.repository.ts
│   │   └── presentation/
│   │       └── auth.controller.ts
│   │
│   ├── farm/
│   │   ├── farm.module.ts
│   │   ├── domain/
│   │   │   ├── entities/        # Farm, Field, Inventory
│   │   │   └── repositories/
│   │   ├── application/
│   │   │   ├── farm.service.ts
│   │   │   └── dto/
│   │   ├── infrastructure/
│   │   │   └── prisma-farm.repository.ts
│   │   └── presentation/
│   │       └── farm.controller.ts
│   │
│   ├── crop/
│   │   ├── crop.module.ts
│   │   └── ... (same DDD structure)
│   │
│   ├── livestock/
│   │   └── ...
│   │
│   ├── poultry/
│   │   └── ...
│   │
│   ├── finance/
│   │   └── ...
│   │
│   ├── hr/
│   │   └── ...
│   │
│   ├── notification/
│   │   ├── notification.module.ts
│   │   ├── domain/
│   │   │   └── repositories/    # NotificationRepository (interface)
│   │   ├── application/
│   │   │   └── notification.service.ts  # Single source of truth
│   │   ├── infrastructure/
│   │   │   ├── firebase.adapter.ts      # Push notifications
│   │   │   ├── email.adapter.ts         # Nodemailer
│   │   │   └── prisma-notification.repository.ts
│   │   └── presentation/
│   │       └── notification.controller.ts
│   │
│   ├── reporting/
│   │   └── ...
│   │
│   ├── organization/
│   │   └── ...
│   │
│   ├── platform/
│   │   └── ...
│   │
│   └── realtime/
│       ├── realtime.module.ts
│       ├── realtime.gateway.ts      # Single Socket.IO server
│       └── realtime.service.ts      # Event broadcast service
│
├── shared/
│   ├── guards/                 # JwtAuthGuard, RolesGuard, PermissionGuard
│   ├── interceptors/           # LoggingInterceptor, TransformInterceptor
│   ├── filters/                # AllExceptionsFilter
│   ├── middleware/              # CookieParser, RateLimiter
│   └── pipes/                  # ZodValidationPipe
│
├── app.module.ts               # Root module importing all domain modules
└── main.ts                     # Bootstrap (loadEnv + NestFactory.create)
```

### 3.1 Cross-Module Communication (In-Process)

**Current (fragile HTTP):**
```
farm-service → HTTP POST → notification-service:4005/notifications
```

**Proposed (direct TypeScript import):**
```typescript
// farm.module.ts
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
})
export class FarmModule {}

// farm.service.ts
import { NotificationService } from '../notification/application/notification.service';

@Injectable()
export class FarmService {
  constructor(
    private readonly notificationService: NotificationService,  // Injected directly
  ) {}

  async createFarm(data: CreateFarmDto, userId: string) {
    const farm = await this.farmRepo.create(data);
    
    // Direct call — no HTTP, no adapter, no failure point
    await this.notificationService.send({
      userId,
      type: 'SUCCESS',
      title: 'Farm Created',
      message: `Farm "${farm.name}" has been created`,
    });
    
    return farm;
  }
}
```

**Benefits:**
- No HTTP overhead (in-process function call)
- No adapter code to maintain (1 copy, not 5)
- TypeScript type safety (compile-time error if method signature changes)
- No startup ordering issues
- No silent failures from unreachable services

---

## 4. The Gateway (Simplified)

The gateway becomes a **thin authentication and routing proxy** — no domain code,
no Prisma, no business logic.

### 4.1 What the Gateway Does

```
Request → CORS check → JWT verify → Rate limit → Route match → Forward → Respond
```

### 4.2 What the Gateway Does NOT Do

- ❌ No Prisma/DB access
- ❌ No business logic
- ❌ No DTO validation (that's the app server's job)
- ❌ No service token signing (services trust the gateway via network — only
  the gateway is exposed to the internet)

### 4.3 Gateway Implementation (Simplified)

```typescript
// gateway/src/proxy.middleware.ts
@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    // 1. CORS handled by NestJS cors config
    // 2. JWT verification via passport-jwt strategy
    // 3. Rate limiting via @nestjs/throttler
    // 4. Forward to app-server via http-proxy
    proxy.web(req, res, { target: 'http://localhost:4001' });
  }
}
```

**Alternative: Skip the gateway entirely for development.**
The Next.js apps can proxy directly to the app server via rewrites:

```javascript
// next.config.js
async rewrites() {
  return [
    { source: '/api/:path*', destination: 'http://localhost:4001/api/:path*' },
    { source: '/auth/:path*', destination: 'http://localhost:4001/auth/:path*' },
  ];
}
```

This eliminates the gateway in dev entirely. The gateway is only needed in
production as a single entry point for SSL termination, rate limiting, and
DDoS protection.

---

## 5. WebSocket (Single Instance)

**Current:** Two Socket.IO servers (gateway :4000 + notification-service :4005).

**Proposed:** One Socket.IO server in the app server.

```typescript
// realtime/realtime.gateway.ts
@WebSocketGateway({ cors: { origin: ['http://localhost:3000', 'http://localhost:3004'] } })
export class RealtimeGateway {
  @WebSocketServer()
  server: Server;

  // Any module can inject this service and broadcast events
  broadcast(event: string, data: any, room?: string) {
    if (room) {
      this.server.to(room).emit(event, data);
    } else {
      this.server.emit(event, data);
    }
  }
}

// notification.service.ts (inside notification module)
@Injectable()
export class NotificationService {
  constructor(private readonly realtime: RealtimeGateway) {}

  async send(notification: CreateNotification) {
    // 1. Save to database
    await this.repo.create(notification);
    
    // 2. Broadcast via WebSocket (single connection)
    this.realtime.broadcast('notification:new', notification, `user:${notification.userId}`);
    
    // 3. Push notification (optional)
    if (notification.pushEnabled) {
      await this.pushAdapter.send(notification);
    }
  }
}
```

---

## 6. Event System (In-Process)

**Current:** Services call gateway HTTP endpoint → gateway broadcasts via Socket.IO.
Circular, fragile, PLATFORM_ADMIN-gated.

**Proposed:** In-process event emitter using NestJS's built-in `EventEmitter2`.

```typescript
// shared/events/event-bus.ts
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EventBus {
  constructor(private readonly emitter: EventEmitter2) {}

  emit(event: string, data: any) {
    this.emitter.emit(event, data);
  }
}

// farm.service.ts — Producer
@Injectable()
export class FarmService {
  constructor(private readonly events: EventBus) {}

  async createFarm(data: CreateFarmDto) {
    const farm = await this.repo.create(data);
    this.events.emit('farm.created', { farm, userId: data.userId });
    return farm;
  }
}

// notification.service.ts — Consumer
@Injectable()
export class NotificationService {
  @OnEvent('farm.created')
  handleFarmCreated(payload: { farm: Farm; userId: string }) {
    this.send({
      userId: payload.userId,
      type: 'SUCCESS',
      title: 'Farm Created',
      message: `Farm "${payload.farm.name}" has been created`,
    });
  }
}
```

**Benefits:**
- No HTTP round-trip
- No circular dependency (gateway is not involved)
- Decoupled — producer doesn't know about consumers
- Testable — emit event, assert side effects
- Extensible — add new consumers without changing the producer

---

## 7. Migration Path (Incremental)

You do NOT need to rewrite everything. Migrate module by module:

### Phase 1: Merge Services into App Server (Weeks 1–2)

```
Step 1: Create app-server NestJS project
Step 2: Move auth module → app-server/modules/auth/
Step 3: Move farm module → app-server/modules/farm/
Step 4: Move crop module → app-server/modules/crop/
... (one module at a time)
Step 9: Move platform module → app-server/modules/platform/
Step 10: Delete old service directories
```

**Each step:** Move module, update imports, run tests, verify API works.

### Phase 2: Replace HTTP Calls with DI (Weeks 3–4)

```
Step 1: Install @nestjs/event-emitter
Step 2: Replace NotificationAdapter HTTP calls with EventBus
Step 3: Replace farm→finance HTTP calls with direct service injection
Step 4: Delete all NotificationAdapter files (5 files)
Step 5: Remove service-to-service HTTP code
```

### Phase 3: Simplify Gateway (Week 5)

```
Step 1: Remove Prisma from gateway
Step 2: Remove all business logic from gateway
Step 3: Simplify to pure auth + proxy
Step 4: In dev, use Next.js rewrites (skip gateway entirely)
```

### Phase 4: Clean Up (Week 6)

```
Step 1: Merge notification-service Socket.IO into app-server
Step 2: Remove duplicate WebSocket gateway
Step 3: Remove service URL env vars (AUTH_SERVICE_URL, etc.)
Step 4: Update .env (only DATABASE_URL, JWT_SECRET needed)
Step 5: Update docker-compose (2 services instead of 9)
Step 6: Update render.yaml (2 services instead of 16)
```

---

## 8. Deployment Simplification

### Current (render.yaml — 16 services)

```yaml
services:
  - name: api-gateway
  - name: auth-service
  - name: farm-service
  - name: crop-service
  - name: livestock-service
  - name: poultry-service
  - name: finance-service
  - name: hr-service
  - name: notification-service
  - name: reporting-service
  - name: organization-service
  - name: platform-service
  - name: admin
  - name: web
  - name: console
  - name: mobile
```

### Proposed (render.yaml — 3 services)

```yaml
services:
  - name: api-gateway        # Thin proxy (optional — can skip in dev)
    env: production
    buildCommand: cd services/api-gateway && pnpm build
    startCommand: node dist/main.js

  - name: app-server         # The monolith (all domain logic)
    env: production
    buildCommand: cd services/app-server && pnpm build
    startCommand: node dist/main.js

  - name: admin              # Admin frontend
  - name: web                # Web frontend
  - name: console            # Console frontend
```

**Result: 16 → 5 deployed services.** Cost reduction of ~60–70% on Render.com.

---

## 9. When to Split Again

The modular monolith is not a permanent constraint. Split into separate services
**when you have a specific reason**:

| Trigger | Action |
|---------|--------|
| One module needs its own database | Extract to separate service + separate DB |
| One module needs independent scaling | Extract to separate deployment |
| Team grows to 5+ engineers | Extract modules by team ownership |
| One module has different availability requirements | Extract for fault isolation |
| Need for different tech stacks | Extract (e.g., Python ML service for crop prediction) |

The DDD module boundaries make this straightforward — each module is already
a self-contained unit with its own domain, application, infrastructure, and
presentation layers.

---

## 10. Comparison Summary

| Aspect | Current (9 services) | Proposed (Monolith) |
|--------|---------------------|-------------------|
| Processes to manage | 9 | 2 (gateway + app) |
| Connection pools | 9 × PgBouncer | 1 × PgBouncer |
| Inter-service calls | HTTP (fragile) | TypeScript imports (safe) |
| Notification adapter | 5 copies | 1 copy |
| WebSocket servers | 2 | 1 |
| Service URLs in .env | 8 | 0 |
| Deploy services | 16 | 5 |
| Dev startup | `pnpm dev` (9 services) | `pnpm dev` (2 services) |
| Fault isolation | None (shared DB) | Same (shared DB) |
| Domain boundaries | DDD modules | DDD modules (same) |
| Independent scaling | Illusory (shared DB) | Honest (scale the monolith) |
| Code organization | Same | Same |
| Migration effort | — | 6 weeks incremental |

---

## 11. Recommended Next Steps

1. **Immediate (this week):** Create `services/app-server/` with the NestJS
   modular structure. Move `auth` module first (smallest, most critical).
2. **Week 1:** Move `farm`, `crop`, `livestock`, `poultry` modules.
3. **Week 2:** Move `finance`, `hr`, `notification`, `reporting` modules.
4. **Week 3:** Move `organization`, `platform`, `realtime` modules.
5. **Week 4:** Replace all HTTP-based cross-service calls with DI injections.
6. **Week 5:** Simplify gateway (remove business logic, Prisma).
7. **Week 6:** Clean up, delete old services, update deployment configs.

**Each phase is independently deployable.** The old services keep running until
the corresponding module is verified in the monolith.

---

*This document proposes a practical, incremental architecture improvement.
It preserves all existing domain logic and DDD structure while eliminating
the operational overhead of pseudo-microservices.*
