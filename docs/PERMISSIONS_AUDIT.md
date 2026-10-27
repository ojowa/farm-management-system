# Full-Stack Permission Audit — Server · Admin · Mobile · Console
Date: 2026-10-26
Scope: `farm-server/app-server` + `farm-server/packages/server` (server of record) · `farm-client/admin` (90 routes) · `farm-client/mobile` (24 nav items) · `farm-client/console` (13 platform views)

> **Remediation status (2026-10-27):** the findings below drove a follow-up
> hardening pass. Fixed: **S1** (`PlatformAdminGuard` on platform-api-keys),
> **S2** (`realtime/emit` now uses `PlatformAdminGuard` instead of the dead
> role-name check), **A1** (8 views' Delete buttons now gate on
> `<domain>.delete`), **A2/A3** (inventory/equipment/roles/permissions view
> gates now match what the API accepts), **A5** (`/workers` moved to
> `worker.read` — see the directory/self-service split below), **M1** (mobile
> gained a route-level guard in `(app)/_layout.tsx` driven by the same
> route → permission map), **M2** (raw `includes` replaced with the
> wildcard-aware hook), **M3/M4** (clock-in, send, request-leave and
> notification-delete buttons now mirror the API's `PermissionAny`/write
> keys). Open/policy: **S3** (`/health/routes` public), **S6** (odd key
> semantics), **A4** (`/users` fails closed on `users.manage`), **A6/A7**
> (orphan views), **C1** (console all-or-nothing — coherent as-is), and the
> catalog-hygiene question for `inventory.*`/`notification.delete`/
> `organization.delete` (note `worker.delete` is now enforced).
>
> **Worker directory / self-service split (same pass):** `worker.read`,
> `worker.write` and `worker.delete` now gate ONLY the `/workers` directory
> (`WorkerController`), and a new 51st key **`worker.self`** gates
> self-service (own attendance/tasks/clock) with ownership scoping in the
> service. Seed grants: ORGANIZATION_OWNER r/w/d+self, FARM_MANAGER r/w+self,
> ACCOUNTANT read, SUPERVISOR self only, WORKER self only. Migration
> `20261027000000_worker_directory_self_service_split` brings existing
> databases in line (system roles only; custom roles untouched). The role →
> permission mapping stays fully reassignable from the Roles UI — nothing is
> hardcoded to a role name.
>
> **Assignment pickers keep working without directory access:** because the
> directory moved to `worker.*`, a new minimal **`GET /workers/names`** route
> (`@PermissionAny('hr.read','hr.write')`, service `listWorkerNames`) returns
> id+name+position+farmId only — no profile, payroll or contact fields. Task
> and roster assignee pickers on both clients call it instead of the full
> `GET /workers`, so supervisors/veterinarians (hr.read, no worker.read) can
> still assign work. Worker-*headcount* badges still use `GET /workers?limit=1`
> for its `total`, but each is now gated on `canRead('worker')` so it skips
> cleanly rather than 403-ing for users without the directory.
>
> **Leave privacy (same pass):** a worker now only ever sees THEIR OWN leave.
> `getLeaveRequests` scopes anyone holding neither `hr.write` nor
> `leave.approve` to their own `userId` server-side (the backstop under both
> clients' already-gated UIs), so an `hr.read`-free, `leave.read`-only role
> cannot read colleagues' requests. `GET /leave/requests` additionally accepts
> `leave.approve`/`hr.write`, so an approver-only role can finally reach the
> pending queue it is allowed to decide (previously the route demanded
> `leave.read`/`hr.read` while the approvals views gate on
> `leave.approve`/`hr.write`). The balance `?userId=` override and every
> remaining in-handler check in `hr.service.ts` (task/attendance/comment
> scoping included) now use the **exported** wildcard-aware matcher
> (`hasAnyPermission`/`matchesPermission` from `permission-any.guard.ts`)
> instead of raw `includes`, so a custom role granted `hr.*` behaves exactly
> like one granted the concrete keys. Admin's leave Cancel button is now
> own-only (`canRequest && req.userId === user.id`) to match the server's
> requester-only `cancelLeaveRequest`; managers reject others' rows via the
> approvals queue instead.

## Executive Summary

Authorization is **server-enforced and client-decorated**: the Nest app has no global auth guard — every controller opts in with `@UseGuards(JwtAuthGuard, AuthorizationGuard)` plus a `@Permission`/`@PermissionAny` decorator, and the admin/mobile/console clients gate their chrome (routes, nav rows, buttons) with the *same* permission strings. The good news first:

- All **90** admin routes resolve in `routePermissions.ts`; `AppLayout` renders `AccessDenied` for any route the user fails, and the sidebar filters with the same map, so nav can never offer a link the view would bounce.
- **Every** `@Permission`/`@PermissionAny` string the API enforces exists in the 50-key catalog (`seed.ts:71-122`) — there is no orphan/garbage permission key anywhere in the API.
- Admin ↔ mobile sidebar parity holds on **22 of 24** shared rows (permission + plan-module identical).

The gaps cluster in four themes:

1. **A platform boundary hole:** `platform-api-keys.controller.ts` is the only platform-namespace controller without `PlatformAdminGuard`, and it manages the *platform-wide* key store behind the same `apikey.read/write` keys that gate an org's Settings → Integrations tab (High, S1).
2. **Write/delete split is wrong on 8 admin views:** delete buttons are gated on `.write` where the API demands `.delete` — the button 403s for write-only users and never appears for delete-only users (Medium, A1).
3. **Mobile has no route guard at all** — sidebar visibility only; deep links, dashboard alerts and hub cards reach any screen regardless of permission (High, M1).
4. **Silent 403s:** where a view gate is *looser* than the API, `useFetch` swallows the 403 into an empty state (`useFetch.ts:60-63`), so the symptom is "no data found", not an error.

This document **reports**; it changes no access policy. Recommendations are at the end.

---

## How Enforcement Works

| Layer | Mechanism | Evidence |
|---|---|---|
| Server | Per-controller `@UseGuards(JwtAuthGuard, AuthorizationGuard)` + `@Permission('x')` / `@PermissionAny(a,b)`; `AuthorizationGuard` **returns true when no metadata** (`packages/server/auth/src/nestjs/index.ts:123-125`); `PermissionAnyGuard` likewise with no metadata (`app-server/src/shared/auth/permission-any.guard.ts:48`) | no global `APP_GUARD` — the only one is `ThrottlerGuard` (`auth.module.ts:51`) |
| Gateway edge | `AuthMiddleware` requires a user JWT on every non-public path; public = `auth/*`, `/health*`, `/docs`, `/payments/webhook` (`api/middleware/auth.middleware.ts:19-24`) | microservices themselves boot with cookie-parser/helmet/RLS only (`microservices/farm.main.ts:26-29`) — a controller with no `@UseGuards` is genuinely unauthenticated |
| Admin | `AppLayout` denies views (`AppLayout.tsx:41-44,146`); `Sidebar` filters nav with the same map (`Sidebar.tsx:140-141`); pages self-gate buttons via `usePermission` (`usePermission.ts:20-24`) | `routePermissions.ts` (longest-prefix, `[]` = any authenticated user) |
| Mobile | **Drawer visibility only** — `isSidebarItemVisible` (`sidebarConfig.ts:193-202`) called from `Sidebar.tsx:34-41`; there is no route guard anywhere in the app | `app/(app)/_layout.tsx:10-13` says so explicitly |
| Console | All-or-nothing: `resolvePlatformAdmin` gate (`lib/auth.tsx:43-59,91-95`) + `ProtectedRoute` wrapping every `(platform)` view (`(platform)/layout.tsx:27`); no per-view permission map | server backs this with `PlatformAdminGuard` + `platform.manage` on all 10 platform controllers (except S1 below) |

Wildcards (`*`, `prefix.*`) are matched by `matchesPermission` (`roles.ts:28-44`) and expanded at seed time (`seed.ts:196-200`).

---

## Permission Catalog (source of record)

`farm-server/packages/server/database/prisma/seed.ts:71-122` — **50 keys** (51 as of the 2026-10-27 pass, which added `worker.self`), upserted into the `Permission` table.

| Family | Keys |
|---|---|
| Farm domains | `farm/read/write/delete`, `crop.*`, `livestock.*`, `poultry.*`, `aquaculture.*`, `inventory.*` |
| Finance | `finance.read/write/delete` |
| Workforce | `worker.read/write/delete`, `worker.self` (new), `hr.read/write/delete`, `leave.read/write/approve` |
| Communication | `communication.read/write` (no `.delete`) |
| Reporting / notifications | `reporting.*`, `notification.*` |
| Administration | `organization.read/write/delete/manage`, `users.read`, `users.manage`, `billing.manage`, `role.read/write`, `apikey.read/write` |
| Platform | `platform.manage` |

**Catalog health:**

| Fact | Detail |
|---|---|
| ✅ No orphan API keys | every `@Permission`/`@PermissionAny` literal in `app-server/src` exists in the catalog |
| ⚠️ Dead keys (granted, never enforced by any route) — *updated 2026-10-27* | `inventory.read/write/delete`, `notification.delete`, `organization.delete` (`DELETE /organizations/:id` requires `organization.write`, `organization.controller.ts:127-128`). `worker.delete` is **no longer dead**: it now gates `DELETE /workers/:id`. `inventory.*` is actively **granted** to ORGANIZATION_OWNER, FARM_MANAGER, ACCOUNTANT and WORKER (`seed.ts`) — three roles still carry keys that do nothing (the view gates that used to accept `inventory.read` were removed in the A2 fix). |
| ⚠️ `hr.manage` does not exist | zero hits repo-wide. (Admin's `canApprove(domain)` derives `<domain>.manage`; it is currently unused, so nothing breaks — but the helper would silently return false for HR.) |

---

## Findings — Server API

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| S1 | **High** | `platform-api-keys.controller.ts` has only `JwtAuthGuard, AuthorizationGuard` — **no `PlatformAdminGuard`**, unlike `platform-roles`, `platform-permissions` and all 10 platform controllers. It manages the platform-wide key store (`listAll()`, create/toggle/delete) behind `apikey.read`/`apikey.write` — the *same* keys an org role gets for its own Settings → Integrations tab (`settings.tsx:54-55`). Any authenticated org user holding those keys can list, create, toggle and delete **platform-wide** API keys by calling the endpoint directly. The console's API Keys view targets this controller (`console/src/lib/api.ts:258-261`). | `platform-api-keys.controller.ts:5,10-29`; contrast `platform-roles.controller.ts:8` (`G+PA`) |
| S2 | Medium | `POST /realtime/emit` gates itself with `req.user?.role !== 'PLATFORM_ADMIN'`. `req.user.role` is a role *name* from the JWT (`jwt.ts:19,70`), and no canonical role is named `PLATFORM_ADMIN` (`ROLES` = SUPER_ADMIN/SUPPORT_ADMIN/ORGANIZATION_OWNER/FARM_MANAGER/ACCOUNTANT/SUPERVISOR/VETERINARIAN/WORKER, `roles.ts:8-17`). The check therefore **always throws** — the endpoint is permanently 403 for everyone (dead feature, not an open door). The working platform-admin test is DB `role.isPlatformAdmin` (`platform-admin.guard.ts`). | `realtime.controller.ts:13-18` |
| S3 | Low | `/health/routes` (the internal service routing table) is unauthenticated: the proxy health controller has no guard and `/health*` is on the AuthMiddleware public list. Topology disclosure, no secrets. | `api/proxy/health.controller.ts:31`; `auth.middleware.ts:19-21` |
| S4 | Info | No global auth guard: default-open is the framework behaviour (guard returns true with no metadata). Today every sensitive controller opts in; a new controller that forgets `@UseGuards` ships unprotected, and microservice ports (4010-4021) have no edge middleware at all. | `auth.module.ts:51`; `nestjs/index.ts:123-125`; `farm.main.ts:26-29` |
| S5 | Info | **Consistent-open, verified:** `/weather` is JWT-only (any authenticated user) and both clients gate `/weather` on nothing — correct alignment, listed so it isn't re-flagged. | `weather.controller.ts:80-81`; `routePermissions.ts:36`; `sidebarConfig.ts:164` |
| S6 | Low | Odd permission semantics: notification **mark-read / read-all / device-token register+unregister** are gated by `notification.read` (a read key performing writes); `DELETE /organizations/:id` needs `organization.write` not `.delete`; `GET leave/on-leave` needs `hr.read` only while its siblings accept `Any(leave.read, hr.read)`; `/correspondence` never accepts `communication.*` even though both navs file it under module `communication`. | `notification.controller.ts:127,133,169,188`; `organization.controller.ts:127-128`; `hr.controller.ts:539,715-788` |
| S7 | Info | Unguarded surface (all intentional, recorded for completeness): `/health*`, `/payments/webhook` (HMAC), `/realtime/emit-internal` (service token verified in-handler), 4 public + 16 Jwt-only `/auth/*` routes, `GET /org-admin/me`. | `auth.middleware.ts:19-24,42-54`; `realtime-internal.controller.ts:35-47` |

---

## Findings — Admin Views (90 routes)

**Baseline (holds today, pinned by tests):** every route resolves in `routePermissions.ts`; `AppLayout` denies on arrival; sidebar and view share one map — `navPlanGates.test.ts` already pins sidebar coverage, and `permissionCatalog.test.ts` (new) extends this to the whole route tree + catalog.

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| A1 | **Medium** | **Delete buttons gated on `.write` where the API demands `.delete`** — 8 views set `readOnly = !canCreate('finance'\|'farm')` and wrap their Delete affordance in `!readOnly`, so the button shows for `*.write` holders but the API needs `finance.delete`/`farm.delete` (403), and a `*.delete`-only user never sees the button at all. Affected: contracts list + detail, marketplace buyers + listings, finance transactions, finance budgets (budget *and* category), inventory list + detail, equipment. Contrast the 13 views that do it correctly via `canDelete(domain)`: farms, crops catalog, poultry flocks/houses, workers, departments, tasks, correspondence, leave types. | gates: `contracts/page.tsx:78`, `contracts/[id]/page.tsx:66`, `marketplace/page.tsx:84`, `finance/transactions/page.tsx:63`, `finance/budgets/page.tsx:61`, `inventory/page.tsx:55`, `inventory/[id]/page.tsx:44`, `equipment/page.tsx:66`; API: `finance.controller.ts:79,136,181,213,243,272,311`, `asset.controller.ts:535,695` |
| A2 | **Medium** | `/inventory` and `/equipment` accept `inventory.read` **alone** (`routePermissions.ts:51-52`) but the API enforces `farm.read` exclusively (`asset.controller.ts:337+`, never `inventory.*`). An inventory-only user passes the view gate, every request 403s, `useFetch` swallows it → an empty page that looks like "no inventory". | `routePermissions.ts:51-52` vs `asset.controller.ts:337-696` |
| A3 | **Medium** | `/roles` and `/permissions` accept `role.read` alone (`routePermissions.ts:28-29`) but the org APIs require `organization.read` (`roles.controller.ts:17,23`; `org-admin.controller.ts:45,51`). `role.read` is only ever enforced behind `PlatformAdminGuard` on `/platform-roles`. Same silent-empty failure mode as A2. | `routePermissions.ts:28-29` |
| A4 | Low | `/users` requires `users.manage` (`routePermissions.ts:27`) while the read API also accepts `users.read` (`org-admin.controller.ts:21`, `auth.controller.ts:239-241`) — a read-only user can't open a list the API would serve. Fails *closed*, so it's a capability gap, not a hole. | as cited |
| A5 | Low | `/workers`, `/tasks`, `/roster` gate on `hr.read` only (`routePermissions.ts:55-57`) while the APIs accept `Any(hr.read, worker.read)` (`hr.controller.ts:178,277,417,451`) — a `worker.read`-only user is locked out of admin views their own API calls would answer. Mobile deliberately widens `/tasks` to both (`sidebarConfig.ts:106`), so the two clients differ here. | as cited |
| A6 | Low | **`/analytics` is an orphan with a gate mismatch.** It is referenced nowhere outside its own page + `routePermissions` (no sidebar entry, no link, no tab). Its gate is `reporting.read\|finance.read`, but it loads farms, crops, livestock, expenses and sales (`analytics/page.tsx:15-17`) — a reporting-only user passes the gate and gets five 403s swallowed by `Promise.allSettled` → an entirely empty dashboard. | `routePermissions.ts:70`; `analytics/page.tsx:15-17` |
| A7 | Low | **`/finance/budgets` is an orphan** — reachable only by typing the URL (covered by the `/finance` prefix gate, but no nav item, link or tab points to it). | grep: zero references outside its own `page.tsx` |
| A8 | Info | `/correspondence` is gated `hr.read` (matching the API) but its nav `module` is `communication` (`Sidebar.tsx:95`) — the *plan* axis (`communication`) and the *permission* axis (`hr`) disagree; a plan entitled to communication still needs `hr.read` to see anything. | as cited |

---

## Findings — Mobile Views (24 nav items)

**Baseline:** mobile sidebar rows match admin on 22/24 shared routes (full table below).

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| M1 | **High** | **No route-level guard exists.** The `permissions` on a sidebar entry only filter drawer rows (`sidebarConfig.ts:193-202` ← `Sidebar.tsx:34-41`); the router is a bare `<Stack>`. Reachability bypasses: push-notification deep-link allowlist of 16 screens incl. `/(app)/finance`, `/(app)/leave`, `/(app)/subscription` (`notifications.ts:246-278`), dashboard alerts (`app/(app)/index.tsx:366-396`), unfiltered module hub cards on 7 index screens, and task cross-links (`taskLinks.ts:34-116`). A user without `finance.read` never sees the nav row but can land on `/finance`. Server still enforces the API, so exposure is UI leakage + 403 noise rather than data access. | as cited; `app/(app)/_layout.tsx:10-13` documents the design |
| M2 | Medium | Two screens bypass the wildcard-aware hook with raw `user?.permissions?.includes(...)`, so `*`/`prefix.*` holders are locked out of controls the API would allow: `settings.tsx:155-156` (`organization.manage`, `billing.manage`), `aquaculture/[id]/index.tsx:194-195` (`aquaculture.write/delete`). Sibling files already migrated away **with comments saying why** (`farms/list.tsx:119`, `aquaculture/index.tsx:136`) — these two are leftovers. | as cited |
| M3 | Medium | Controls **narrower than the API**: messages send gated `communication.write` only while the API accepts `Any(hr.write, communication.write)` (`hr.controller.ts:699`) → an HR manager can't send from mobile; attendance clock gated `hr.write` only while clock-in/out accept `Any(hr.write, worker.write)` (`hr.controller.ts:234,244`) → **a worker can't clock in from mobile** (admin has the same narrowing, `workers/attendance/page.tsx:111`). | as cited |
| M4 | Medium | Controls **ungated**: notifications Delete (`notifications.tsx:403`) — admin gates it on `notification.write`, API requires `notification.write` (`notification.controller.ts:140`) → 403 for anyone without it; "Request leave" (`leave.tsx:587`) shown unconditionally while API needs `Any(leave.write, hr.write)` (`hr.controller.ts:578`). | as cited |
| M5 | Info | 45 of the `(app)` screens contain no permission helper at all (add/edit forms, hub screens). Harmless for data (server enforces), but combined with M1 they are fully navigable. | file scan |
| M6 | Info | Parity differences (both deliberate/documented): `/tasks` mobile widens to `hr.read\|worker.read` (`sidebarConfig.ts:14-18`, pinned by `navPlanGates.test.ts:133-141`); `/attendance` is a mobile-only nav row (admin folds it into `/workers/attendance` as a tab). | as cited |

---

## Findings — Console (13 platform views)

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| C1 | Info | All-or-nothing model: `resolvePlatformAdmin` (`lib/auth.tsx:43-59`, deny at `:91-95`) + `ProtectedRoute` around every `(platform)` view (`(platform)/layout.tsx:27`). **No per-view permission map** — every platform view is equally visible once the gate passes. This is coherent *because* the server backs it: all 10 platform controllers use `PlatformAdminGuard` + `platform.manage`. | as cited |
| C2 | Low | The console's API Keys view (`api.ts:258-261`) targets the S1 controller — the one platform surface whose server route is missing `PlatformAdminGuard`. The console itself only admits platform admins, so the client is fine; the hole is a direct API call with an org token. | S1 |

---

## Admin ↔ Mobile Sidebar Parity (all 24 mobile rows)

| Route | Mobile perms | Admin perms (`routePermissions`) | Module (both) | Status |
|---|---|---|---|---|
| `/` | `[]` | unmapped → open | — | OK |
| `/users` | `users.manage` | `users.manage` | — | OK |
| `/roles` | `role.read\|organization.read` | same | — | OK (see A3 vs API) |
| `/farms` | `farm.read` | `farm.read` | `farm` | OK |
| `/crops` | `crop.read` | `crop.read` | `crop` | OK |
| `/livestock` | `livestock.read` | `livestock.read` | `livestock` | OK |
| `/poultry` | `poultry.read` | `poultry.read` | `poultry` | OK |
| `/aquaculture` | `aquaculture.read` | `aquaculture.read` | `aquaculture` | OK |
| `/inventory` | `farm.read\|inventory.read` | same | `inventory` | matches admin, but see A2 (API only takes `farm.*`) |
| `/equipment` | `farm.read\|inventory.read` | same | `inventory` | same as `/inventory` |
| `/workers` | `hr.read` | `hr.read` | `hr` | OK (see A5) |
| `/roster` | `hr.read` | `hr.read` | `hr` | OK |
| **`/tasks`** | **`hr.read\|worker.read`** | **`hr.read`** | `worker` | ⚠ mobile wider — documented |
| **`/attendance`** | **`hr.read\|worker.read`** | *unmapped (admin: `/workers/attendance` = `hr.read`)* | `hr` | ⚠ mobile-only row, wider |
| `/leave` | `hr.read\|leave.read` | admin path `/hr/leave` = same | `hr` | OK (path differs) |
| `/messages` | `hr.read\|communication.read` | same | `communication` | OK |
| `/correspondence` | `hr.read` | `hr.read` | `communication` | matches, see A8 |
| `/finance` | `finance.read` | `finance.read` | `finance` | OK |
| `/contracts` | `finance.read` | `finance.read` | `finance` | OK |
| `/marketplace` | `finance.read` | `finance.read` | `finance` | OK |
| `/reports` | `reporting.read` | `reporting.read` | `reporting` | OK |
| `/weather` | `[]` | `[]` | — | OK (matches JWT-only API) |
| `/subscription` | `billing.manage` | `billing.manage` | — | OK |
| `/settings` | `[]` | `[]` | — | OK (Integrations tab gated `apikey.*` inside) |

Admin-only routes with no mobile nav row: `/permissions`, `/fields`, `/irrigation`, `/analytics` (A6), `/notifications`.

---

## What the Guard Test Pins (`admin/src/__tests__/permissionCatalog.test.ts`)

Invariants that hold **today** — any regression fails CI:

1. The seed catalog parses to exactly 50 keys.
2. Every permission in `routePermissions.ts` exists in the catalog.
3. Every literal permission used by admin views — `hasPermission('…')`, `hasAnyPermission(…)`, and `canCreate/Read/Update/Delete/Approve('domain')` derived as `<domain>.<action>` — exists in the catalog.
4. Every `page.tsx` under `app/(app)` resolves `requiredPermissionsForPath` to a non-null gate (no unlisted view).
5. Every mobile sidebar permission string exists in the catalog, and every mobile row whose route also exists in the admin map gates **identically**, with exactly two allow-listed differences (`/tasks`, `/attendance`).

---

## Recommendations (report-only — policy calls for the owner)

1. **S1 first:** add `PlatformAdminGuard` to `platform-api-keys.controller.ts` (one line, matches its nine sibling controllers).
2. **A1:** switch the 8 affected views from `!readOnly` to `canDelete('finance'|'farm')` for Delete affordances — pure UI alignment with what the API already demands.
3. **A2/A3:** either drop `inventory.read` from the `/inventory`+`/equipment` gates and `role.read` from `/roles`+`/permissions`, or teach the API those keys — currently the view promises something the API refuses (silent-empty today).
4. **M1:** give mobile an arrival guard mirroring admin's (`requiredPermissionsForPath`-equivalent applied in the `(app)` layout + the deep-link resolver), keeping the drawer filter as a nicety.
5. **M2:** replace the two raw `includes` calls with the wildcard-aware hook (siblings already did).
6. **M3/M4:** widen mobile's send/clock gates to `PermissionAny` parity with the API; gate notifications Delete on `notification.write` and Request-leave on `leave.write|hr.write`.
7. **S2/S3:** fix `realtime/emit` to use `PlatformAdminGuard` (or delete the dead route); move `/health/routes` off the public list if topology matters.
8. **Catalog hygiene:** decide whether `inventory.*`/`worker.delete`/`notification.delete`/`organization.delete` should be enforced somewhere or stopped being granted (`inventory.*` currently granted to 4 roles).
