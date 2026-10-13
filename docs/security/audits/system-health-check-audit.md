# System Health Check Audit Report

**Date:** 2026-10-13
**Feature:** Console → System Health → "Run Health Check"
**App:** `farm-client/console/` (platform console)
**Backend:** `farm-server/` (Vercel deployment: `https://farm-management-system-farm-server-vert.vercel.app/v1`) + `farm-server-modular/`
**Status:** P0/P1 FIXED in source — requires redeploy; follow-ups OPEN (listed at the end)
**Resolution Tracking:** checked boxes = fixed and verified

---

## Summary

The health check could never report a healthy service. Every probe targeted a URL that does not exist on the deployed processes, so a run against production returned **10 checks, 1 healthy (postgres), 9 unhealthy** — while the system was in fact serving traffic normally. The root cause was probe endpoints that were never implemented, compounded by error handling that hid the cause (`404` stored as `degraded`, all exceptions swallowed), UI state that discarded results on reload, and a sequential probe loop whose worst case outran the client timeout.

All P0/P1 findings below are fixed; the console P2s that were safe to fix are fixed. Remaining follow-ups are at the end.

---

## Request path (audited)

```
console (platform)/health/page.tsx
  → platformHealthAPI.check()            POST /api/platform-health/check
  → Next rewrite → gateway (proxy.controller.ts, strips /api alias)
  → PlatformHealthController (JwtAuthGuard + PermissionGuard + @Permission('platform.manage'))
  → PlatformHealthService.checkAll()     ← the health logic
  → SystemHealth rows (Prisma) ← read back by GET /api/platform-health (getHealth())
```

Routing and auth were confirmed working live: unauthenticated `GET /v1/api/platform-health` → **401**, authenticated (SUPER_ADMIN, `platform.manage`) → **200**.

## Live reproduction (before fixes)

Run against `https://farm-management-system-farm-server-vert.vercel.app/v1` with `admin@fms.com`:

```json
POST /v1/api/platform-health/check
→ { "summary": { "total": 10, "healthy": 1, "unhealthy": 9, "totalMs": 124 } }
```

| Stored row | Status | Stored metadata | Why |
|---|---|---|---|
| auth, farm, notification, finance, reporting, organization, hr | `degraded` | `404 Cannot GET /health` | Domain services expose no `/health` route |
| platform | `degraded` | `404 Cannot GET /health-check` | Probe path never implemented either |
| app-server | `down` | `ECONNREFUSED localhost:4000` | Gateway does not bind a port inside the Vercel function; `localhost:4000` was a guess |
| postgresql | `healthy` | latency 2 ms | The only real check |

---

## P0 — Critical

- [x] **1. Probes can never succeed.** `checkAll()` requested `/health` (platform: `/health-check`) from services that never defined those routes. *Fix:* added `farm-server/app-server/src/shared/health/{health.controller.ts,health.module.ts}` (`GET /health` → `{status, service, uptime, memory}`) and registered `HealthModule` in all 13 service entrypoints under `src/microservices/*.main.ts` (not `api.main.ts`, which already exposes `/v1/health`); the platform probe now targets `/health` like the others.
- [x] **2. `app-server` probe pointed at `localhost:4000`.** Nothing listens there on Vercel (the gateway *is* the request's origin, and it never binds a port), so this row was permanently, falsely `down`. *Fix:* the gateway entry is only probed when `APP_SERVER_URL` is explicitly set, at `/v1/health` (the gateway's real health route); otherwise the entry is omitted rather than fabricated.
- [x] **3. `404` was mapped to `degraded`.** A missing health contract looked the same as a struggling service, which is exactly how nine broken probes hid behind nine yellow cards. *Fix:* `2xx → healthy`, `404 → down` (service answers but has no health contract), `other non-2xx → degraded`.
- [x] **4. Errors were swallowed.** `catch {}` discarded the message, so `checkAll()` was undebuggable and stored rows kept no diagnosis. *Fix:* every failure is persisted in `metadata.error` (+ `url`, `latencyMs`, timeouts recorded as `timed out after Nms`) and logged through Nest's `Logger.warn`.

## P1 — Correctness

