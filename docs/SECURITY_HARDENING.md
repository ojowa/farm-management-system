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
9. [Remaining Open Items](#remaining-open-items)

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

## Remaining Open Items

These findings from the audit were NOT addressed in this batch and remain open:

| # | Finding | Severity | Notes |
|---|---------|----------|-------|
| 3 | RLS bypass via header spoofing | CRITICAL | Requires service-to-service auth tokens or mTLS — architectural change |
| 8 | Seed script uses `password123` | HIGH | Only affects dev seed data |
| 9 | Unscoped `prisma` in admin controllers | HIGH | Admin endpoints use platform-level access; needs org-scoped guard |
| 10 | `organizationId` from client query params | HIGH | Needs middleware validation |
| 12 | WebSocket CORS was `origin: '*'` | HIGH | **Fixed** (now restricted to known origins) |
| 16 | No client-side route guards in web app | HIGH | Frontend-only, needs middleware/route groups |
| 17 | No input validation on admin endpoints | MEDIUM | Needs DTOs with `class-validator` |
| 18 | MFA tokens signed with same secret as access tokens | MEDIUM | Needs separate MFA secret |
| 19 | Missing HR permissions in seed data | MEDIUM | Seed data change |
| 21 | Service-to-service calls not authenticated | MEDIUM | Architectural — mTLS or service tokens |
| 24 | JWT metadata logged to console | LOW | Remove `console.log` in middleware |
| 25 | Mobile HTTP-only API URL | LOW | Needs HTTPS for production |
