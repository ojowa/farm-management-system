# ADR-001: NestJS Migration

**Date:** 2026-06-15  
**Status:** Accepted  
**Deciders:** Development Team

## Context

The backend was originally built with Express.js across 11 microservices. As the system grew, we needed:

- Consistent dependency injection across services
- Built-in support for WebSockets, Guards, Interceptors
- Better TypeScript integration
- Modular architecture with clear separation of concerns
- Standardized testing patterns

## Decision

Migrate all 11 Express services to NestJS. The 3 services already on NestJS (api-gateway, notification-service, platform-service) were left as-is.

### Migration Order

1. auth-service (port 4001)
2. farm-service (port 4002)
3. livestock-service (port 4003)
4. poultry-service (port 4004)
5. finance-service (port 4006)
6. worker-service (port 4007)
7. reporting-service (port 4008)
8. organization-service (port 4009)
9. crop-service (port 4011)
10. hr-service (port 4012)
11. inventory-service → merged into platform-service

### Key Conventions

- Repository providers use string tokens: `{ provide: 'UserRepository', useClass: PrismaUserRepository }`
- Module-level services use class-based DI (no `@Inject` needed)
- Controllers handle HTTP, services handle business logic
- Prisma client shared via `scopedPrisma` for request-scoped isolation

## Consequences

### Positive
- Consistent patterns across all services
- Built-in dependency injection reduces boilerplate
- Guards and interceptors for cross-cutting concerns (auth, logging)
- Better testability with module testing

### Negative
- Migration effort (~2 weeks)
- Learning curve for team members unfamiliar with NestJS
- NestJS decorators add verbosity

### Neutral
- All services now follow the same DDD layer structure
- API contracts (endpoints) remained unchanged during migration
