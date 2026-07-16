# Security Hardening — RBAC Audit Fixes

This document records all security fixes applied after the RBAC security audit.
Each fix references the original audit finding and explains what changed.

---

## Table of Contents

1. [Fix 1: Hardcoded JWT Secret Fallbacks](#fix-1-hardcoded-jwt-secret-fallbacks)
2. [Fix 2: Auth-Service Controller Guards](#fix-2-auth-service-controller-guards)
3. [Fix 3: Permissions in JWT (Old Auth-Service)](#fix-3-permissions-in-jwt-old-auth-service)
4. [Fix 4: WebSocket Authentication](#fix-4-websocket-authentication)
5. [Fix 5: Rate Limiting on Auth Endpoints](#fix-5-rate-limiting-on-auth-endpoints)
6. [Fix 6: Cookie Secure Flag](#fix-6-cookie-secure-flag)
7. [Fix 7: Defense-in-Depth on Dead-Code Controllers](#fix-7-defense-in-depth-on-dead-code-controllers)
8. [Fix 8: Web App Type Error (role as object)](#fix-8-web-app-type-error-role-as-object)
9. [Fix 9: organizationId from Client Query Params Removed](#fix-9-organizationid-from-client-query-params-removed)
10. [Fix 10: Header-First getOrgId in HR Controllers](#fix-10-header-first-getorgid-in-hr-controllers)
11. [Remaining Open Items](#remaining-open-items)

---

## Fix 1: Hardcoded JWT Secret Fallbacks

**Audit Finding:** CRITICAL #1 — Hardcoded fallbacks (`'dev-secret'`, `'secret'`)
allow anyone to forge tokens if the env var is missing.

**What changed:**

| File | Before | After |
|------|--------|-------|
| `packages/auth/src/jwt.ts` | Unused `DEFAULT_SECRET = 'secret'` | Removed dead constant |
| `services/auth-service/src/main.ts:24` | `process.env.JWT_SECRET \|\| 'dev-secret'` | `process.env.JWT_SECRET` (throws if missing) |
| `services/auth-service/src/modules/auth/auth.service.ts:11-12` | `getJwtSecret()` / `getJwtRefreshSecret()` with fallbacks | Both throw if env var missing |
| `services/auth-service/src/application/services/auth.service.ts:13-14` | Same fallback pattern | Same throw pattern |
| `services/platform-service/src/guards/platform-admin.guard.ts:19,70` | `\|\| 'secret'` in both guards | Throws if missing |
| `services/api-gateway/src/modules/auth/strategies/jwt.strategy.ts:12` | `\|\| 'secret'` | Throws via IIFE |
| `services/api-gateway/src/modules/auth/auth.module.ts:12` | `\|\| 'secret'` | Throws via IIFE |

**`.env` additions:**
```
JWT_REFRESH_SECRET=<new 128-char hex string>
```

**Behavior:** Services will refuse to start if `JWT_SECRET` or `JWT_REFRESH_SECRET`
is not set. No more silent fallback to insecure defaults.

---

## Fix 2: Auth-Service Controller Guards

**Audit Finding:** CRITICAL #2 — Admin, org-admin, roles, permissions, api-keys
controllers had ZERO authorization guards.

**What changed:**

| Controller | Before | After |
|------------|--------|-------|
| `presentation/controllers/admin.controller.ts` | No guards | `@UseGuards(JwtAuthGuard, AuthorizationGuard)` + `@Permission('platform.manage')` on all endpoints |
| `presentation/controllers/org-admin.controller.ts` | No guards | `@UseGuards(JwtAuthGuard, AuthorizationGuard)` + `@Permission('users.read'/'users.manage'/'organization.manage')` per method |
| `presentation/controllers/api-keys.controller.ts` | No guards | `@UseGuards(JwtAuthGuard, AuthorizationGuard)` |
| `presentation/controllers/roles.controller.ts` | Imported but unused | `@UseGuards(JwtAuthGuard, AuthorizationGuard)` + `@Permission('organization.read'/'organization.manage')` |
| `presentation/controllers/permissions.controller.ts` | No guards | `@UseGuards(JwtAuthGuard, AuthorizationGuard)` + `@Permission('organization.read'/'organization.manage')` |
| `presentation/controllers/auth.controller.ts` | No guards on profile/password/2FA/sessions | `@UseGuards(JwtAuthGuard)` on all protected endpoints; login/register/refresh remain public |

Also added `DELETE /auth/sessions` and `DELETE /auth/sessions/:tokenId` endpoints
to the auth controller (were missing).

**Dead-code `modules/` layer** (not registered in app.module, but guarded for defense-in-depth):
- `modules/admin/admin.controller.ts` — same guards added
- `modules/org-admin/org-admin.controller.ts` — same guards added
- `modules/api-keys/api-keys.controller.ts` — same guards added

---

## Fix 3: Permissions in JWT (Old Auth-Service)

**Audit Finding:** HIGH #13 — The `application/services/auth.service.ts` in
auth-service generated JWTs WITHOUT permissions array, so users got empty
permissions.

**What changed:**

`services/auth-service/src/application/services/auth.service.ts`:
- Added `import { prisma } from '@farm/database'`
- `generateAccessToken()` now queries `prisma.rolePermission` to load the user's
  role permissions and embeds them in the JWT payload as `permissions: string[]`

---

## Fix 4: WebSocket Authentication

**Audit Finding:** CRITICAL #4 — WebSocket gateways had no authentication.
Any client could connect and join any user's room.

**What changed:**

| Gateway | Before | After |
|---------|--------|-------|
| `api-gateway/src/modules/realtime/realtime.gateway.ts` | No auth, `origin: '*'` | JWT verification via `verifyAccessToken()` on connect; userId validated on `join`/`leave`; CORS restricted to known origins |
| `notification-service/src/modules/notification/notification.gateway.ts` | No auth, `origin: '*'` | Same JWT verification; same CORS restriction |

**How it works:**
1. Client must pass token via `socket.auth.token` or `socket.handshake.query.token`
2. `handleConnection()` verifies JWT and stores `client.userId`
3. `handleJoinRoom()` verifies the requested `userId` matches the authenticated user
4. Unauthenticated clients are disconnected immediately

**Client-side change required:** Clients must now pass the JWT when connecting:
```typescript
const socket = io('http://localhost:4020', {
  auth: { token: accessToken }
});
```

---

## Fix 5: Rate Limiting on Auth Endpoints

**Audit Finding:** HIGH #11 — No rate limiting on auth endpoints. Brute-force
login, 2FA bypass, and token refresh attacks possible.

**What changed:**

- Installed `@nestjs/throttler` in `auth-service` and `api-gateway`
- Added `ThrottlerModule.forRoot()` in `auth-service/src/app.module.ts` with
  named throttlers: `default` (30/min), `auth` (10/min), `2fa` (5/5min)
- Added `APP_GUARD` with `ThrottlerGuard` as global guard
- Added `@Throttle()` decorators on sensitive endpoints:
  - `POST /auth/login` — 10 requests/minute
  - `POST /auth/register` — 5 requests/minute
  - `POST /auth/verify-mfa` — 5 requests/5 minutes
  - `POST /auth/refresh` — 20 requests/minute

---

## Fix 6: Cookie Secure Flag

**Audit Finding:** HIGH #7 — Cookies had `secure: false` hardcoded, sent
over HTTP, vulnerable to MITM.

**What changed:**

`services/auth-service/src/presentation/controllers/auth.controller.ts`:
```typescript
// Before
const COOKIE_OPTS = { httpOnly: true, secure: false, sameSite: 'lax', path: '/' };

// After
const isProduction = process.env.NODE_ENV === 'production';
const COOKIE_OPTS = { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' };
```

Cookies now use `Secure` flag when `NODE_ENV=production`.

---

## Fix 7: Defense-in-Depth on Dead-Code Controllers

The `modules/` layer controllers (`modules/admin/`, `modules/org-admin/`,
`modules/api-keys/`) are NOT registered in `app.module.ts` and are dead code.
However, guards were added to prevent accidental activation without protection.

All three now have `@UseGuards(JwtAuthGuard, AuthorizationGuard)` at class level
with appropriate `@Permission()` decorators.

---

## Fix 8: Web App Type Error (role as object)

**What changed:**

`apps/web/src/app/(app)/settings/page.tsx`:
- Line 415: `{user?.role || 'N/A'}` → `{typeof user?.role === 'object' ? (user.role as any)?.name : user?.role || 'N/A'}`
- Line 118: `[user?.role]` → `[user?.role?.name]` (dependency array)

The API returns `role` as `{ name, permissions }` object but the template
rendered it directly, causing a React type error.

---

## Fix 9: Service-to-Service Authentication (CRITICAL #3)

**Audit Finding:** CRITICAL #3 — Downstream services trust `x-user-id`,
`x-organization-id`, `x-user-role` headers without verification. Any client
reaching service ports directly can spoof these headers for full RLS bypass.

**What changed:**

1. **`packages/auth/src/jwt.ts`** — Added `signServiceToken()` and
   `verifyServiceToken()` using a separate `SERVICE_SECRET`

2. **`services/api-gateway/src/infrastructure/routing/proxy.middleware.ts`**
   — Gateway now signs a short-lived (30s) service token containing verified
   user context. Sent as `x-service-token` header to downstream services.

3. **`packages/database/src/middleware.ts`** — RLS middleware now verifies
   `x-service-token` before trusting headers. If valid, uses verified user
   context from the token. Falls back to raw headers only if no service
   token is present (legacy path).

4. **Controllers fixed** — Removed header fallbacks from controllers that
   already have `JwtAuthGuard`:
   - `farm-service/map.controller.ts` — `req.user?.organizationId` only
   - `farm-service/import-export.controller.ts` — same
   - `livestock-service/livestock.controller.ts` — same

**Env var added:** `SERVICE_SECRET` in `.env`

**How it works:**
```
Client → Gateway (verifies JWT, signs service token) → Service (verifies service token, trusts headers)
Direct access → Service (no valid service token → headers not trusted → RLS blocks data)
```

---

## Fix 10: Input Validation with class-validator

**Audit Finding:** HIGH #17 — No input validation on admin/org/roles/permissions endpoints.

**What changed:**

- Installed `class-validator` and `class-transformer` in auth-service
- Created `services/auth-service/src/presentation/dto/auth.dto.ts`:
  `LoginDto`, `RegisterDto`, `RefreshTokenDto`, `VerifyMfaDto`,
  `ChangePasswordDto`, `UpdateProfileDto`
- Created `services/auth-service/src/presentation/dto/admin.dto.ts`:
  `UpdateSubscriptionDto`
- Added `@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))`
  to `AuthController` and `AdminController`

---

## Fix 11: MFA Secret Separation

**Audit Finding:** MEDIUM #18 — MFA tokens signed with same secret as access tokens.

**What changed:**

- Added `MFA_SECRET` to `.env`
- `services/auth-service/src/modules/auth/auth.service.ts` — `getMfaSecret()`
  reads from `process.env.MFA_SECRET`, throws if missing
- `services/auth-service/src/application/services/auth.service.ts` — same
- MFA token signing/verification now uses `MFA_SECRET` instead of `JWT_SECRET`

---

## Fix 12: Client-Side Route Guards

**Audit Finding:** HIGH #16 — No client-side route guards in web app.

**What changed:**

- `apps/web/src/middleware.ts` — Next.js middleware that checks `accessToken`
  cookie; redirects to `/login` if missing; public paths: `/login`, `/register`,
  `/api/auth`
- `apps/admin/src/middleware.ts` — Same pattern; public paths: `/login`
- `apps/console/src/components/ProtectedRoute.tsx` — React component that
  checks auth context; redirects to `/login` if unauthenticated
- `apps/console/src/app/(platform)/layout.tsx` — Wrapped children with
  `<ProtectedRoute>`

---

## Fix 9: organizationId from Client Query Params Removed

**Audit Finding:** HIGH #10 — Controllers accepted `organizationId` from client
query params, allowing any authenticated user to access any organization's data.

**What changed:**

All controllers across finance-service, crop-service, reporting-service, and
farm-service now extract `organizationId` from `req.user?.organizationId` (the
verified JWT) instead of `@Query('organizationId')`.

**Active controllers fixed:**
- `finance-service/src/presentation/controllers/finance.controller.ts` — 4 controllers
- `finance-service/src/presentation/controllers/profitability.controller.ts`
- `reporting-service/src/presentation/controllers/report.controller.ts` — ScheduledReportController
- `farm-service/src/presentation/controllers/farm.controller.ts` — FarmController

**Dead-code module controllers updated (defense-in-depth):**
- `finance-service/src/modules/finance/` — all 6 controllers
- `crop-service/src/modules/crop/` — yield, pest-disease, lifecycle, irrigation
- `farm-service/src/modules/farm/farm.controller.ts`

---

## Fix 10: Header-First getOrgId in HR Controllers

**Audit Finding:** MEDIUM #26 — HR service controllers checked
`req.headers['x-organization-id']` BEFORE `req.user?.organizationId`. A client
could spoof the header to access another organization's data.

**What changed:**

All 9 active hr-service controllers now check JWT first:
```typescript
// Before (vulnerable)
function getOrgId(req: any): string {
  return String(req['x-organization-id'] || req.user?.organizationId || '');
}

// After (safe)
function getOrgId(req: any): string {
  return String(req.user?.organizationId || req['x-organization-id'] || '');
}
```

**Controllers fixed:**
- `tasks.controller.ts`, `attendance.controller.ts`, `shifts.controller.ts`
- `shiftassignments.controller.ts`, `leavetypes.controller.ts`
- `leaverequests.controller.ts`, `leavebalance.controller.ts`
- `messages.controller.ts`, `correspondence.controller.ts`
- `hr.controller.ts` (presentation, dead-code)

Same fix applied to `getUserId` in messages.controller.ts and
correspondence.controller.ts (JWT's `user.id` checked before `x-user-id` header).

---

## Deployment Configuration

### Vercel (Frontend Apps)

Created `vercel.json` for each frontend app:
- `apps/web/vercel.json` — `@farm/web` build, Next.js framework
- `apps/admin/vercel.json` — `@farm/admin` build, Next.js framework
- `apps/console/vercel.json` — `@farm/console` build, Next.js framework

All include security headers (X-Frame-Options, X-Content-Type-Options,
Referrer-Policy) and SPA rewrites.

### Render (Backend Services)

Created `infra/render.yml` defining:
- PostgreSQL 16 database
- 13 backend services (API gateway on standard plan, all others on starter)
- Auto-linked DATABASE_URL from database
- Health checks on all services
- Secrets (JWT_SECRET, JWT_REFRESH_SECRET, MFA_SECRET, SERVICE_SECRET)
  configured via Render dashboard (sync: false)

---

## Remaining Open Items

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 8 | Seed script uses `password123` | HIGH | **FIXED** — random bcrypt-hashed passwords |
| 9 | Unscoped `prisma` in admin controllers | HIGH | Documented — platform-level access, guarded by `@Permission('platform.manage')` |
| 10 | `organizationId` from client query params | HIGH | **FIXED** — all controllers now use `req.user?.organizationId` from verified JWT |
| 19 | Missing HR permissions in seed data | MEDIUM | **FIXED** — hr.read, hr.write, leave.read, leave.write, leave.approve added |
| 24 | JWT metadata logged to console | LOW | **FIXED** — console.log removed |
| 25 | Mobile HTTP-only API URL | LOW | **FIXED** — .env.example updated, dev-time HTTPS warning added to api.ts |
| 26 | Header-first `getOrgId` in HR controllers | MEDIUM | **FIXED** — JWT now checked before `x-organization-id` header |
| 27 | `x-organization-id` header fallback in active controllers | HIGH | **FIXED** — active controllers use JWT-only; dead-code modules updated for defense-in-depth |
