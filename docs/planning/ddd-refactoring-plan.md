# DDD Refactoring Plan - Farm Management System

## Current State Analysis

Your project is a **Turborepo monorepo** with:
- **12 NestJS microservices** (auth, farm, livestock, poultry, finance, crop, hr, worker, reporting, notification, organization, platform)
- **5 frontend apps** (admin, web, mobile, console, api-gateway)
- **16 shared packages** (database, auth, validation, types, utils, ui)
- **10 domain packages** (`@farm/*-domain`) with DDD entities, value objects, events, repositories
- **40+ Prisma models** in a single shared schema
- **DDD layer structure** (domain, application, infrastructure, presentation) in all backend services

### Refactoring Status: All Phases Complete

---

## Proposed Bounded Contexts

| Bounded Context | Current Services | Domain Entities |
|----------------|------------------|-----------------|
| **Identity & Access** | auth-service | User, Role, Permission, Organization, ApiKey |
| **Farm Management** | farm-service | Farm, Field, FarmEvent |
| **Crop Management** | crop-service | Crop, CropCycle, CropStage, IrrigationSchedule, PestDisease, YieldRecord |
| **Livestock Management** | livestock-service | Livestock, HealthRecord, BreedingRecord, WeightRecord, VaccinationSchedule |
| **Poultry Management** | poultry-service | Flock, PoultryHouse, Pen, FeedingRecord, VaccinationRecord, MortalityRecord, Medication |
| **Finance** | finance-service | Expense, Sale, Contract, MarketListing, Profitability |
| **HR & Workforce** | hr-service, worker-service | Worker, Task, Attendance, Shift, ShiftAssignment, LeaveType, LeaveRequest, LeaveBalance, Message, Correspondence |
| **Notifications** | notification-service | Notification, EmailTemplate, DeviceToken |
| **Reporting** | reporting-service | Report, ScheduledReport |
| **Platform Administration** | platform-service | AuditLog, FeatureFlag, SubscriptionPlan, SystemHealth, Broadcast |
| **Organization Management** | organization-service | Organization, Subscription |

---

## DDD Layer Structure (Per Service)

```
services/<service>/src/
├── domain/                          # Domain Layer (core business logic)
│   ├── entities/                    # Aggregate roots & entities
│   │   └── <entity>.entity.ts
│   ├── value-objects/               # Value objects (Money, DateRange, etc.)
│   │   └── <value-object>.ts
│   ├── aggregates/                  # Aggregate definitions
│   │   └── <aggregate>.ts
│   ├── events/                      # Domain events
│   │   └── <domain-event>.ts
│   ├── repositories/                # Repository interfaces (ports)
│   │   └── <repository>.interface.ts
│   └── services/                    # Domain services
│       └── <domain-service>.ts
├── application/                     # Application Layer (use cases)
│   ├── commands/                    # Command handlers (CQRS)
│   │   └── <command>.ts
│   ├── queries/                     # Query handlers (CQRS)
│   │   └── <query>.ts
│   ├── dto/                         # Data transfer objects
│   │   └── <dto>.ts
│   └── services/                    # Application services (orchestration)
│       └── <app-service>.ts
├── infrastructure/                  # Infrastructure Layer (external concerns)
│   ├── persistence/                 # Repository implementations
│   │   └── <repository>.prisma.ts
│   ├── messaging/                   # Event publishers, message brokers
│   │   └── <event-publisher>.ts
│   └── external/                    # External service adapters
│       └── <adapter>.ts
├── presentation/                    # Presentation Layer (API)
│   ├── controllers/                 # REST controllers
│   │   └── <controller>.controller.ts
│   └── dtos/                        # Request/Response DTOs
│       └── <request/response>.dto.ts
├── <domain>.module.ts               # NestJS module wiring
└── main.ts
```

---

## Shared Kernel (`packages/`)

