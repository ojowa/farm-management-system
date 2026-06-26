# Farm Management System — AI Coding Agent Instructions

## Role
You are an AI coding agent operating inside the **Farm Management System** monorepo.

## Primary Goals
1. Implement requested changes correctly and consistently with existing architecture.
2. Preserve multi-tenant security boundaries (**organizationId** / RBAC).
3. Follow repo conventions: **pnpm + turborepo**, **TypeScript**, and existing shared packages.

## Repo Map (where to work)
- **Monorepo root**: `package.json`, `turbo.json`, `pnpm-workspace.yaml`
- **Apps**:
  - `apps/web` (Next.js)
  - `apps/admin` (Next.js)
  - `apps/mobile` (Expo / React Native)
  - `apps/api-gateway` (NestJS)
- **Backend services**:
  - `services/*-service` (NestJS)
- **Shared packages**:
  - `packages/auth` (JWT verification, roles/permissions)
  - `packages/database` (Prisma + DB access)
  - `packages/types` (shared TS types)
  - `packages/validation` (Zod schemas)
  - `packages/utils`, `packages/ui`, etc.

## Architecture & Security Rules (must-follow)
### Multi-tenancy
- The system is multi-tenant using **organizationId**.
- Tenant isolation is enforced by design and must be preserved in every data access.
- When adding endpoints/services/repositories:
  - Filter all tenant-scoped queries by **organizationId**.
  - Never allow cross-tenant reads/writes.

### AuthN/AuthZ (must-follow)
- JWT is issued by `services/auth-service`.
- Every other service must verify tokens and enforce authorization via existing shared utilities.
- Canonical JWT verification and helpers are in **`packages/auth`**:
  - `verifyAccessToken(token)`
  - `extractBearerToken(authorization)`
  - `AuthError`

### RBAC
- Roles and permission model are defined in `packages/auth/src/roles.ts`.
- When implementing route guards/middleware:
  - Use existing patterns (Express middleware / NestJS guards) from `packages/auth`.
  - Keep allow-lists and required permissions consistent with the shared role/permission matrix.

### API Gateway forwarding
- `apps/api-gateway` verifies the token once and forwards principal info as headers (identity + organization context).
- Downstream services still must validate/verify as defense-in-depth.

## Code Style & Tooling
- Use existing **TypeScript** patterns and keep strict typing.
- Prefer existing shared packages over duplicating logic.
- Follow existing backend/frontend conventions:
  - Backend: NestJS controllers/services/modules, Prisma repositories.
  - Web/admin: Next.js structure and shared UI components.
  - Mobile: Expo + existing navigation/sync patterns.

## Documentation as Source of Truth
Use docs under `docs/` whenever architecture or security behavior is unclear:
- `docs/architecture/architecture-documentation.md`
- `docs/architecture/database_setup.md`
- `docs/architecture/authentication.md`

## Implementation Checklist (before finalizing changes)
1. **Correct module placement**: change lives in the correct `apps/*`, `services/*`, or `packages/*` location.
2. **Tenant safety**: all DB reads/writes include tenant filtering via `organizationId`.
3. **Auth safety**:
   - token verification uses `packages/auth` helpers
   - authorization uses existing RBAC patterns
4. **Validation**: use existing schemas in `packages/validation` where applicable.
5. **Types**: use `packages/types` for shared data contracts.
6. **No breaking changes** unless explicitly requested.
7. **Consistency**: naming, error handling style, and response shapes match existing code.

## Expected Outputs
- Update only the files necessary to fulfill the task.
- Ensure changes compile (at minimum logically) and align with the monorepo conventions.

## Notes about running commands
If you need to run tests/builds/lints, use the monorepo scripts (turborepo/pnpm) from the root.

---
End of instructions.

