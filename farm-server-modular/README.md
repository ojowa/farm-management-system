# farm-server-modular

A copy of `farm-server` restructured as a **modular monolith**: one Node
process, one HTTP surface (`/v1`), one Swagger docs page — but the same
bounded contexts, same Prisma/RLS data layer, and the same client-facing
response shapes as the original microservice-style backend.

## Why this copy exists

The original `farm-server` runs **15 NestJS entry points** (`auth.main`,
`farm.main`, … `api.main`) plus an HTTP reverse-proxy gateway that forwards
`/v1/*` to per-service ports (4010–4020). This copy collapses that topology
into a single Nest application while keeping each domain isolated as a
module — so you can compare, migrate, or A/B the two backends.

## Layout

```
farm-server-modular/
├── package.json                  # workspaces: app-server + packages/server/*
├── render.yaml                   # single-process Render blueprint
├── server.js                     # Vercel entry (wraps the one Nest app)
├── scripts/start-prod.js         # spawns exactly one child: dist/main.js
├── app-server/
│   ├── nest-cli.json             # single project, entryFile "main"
│   └── src/
│       ├── main.ts               # bootstrap: CORS, helmet, /v1 prefix, Swagger
│       ├── app.module.ts         # composition root: wires everything below
│       ├── core/                 # application kernel (shared by all modules)
│       │   ├── common/sort.ts    #   safeOrderBy query helper
│       │   └── http/
│       │       ├── health.controller.ts
│       │       ├── middleware/   #   api-alias, request-id, device-info,
│       │       │                 #   auth (JWT → req.verifiedUser), rls-context
│       │       ├── interceptors/ #   envelope.interceptor ({success,data,…})
│       │       └── filters/      #   api-exception.filter (single error shape)
│       ├── shared/
│       │   └── storage/          # S3/local object storage (StorageModule)
│       └── modules/              # ← bounded contexts (the "modular" part)
│           ├── auth/ crop/ farm/ finance/ hr/ livestock/
│           ├── notification/ organization/ platform/ poultry/
│           ├── reporting/ weather/
│           └── realtime/         #   in-process EventBus + WebSocket gateway
└── packages/server/              # shared libraries (unchanged from farm-server)
    ├── auth/          # @farm/auth-server      — JWT + Nest guards
    ├── database/      # @farm/database        — Prisma client + RLS middleware
    ├── domain-core/   # @farm/domain-core     — DDD building blocks
    ├── env/           # @farm/env             — .env loader
    ├── types/         # @farm/types-server
    ├── utils/         # @farm/utils           — handleError, ZodValidationPipe
    └── validation/    # @farm/validation-server — zod schemas
```

## Module rules (what makes it a modular monolith)

1. **Composition only at the root.** `app.module.ts` is the sole place that
   imports every `<name>Module`. Nothing else wires modules together.
2. **Public API per module.** Cross-module code imports from
   `modules/<name>` (the `index.ts` barrel), never from
   `modules/<name>/*/…` internals.
3. **Domain modules never import each other's internals.** Cross-cutting
   reactions go through the in-process `EventBus` (`modules/realtime`).
4. **HTTP pipeline lives in `core/http`.** Auth, RLS scoping, request IDs,
   the response envelope, and the error shape are applied once, globally —
   they used to be duplicated across 15 entry points + the gateway.
5. **`shared/`** holds technical capabilities reusable by any module
   (object storage).

## Behaviour preserved from `farm-server`

- **`/v1` prefix** and the same controller routes → URL-compatible.
- **Response envelope** `{ success, data, timestamp, requestId }` on success
  (`core/http/interceptors/envelope.interceptor.ts`); the shared
  `@farm/api-client`'s `unwrapEnvelope()` keeps working unchanged.
- **Error shape** `{ success:false, data:{…}, error:{…} }` — both legacy keys
  emitted so consumers of either shape keep working.
- **Auth**: same `AuthMiddleware` (cookie/bearer → `req.verifiedUser`) plus
  `JwtAuthGuard`/`AuthorizationGuard` at controller level.
- **RLS**: `RlsContextMiddleware` derives the Postgres org context from the
  verified JWT instead of the gateway's `x-service-token` header (same
  `AsyncLocalStorage` semantics, one less header hop).
- **`/api/*` alias** rewrite for the console app's Next rewrites
  (`core/http/middleware/api-alias.middleware.ts`).
- Raw paths (`/health`, `/weather`, `/docs`, `/realtime`) stay envelope-free,
  matching what the old gateway served directly.

## Commands

```bash
npm ci                 # install workspaces
npm run build          # build shared packages + app (dist/main.js)
npm run start:dev      # nest start --watch (port API_SERVICE_PORT || 4022)
npm run start          # node dist/main.js
npm run migrate        # prisma migrate deploy
npm run seed           # prisma db seed
```

Production (Render): `node scripts/start-prod.js` — one child process.
Vercel: `server.js` exports the http.Server wrapping the same Nest app.

## What was removed vs farm-server

| Removed | Replaced by |
|---|---|
| `src/microservices/*.main.ts` (15 entry points) | `src/main.ts` + `src/app.module.ts` |
| `modules/api/proxy/*` (HTTP reverse proxy, routes.ts) | direct in-process routing |
| Per-service ports 4010–4020 + `*_SERVICE_URL` env vars | one port (`API_SERVICE_PORT`, default 4022) |
| `x-service-token` header hop for RLS | `RlsContextMiddleware` reading `req.verifiedUser` |
| `RawBodyMiddleware` (buffered multipart for the proxy) | none needed — multer parses in-process |
| gateway `RoutingService` / `routes.ts` | the Nest router |
