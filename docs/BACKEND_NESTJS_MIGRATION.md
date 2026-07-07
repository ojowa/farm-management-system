# Backend NestJS Migration

## Overview

All 11 Express-based backend services have been migrated to NestJS, completing the transition from a mixed Express/NestJS architecture to a consistent NestJS monolith.

## Migration Status

| Service | Port | Status | Notes |
|---------|------|--------|-------|
| auth-service | 4001 | ✅ Migrated | 6 modules: auth, roles, permissions, admin, org-admin, api-keys |
| farm-service | 4002 | ✅ Migrated | 4 controllers: CRUD, fields, import-export, map |
| livestock-service | 4003 | ✅ Migrated | 4 controllers: CRUD, health, breeding, weight |
| poultry-service | 4004 | ✅ Migrated | 8 controllers: houses, pens, breeds, flocks, feeding, vaccination, mortality, medications |
| notification-service | 4005 | ✅ Already NestJS | No changes needed |
| finance-service | 4006 | ✅ Migrated | 5 controllers: expenses, sales, profitability, contracts, marketplace |
| worker-service | 4007 | ✅ Migrated | Module with controller, service, repository |
| reporting-service | 4008 | ✅ Migrated | 2 controllers: reports, scheduled-reports |
| organization-service | 4009 | ✅ Already NestJS | No changes needed |
| inventory-service | 4010 | ✅ Migrated | 4 controllers: CRUD, low-stock, import-export, equipment |
| crop-service | 4011 | ✅ Migrated | 5 controllers: CRUD, lifecycle, irrigation, pest-disease, yield |
| hr-service | 4012 | ✅ Migrated | 9 controllers: leave-types, leave-requests, leave-balance, shifts, shift-assignments, messages, correspondence, tasks, attendance |
| platform-service | 4020 | ✅ Migrated | 7 modules: auth, users, organizations, features, subscriptions, health, audit |
| api-gateway | 4000 | ✅ Already NestJS | No changes needed |

## Architecture Pattern

All migrated services follow a consistent NestJS pattern:

```
services/<service>/
├── package.json          # NestJS dependencies
├── nest-cli.json         # Nest CLI config
├── tsconfig.json         # Extends root tsconfig.base.json
└── src/
    ├── main.ts           # NestFactory bootstrap
    ├── app.module.ts     # Root module
    └── modules/<feature>/
        ├── <feature>.module.ts
        ├── <feature>.controller.ts
        ├── <feature>.service.ts      # Optional (some use direct Prisma)
        └── <feature>.repository.ts   # Optional (plain class with scopedPrisma)
```

### Key Conventions

- **Module → Controller → Service → Repository** pattern where services have business logic
- Simple CRUD controllers use `scopedPrisma` directly without a service layer
- All services use `@farm/database`'s `scopedPrisma` for data access (RLS-aware)
- `rlsMiddleware` applied in `main.ts` for row-level security
- `ValidationPipe` with Zod schemas via `@farm/utils`'s `ZodValidationPipe`
- `@nestjs/config` for environment variable management
- Port assignments per `render.yaml`: 4001-4020

## Files Created/Modified

### Per Service (×11 migrated services)
- `package.json` - Replaced Express deps with `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/config`, `rxjs`, `reflect-metadata`
- `nest-cli.json` - Added for Nest CLI build support
- `src/main.ts` - Rewritten from Express app to `NestFactory.create(AppModule)`
- `src/app.module.ts` - Created as root NestJS module
- `src/modules/*/` - New NestJS module/controller/service files

### Infrastructure
- `render.yaml` - Updated all service build commands to use `corepack prepare pnpm@10.27.0 --activate`
- `package.json` (root) - Retained `packageManager` field for Turborepo compatibility
- `.github/workflows/admin-ci.yml` - Fixed pnpm setup, Node 22, removed redundant build

### Old Express Files
- `src/routes/*.ts` - Preserved as dead code (not imported by NestJS modules)
- `src/controllers/*.ts` - Preserved as dead code
- `src/services/*.ts` - Preserved as dead code
- `src/middleware/*.ts` - Preserved as dead code

## Build Verification

All 18 Turborepo tasks (11 services + packages) build successfully:
```
Tasks:    18 successful, 18 total
```

## Render Deployment

### Build Command (per service)
```
corepack prepare pnpm@10.27.0 --activate && pnpm install --frozen-lockfile
```

### Start Command (per service)
```
pnpm --filter @farm/<service-name> start:prod
```

### Important Notes
- Render's Node.js 24 runtime has a read-only filesystem at `/usr/bin` and `/usr/lib/node_modules`
- `corepack enable` fails on Render — use `corepack prepare` instead (writes to `~/.cache/node/corepack/`)
- The `packageManager` field in root `package.json` is required by Turborepo
- Manually-created Render services ignore `render.yaml` — update build commands in the Render dashboard or recreate from blueprint

## Cleanup Complete

Old Express files have been removed from all services:
- `services/*/src/routes/` — deleted
- `services/*/src/controllers/` — deleted
- `services/*/src/services/` — deleted
- `services/*/src/middleware/` — deleted