```
packages/
├── domain-core/                     # NEW: Shared domain primitives
│   ├── src/
│   │   ├── entities/                # BaseEntity, AggregateRoot
│   │   ├── value-objects/           # Id, Money, DateRange, etc.
│   │   ├── events/                  # DomainEvent base class
│   │   └── errors/                  # DomainError, NotFoundError
├── validation/                      # REFACTORED: Domain-specific Zod schemas
├── types/                           # REFACTORED: Domain-specific types
├── database/                        # REFACTORED: Prisma repos per domain
└── ... (existing packages)
```

---

## Implementation Phases

### Phase 1: Domain Analysis & Bounded Context Identification
- [x] Analyze current services and map entities to bounded contexts
- [x] Define aggregate roots and their boundaries
- [x] Identify domain events and cross-context communication patterns
- [x] Document bounded context maps and context relationships

### Phase 2: Create Shared Kernel & Domain Packages
- [x] Create `@farm/domain-core` package with base entities, value objects, events
- [x] Create `packages/domains/` directory structure (identity, farm, crop, livestock, poultry, finance, hr, notification, reporting, platform)
- [x] Refactor `@farm/types` into domain-specific type packages
- [x] Refactor `@farm/validation` into domain-specific schema packages
- [x] Update `@farm/database` with domain-scoped Prisma clients

### Phase 3: Refactor Backend Services to DDD Layers
- [x] **auth-service**: Refactored to Identity & Access bounded context
- [x] **farm-service**: Refactored to Farm Management bounded context
- [x] **crop-service**: Refactored to Crop Management bounded context
- [x] **livestock-service**: Refactored to Livestock Management bounded context
- [x] **poultry-service**: Refactored to Poultry Management bounded context
- [x] **finance-service**: Refactored to Finance bounded context
- [x] **hr-service**: Refactored to HR & Workforce bounded context
- [x] **worker-service**: Refactored to Worker Management bounded context
- [x] **reporting-service**: Refactored to Reporting bounded context
- [x] **notification-service**: Refactored to Notifications bounded context
- [x] **organization-service**: Refactored to Organization Management bounded context

### Phase 4: Update API Gateway
- [x] Refactor gateway to use domain-driven routing
- [x] Implement shared kernel integration at gateway level
- [x] Update proxy middleware for domain-based routing

### Phase 5: Update Frontend Apps
- [x] Refactor web app to consume domain APIs
- [x] Refactor admin app to consume domain APIs
- [x] Refactor console app to consume domain APIs
- [x] Refactor mobile app to consume domain APIs

### Phase 6: Testing & Verification
- [x] Run linting and typechecking across all packages
- [x] Verify all services build and start correctly

---

## Key DDD Patterns to Implement

### 1. Entities & Value Objects
- **Entities**: Have identity, mutable state (User, Farm, Crop)
- **Value Objects**: No identity, immutable, equality by value (Money, DateRange, Address)

### 2. Aggregates
- **Aggregate Root**: Entry point for consistency boundary (Farm aggregate includes Farm + Fields)
- **Invariants**: Business rules enforced within aggregate boundaries

### 3. Domain Events
- **Event-Driven Communication**: Bounded contexts communicate via domain events
- **Event Store**: Optional event sourcing for critical domain events

### 4. Repositories
- **Repository Pattern**: Abstract data access behind interfaces
- **Infrastructure Implementations**: Prisma-based implementations in infrastructure layer

### 5. Domain Services
- **Business Logic**: Complex operations that don't belong to a single entity
- **Cross-Aggregate Operations**: Coordinating operations across aggregates

---

## Benefits of DDD Refactoring

1. **Clear Separation of Concerns**: Domain logic isolated from infrastructure
2. **Maintainability**: Changes to business rules don't affect infrastructure
3. **Testability**: Domain logic can be unit tested without infrastructure
4. **Scalability**: Bounded contexts can be scaled independently
5. **Team Autonomy**: Teams can own specific bounded contexts
6. **Event-Driven Architecture**: Loose coupling between contexts via events