- [x] **1. Probe URLs ignored how traffic is actually routed.** *Fix:* `HEALTH_TARGETS` now mirrors `GatewayProxyService`'s env-var/fallback-port resolution (`AUTH_SERVICE_URL` → `localhost:4010`, etc.), so the check watches the endpoints callers hit (those entrypoints have no global prefix, so `/health` is correct; the gateway entry stays at `/v1/health`). In `farm-server-modular` (a monolith, no `*_SERVICE_URL`), probes fall back to an in-process signal (`metadata.resolved: 'in-process'`) instead of dialling URLs that can only fail; its split-deployment branch probes `/v1/health`, because `main.ts` puts every route under the global `v1` prefix.
- [x] **2. A `down` service kept its last successful numbers.** The old write set only `status` + `lastCheck`, so a dead service showed month-old `metadata.timestamp` next to a fresh `lastCheck`. *Fix:* the `down` branch resets `uptime`/`memoryUsage`/`metadata` alongside `status`.
- [x] **3. `uptime` / `memoryUsage` were always `0` / `null`.** *Fix:* captured from the health payload (`uptime` in seconds — what `formatUptime()` expects; `memory` = RSS bytes), persisted and rendered as a new "Memory" row.
- [x] **4. `metadata.latencyMs` never reached the UI.** *Fix:* `getHealth()` now maps it to the top-level `latencyMs` on each service; the console renders it (with `metadata.latencyMs` as a fallback).
- [x] **5. Non-JSON 200 responses were reported as `down`.** `response.json()` sat inside the same `try` as the transport call. *Fix:* parsing moved to its own `try/catch`.
- [x] **6. Sequential probes could block for 45 s** (9 × 5 s) against the console client's 15 s timeout, so the UI could report a timeout while the check was still running. *Fix:* probes run in parallel via `Promise.all`, each with its own `AbortController` timeout (`HEALTH_CHECK_TIMEOUT_MS`, default 5000 ms); the console's check call now allows 60 s.

## P2 — UX / hygiene

- [x] **1. Summary lost on reload.** `summary` only existed in component state after a run, so every card showed `--` on refresh. *Fix:* the console derives counts from the persisted statuses (`totalMs` stays `--` until a check actually runs).
- [x] **2. Misleading `lastUpdated`.** `getHealth()` returned `new Date()` on every read, so the UI claimed a fresh timestamp without a check having run. *Fix:* returns the newest `lastCheck` (or `null` when nothing has ever run).
- [x] **3. No empty state.** *Fix:* an explanatory panel replaces an empty grid.
- [ ] **4. `POST /platform-health/check` writes rows but creates no `AuditLog` entry**, unlike every other `platform.manage` action. *Left open:* needs a user identity plumbed through the controller (see follow-ups).
- [ ] **5. `PrismaSystemHealthRepository.queryRaw(sql)` ignores its argument.** Only ever called with `SELECT 1`, so harmless today — but the signature is a trap.
- [ ] **6. Duplicated logic in `farm-server-modular`.** The fix was mirrored there byte-for-blade, but the copy itself remains a liability: only one of the two servers should exist.

---

## Changes

**`farm-server`**
- `app-server/src/shared/health/health.controller.ts` *(new)* — `GET /health`
- `app-server/src/shared/health/health.module.ts` *(new)*
- `app-server/src/microservices/*.main.ts` (13 files, all but `api.main.ts`) — register `HealthModule`
- `app-server/src/modules/platform/application/services/platform.service.ts` — rewritten `PlatformHealthService`
- `scripts/verify-health-check.js` *(new)* + `package.json` → `npm run test:health`

**`farm-server-modular`**
- `app-server/src/modules/platform/application/services/platform.service.ts` — same fixes, monolith-aware probe resolution

**`farm-client/console`**
- `src/lib/api.ts` — 60 s timeout for the check request
- `src/lib/types/platform-admin.ts` — `memoryUsage` on `PlatformServiceHealth`
- `src/app/(platform)/health/page.tsx` — derived summary, per-service latency, memory row, empty state, silent reload after a check (no spinner flash)

## Verification

1. **Typecheck:** `tsc --noEmit` clean for `farm-server/app-server` and `farm-client/console`. `farm-server-modular` reports 9 errors — verified identical on pristine `HEAD` (pre-existing: missing `@types/node`/`@nestjs/throttler` resolution), none in touched files.
2. **Runtime:** built and booted the merged domains service locally — `Mapped {/health, GET}` from the new controller, livestock's existing `HealthController {/health}` sub-routes still mapped (no route conflict), `GET /health` → `200 {"status":"ok","uptime":116,"memory":96026624}`, `GET /platform-health` → `401` (guards intact).
3. **Logic:** `npm run test:health` exercises `checkAll()`/`getHealth()` against a stub repository and a local stub service — asserts 2xx-JSON→healthy, 2xx-non-JSON→healthy, 404→down, 500→degraded, refused→down with stale uptime/metadata reset, gateway entry at `/v1/health`, correct summary counts, surfaced `latencyMs`, and `lastUpdated` == newest `lastCheck`. All assertions pass.

## Follow-ups (not addressed)

1. Record an `AuditLog` entry for health checks (needs the acting user id passed into `PlatformHealthService.checkAll()`).
2. Delete one of `farm-server` / `farm-server-modular`, or extract the shared platform module so the fix can't drift apart again.
3. In production all eight "services" resolve to one merged domains process (`127.0.0.1:4099` via `server.js`); the logical names are retained for the UI, but they are one process — worth labelling in the UI so eight green cards aren't read as eight machines.
4. Deploy: these fixes only take effect after the Vercel deployment (and the console) are redeployed; the stored `SystemHealth` rows from the broken run will be corrected on the first post-deploy check.
