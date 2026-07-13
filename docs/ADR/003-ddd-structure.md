# ADR-003: Domain-Driven Design with Shared Database

**Date:** 2026-06-01  
**Status:** Accepted  
**Deciders:** Development Team

## Context

The system needed a clear architectural boundary between business domains while maintaining data consistency across the platform. Options considered:

1. **Shared database, shared schema** — All services use one PostgreSQL database
2. **Database per service** — Each microservice owns its database
3. **Hybrid** — Shared database with schema isolation

## Decision

Use **shared database with DDD bounded contexts**:

- 10 domain packages in `packages/domains/`
- Each service depends on its domain package
- All services share one PostgreSQL database
- Data isolation enforced via `organizationId` on every query

### Bounded Contexts

| Context | Domain Package | Service |
|---------|---------------|---------|
| Identity | `@farm/identity-domain` | auth-service, organization-service |
| Farm | `@farm/farm-domain` | farm-service |
| Crop | `@farm/crop-domain` | crop-service |
| Livestock | `@farm/livestock-domain` | livestock-service |
| Poultry | `@farm/poultry-domain` | poultry-service |
| Finance | `@farm/finance-domain` | finance-service |
| HR | `@farm/hr-domain` | worker-service, hr-service |
| Notification | `@farm/notification-domain` | notification-service |
| Reporting | `@farm/reporting-domain` | reporting-service |
| Platform | `@farm/platform-domain` | platform-service |

### Layer Structure (per service)

```
service/
├── domain/              # Entities, Value Objects, Events, Repository interfaces
├── application/         # Services (use cases), DTOs
├── infrastructure/      # Prisma repositories, external integrations
└── presentation/        # Controllers, filters, guards
```

### Cross-Context Communication

- **Synchronous HTTP** via the API Gateway
- Gateway extracts JWT claims and forwards tenant context headers
- No event bus or message queue (simplified architecture)

## Consequences

### Positive
- Clear domain boundaries enforce separation of concerns
- Shared database allows cross-domain queries when needed
- Prisma schema provides a single source of truth for data model
- Easier debugging (one database to check)
- Simpler deployment (no inter-service database connectivity)

### Negative
- Shared database is a single point of failure
- Schema changes affect all services
- No independent database scaling per service
- Risk of tight coupling through shared tables

### Neutral
- Multi-tenancy enforced at application layer (`organizationId` filter)
- Domain packages define interfaces, services implement with Prisma
- Future migration to separate databases is possible if needed
