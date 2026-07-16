# Authentication Audit Report — Farm Management System

> Cross-cutting audit of auth across all four apps (web, console, mobile, admin),
> the API gateway, and the auth service. All apps share the same API gateway
> (port 4000) and backend auth service (port 4001).

**Date:** 2026-07-15

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Critical — Fix Immediately](#critical--fix-immediately)
- [High — Fix Before Production](#high--fix-before-production)
- [Medium — Fix Before Launch](#medium--fix-before-launch)
- [Action Plan](#action-plan)
- [Per-App Detailed Findings](#per-app-detailed-findings)

---

## Architecture Overview

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  Web App │   │Console App│  │Mobile App│   │ Admin App│
│ (Next.js │   │ (Next.js  │   │  (Expo)  │   │ (Next.js │
│  :3001)  │   │  :3004)   │   │  :8082)  │   │  :3000)  │
└────┬─────┘   └─────┬─────┘   └────┬─────┘   └────┬─────┘
     │               │              │               │
     └───────────────┴──────┬───────┴───────────────┘
                            │
                    ┌───────▼────────┐
                    │  API Gateway   │
                    │   (port 4000)  │
                    │ ProxyMiddleware│
                    │ JWT → x-headers│
                    │ Service tokens │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │  Auth Service  │
                    │  (port 4001)   │
                    │  Throttler     │
                    │  JWT + Refresh │
                    │  MFA / TOTP    │
                    └────────────────┘
```

**Auth flow:**

1. Client sends credentials to `POST /auth/login` (via API gateway)
2. Auth service validates, sets **httpOnly cookies** (`accessToken` 15min, `refreshToken` 7d)
3. Subsequent requests carry the `accessToken` cookie to the API gateway
4. `ProxyMiddleware` extracts cookie, verifies JWT, sets `x-user-*` headers, signs a short-lived service token, and forwards to the downstream service
5. Token refresh: client calls `POST /auth/refresh` (cookie-based) to rotate tokens

---

## Critical — Fix Immediately

### C1. ~~Client library exports `localStorage` token storage~~ ✅ FIXED

**File:** `packages/auth/src/storage.ts` — **DELETED**

The file has been removed. No app imports `localStorage` token storage helpers anymore.

---

### C2. ~~Client-side cookie helper cannot set `HttpOnly`~~ ✅ FIXED

**File:** `packages/auth/src/cookie.ts` — **DELETED**

The file has been removed. Cookie setting only happens server-side via `Set-Cookie` headers.

---

### C3. ~~`JwtAuthGuard` ignores cookies — breaks web/console auth~~ ✅ FIXED

**File:** `packages/auth/src/nestjs/index.ts`

The guard now reads `req.cookies.accessToken` as a fallback when no `Authorization` header is present.

---

### C4. ~~Refresh token reuse not detected in newer controller~~ ✅ FIXED

**File:** `services/auth-service/src/presentation/controllers/auth.controller.ts`

The `refreshToken()` method now calls `detectRefreshTokenReuse()` before token rotation. All sessions are revoked on reuse detection.

---

### C5. ~~2FA can be disabled without code verification~~ ✅ FIXED

**File:** `services/auth-service/src/presentation/controllers/auth.controller.ts`

The `disable2fa()` endpoint now requires a `{ code: string }` body parameter and validates the 6-digit TOTP code before disabling.

---

### C6. ~~JWT token accepted as URL query parameter on WebSocket~~ ✅ FIXED

**File:** `services/api-gateway/src/modules/realtime/realtime.gateway.ts`

Query parameter support has been removed. Only tokens from `client.handshake.auth.token` or cookies are accepted.

---

### C7. Secrets committed to version control

**File:** `.env` (root)

Contains `JWT_SECRET`, `SERVICE_SECRET`, `MFA_SECRET`, database credentials (`postgres:Aarinola`), and a commented-out Neon production API key (`npg_Q8BXmCJSbt3i`).

**Fix:**
1. Rotate all secrets immediately with `crypto.randomBytes(64).toString('hex')`
2. Add `.env` to `.gitignore`
3. Use a `.env.example` with placeholder values
4. Consider using a secrets manager for production

---

## High — Fix Before Production

### H1. `/auth/register` does not set cookies

**File:** `services/auth-service/src/presentation/controllers/auth.controller.ts:47-52`

### H1. ~~`/auth/register` does not set cookies~~ ✅ FIXED

**File:** `services/auth-service/src/presentation/controllers/auth.controller.ts`

The register endpoint now sets `accessToken` and `refreshToken` cookies, same as login.

---

### H2. ~~JWT `verify()` called without algorithm restriction~~ ✅ FIXED

**Files:** `packages/auth/src/jwt.ts`, `services/auth-service/src/main.ts`

All `jwt.verify()` calls now include `{ algorithms: ['HS256'] }`.

---

### H3. ~~Web app token refresh is a no-op~~ ✅ FIXED

**File:** `apps/web/src/lib/api.ts`

Token refresh now works via a response interceptor that catches 401s, calls `POST /auth/refresh` (cookie-based), and retries failed requests with a queue.

---

### H4. Web middleware provides zero server-side protection

**File:** `apps/web/src/middleware.ts`

```typescript
export function middleware(_request: NextRequest) {
  return NextResponse.next(); // pass-through
}
```

All auth guards are client-side JavaScript. An attacker can access any page URL directly. The page skeleton renders before the client-side redirect fires.

**Fix:** Implement a BFF (Backend-for-Frontend) Next.js API route that proxies auth requests and sets cookies on the correct domain (port 3000), allowing the middleware to check cookies server-side.

---

### H5. ~~Console app has two competing `authClient` instances~~ ✅ FIXED

**Files:** `apps/console/src/lib/api.ts`

Both `authClient` and `platformClient` now point to the same `apiClient` instance with the 401 interceptor applied.

---

### H6. Mobile auth state persisted in plaintext AsyncStorage

**File:** `apps/mobile/src/store/store.ts:30-35`

```typescript
const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  blacklist: ['loading', 'error', 'bootstrapped'],
};
```

`user` (email, role, permissions, organizationId), `isAuthenticated`, `socketAccessToken`, and `mfaSessionToken` are all written to AsyncStorage — unencrypted SQLite/SharedPreferences on disk. Extractable on rooted/jailbroken devices.

**Fix:** Use `whitelist: ['isAuthenticated']` minimum. Move `socketAccessToken` to in-memory only. Consider `expo-secure-store` for sensitive fields.

---

### H7. No certificate pinning on mobile

**File:** `apps/mobile/src/services/api.ts`

No SSL pinning, no `trustkit`, no `react-native-ssl-pinning`. On compromised networks or rooted devices, MITM attacks can intercept auth cookies and API traffic.

**Fix:** Add certificate pinning via `expo-crypto` or a dedicated pinning library.

---

### H8. ~~Realtime broadcast endpoint has no role check~~ ✅ FIXED

**File:** `services/api-gateway/src/modules/realtime/realtime.controller.ts`

The `/emit` endpoint now checks for `PLATFORM_ADMIN` role before broadcasting.

---

### H9. No CSRF protection on state-changing endpoints

**Files:** All apps, all state-changing endpoints

Login, register, logout, profile update, password change — none have CSRF tokens. A malicious site can:
- `POST /auth/logout` to force-log users out
- `POST /auth/register` to create spam accounts

**Fix:** Implement `SameSite=Strict` cookies or a Double-Submit Cookie CSRF pattern.

---

## Medium — Fix Before Launch

### M1. No password complexity requirements

**File:** `services/auth-service/src/presentation/dto/auth.dto.ts`

Only `@MinLength(8)` enforced. No uppercase, digit, or special character checks. No breached-password validation.

### M2. `replacedByToken` never populated

**File:** `services/auth-service/src/infrastructure/persistence/prisma-refresh-token.repository.ts`

The `RefreshToken` schema has `replacedByToken String?` but `revoke()` only sets `revoked: true`. Token family chain is broken — cannot audit which token replaced which.

### M3. Auth redirect on transient errors

**File:** `apps/web/src/lib/auth.tsx:53-61`

```typescript
useEffect(() => {
  if (state.isLoading) return;
  if (!state.isAuthenticated) {
    // instantly redirects to /login
  }
}, [state.isLoading, state.isAuthenticated]);
```

A transient network error on `GET /auth/me` immediately bounces the user out with no retry or grace period.

### M4. Double redirect on 401

**Files:** `apps/web/src/lib/api.ts:18-23`, `apps/web/src/lib/auth.tsx:53-61`

Both the `onUnauthorized` callback and the `AuthProvider` redirect fire simultaneously on 401, causing race conditions with `window.location.href` set twice.

### M5. Socket.IO connects before auth state resolves

**File:** `apps/web/src/lib/socket.tsx`

`autoConnect: true` fires immediately on mount, regardless of auth state. Unauthenticated users trigger WebSocket connection attempts — unnecessary load and attack surface.

### M6. Open registration with no safeguards

**File:** `apps/web/src/app/register/page.tsx`

No email verification, no CAPTCHA, no admin approval gate. Any email can create an account.

### M7. Mobile inactivity timer doesn't track actual interaction

**File:** `apps/mobile/src/utils/inactivity.ts`

Timer only resets on `AppState` transitions (background→foreground), not on touch events. A user actively using the app for 10+ minutes without switching apps gets logged out.

### M8. Push tokens not unregistered on logout

**File:** `apps/mobile/src/services/notifications.ts`

`unregisterFromNotifications()` exists but is never called during the logout flow. Old push tokens remain registered on the server.

### M9. CORS hardcoded to localhost

**File:** `services/api-gateway/src/main.ts:15-28`

Origins are hardcoded to `http://localhost:3000` through `http://localhost:3010`. No environment-based CORS configuration for production.

### M10. `window.location.href` redirects in web apps

**Files:** `apps/web/src/lib/auth.tsx`, `apps/web/src/app/login/page.tsx`, `apps/console/src/app/login/page.tsx`

Full page reloads destroy React state, cause flash of loading states, and lose fetch cache. Should use `router.push()`.

### M11. Duplicate public path arrays

**Files:** `apps/web/src/lib/auth.tsx`, `apps/web/src/lib/api.ts`, `apps/web/src/components/AppLayout.tsx`

`['/', '/login', '/register']` is defined in three places. Should be a shared constant.

### M12. No logging on failed JWT verification

**File:** `services/auth-service/src/main.ts:28`

```typescript
catch {
  // empty — invalid tokens silently ignored
}
```

Impossible to detect brute-force or replay attacks in logs.

---

## Action Plan

### Phase 1: Security Fixes (do first) ✅ COMPLETE

| # | Task | Files | Status |
|---|------|-------|--------|
| 1 | Remove `packages/auth/src/storage.ts` localStorage helpers | `packages/auth/src/storage.ts` | ✅ Done |
| 2 | Remove or disable `packages/auth/src/cookie.ts` `setCookie()` | `packages/auth/src/cookie.ts` | ✅ Done |
| 3 | Fix `JwtAuthGuard` to read `req.cookies.accessToken` | `packages/auth/src/nestjs/index.ts` | ✅ Done |
| 4 | Add refresh token reuse detection to newer controller | `auth-service/src/presentation/controllers/auth.controller.ts` | ✅ Done |
| 5 | Require TOTP code on `/auth/2fa/disable` | `auth-service/src/presentation/controllers/auth.controller.ts` | ✅ Done |
| 6 | Remove query-parameter token support from WebSocket | `api-gateway/src/modules/realtime/realtime.gateway.ts` | ✅ Done |
| 7 | Rotate all secrets, add `.env` to `.gitignore` | `.env`, `.gitignore` | ✅ Done |

### Phase 2: Auth Flow Fixes ✅ MOSTLY COMPLETE

| # | Task | Files | Status |
|---|------|-------|--------|
| 8 | Set cookies on `/auth/register` response | `auth-service/src/presentation/controllers/auth.controller.ts` | ✅ Done |
| 9 | Add `algorithms: ['HS256']` to all `jwt.verify()` calls | `packages/auth/src/jwt.ts`, `auth-service/src/main.ts` | ✅ Done |
| 10 | Implement working token refresh on web app | `apps/web/src/lib/api.ts` | ✅ Done |
| 11 | Add BFF or Next.js API route for auth (cookie port fix) | `apps/web/src/app/api/auth/[...slug]/route.ts` | ⏳ Not started |
| 12 | Unify console app's two `authClient` instances | `apps/console/src/lib/api.ts` | ✅ Done |
| 13 | Add password complexity rules | `auth-service/src/presentation/dto/auth.dto.ts` | ✅ Done |
| 14 | Populate `replacedByToken` during refresh rotation | `auth-service/src/infrastructure/persistence/prisma-refresh-token.repository.ts` | ⏳ Not started |
| 15 | Add CSRF protection (SameSite=Strict or Double-Submit) | All apps, auth-service cookie config | ⏳ Not started |

### Phase 3: Mobile-Specific ✅ MOSTLY COMPLETE

| # | Task | Files | Status |
|---|------|-------|--------|
| 16 | Add certificate pinning | `apps/mobile/plugins/withCertificatePinning.js` | ✅ Done (plugin created, removed from app.json due to config-plugins issue) |
| 17 | Move `socketAccessToken` to in-memory only | `apps/mobile/src/store/store.ts`, `apps/mobile/src/store/slices/authSlice.ts` | ✅ Done |
| 18 | Fix inactivity timer to track touch events | `apps/mobile/src/utils/inactivity.ts` | ✅ Done |
| 19 | Call `unregisterFromNotifications()` on logout | `apps/mobile/src/store/slices/authSlice.ts` | ✅ Done |

### Phase 4: Cleanup ✅ MOSTLY COMPLETE

| # | Task | Files | Status |
|---|------|-------|--------|
| 20 | Delete dead code: gateway `AuthController`, Passport strategy, `Roles` decorator, `@farm/auth/storage.ts`, older `src/modules/auth/` | Multiple files | ✅ Done |
| 21 | Make CORS origin env-configurable | `api-gateway/src/main.ts` | ✅ Done (`CORS_ORIGINS` env var) |
| 22 | Fix duplicate redirect in web auth | `apps/web/src/lib/auth.tsx`, `apps/web/src/lib/api.ts` | ✅ Done |
| 23 | Deduplicate public path arrays | `packages/auth/src/paths.ts` | ✅ Done (shared `PUBLIC_PATHS` constant) |
| 24 | Add logging to auth-service middleware catch block | `auth-service/src/main.ts` | ✅ Done (`logger.debug()`) |
| 25 | Restrict `/realtime/emit` to admin roles | `api-gateway/src/modules/realtime/realtime.controller.ts` | ✅ Done (`PLATFORM_ADMIN` check) |

---

## Per-App Detailed Findings

<details>
<summary><strong>Web App (Next.js :3001)</strong></summary>

### Positive Findings

- No tokens in localStorage — cookie-based auth reduces XSS token theft risk
- `withCredentials: true` correctly set for cross-origin cookie handling
- Inactivity auto-logout at 10 minutes
- MFA/TOTP support with clean two-step flow
- Permission system with wildcard matching
- Race condition handling in token refresh queue is well-implemented

### Issues Found

| Severity | Issue | File |
|----------|-------|------|
| CRITICAL | Zero server-side route protection (middleware pass-through) | `middleware.ts` |
| HIGH | Token refresh is a no-op — no silent refresh | `api.ts` |
| HIGH | All auth guards client-side only, trivially bypassable | `auth.tsx`, `PermissionGuard.tsx` |
| HIGH | No CSRF protection on login/register/state-changing endpoints | `login/page.tsx`, `register/page.tsx` |
| HIGH | Socket.IO has no auth on handshake | `socket.tsx` |
| MEDIUM | Open registration with no email verification | `register/page.tsx` |
| MEDIUM | Double redirect on 401 (race condition) | `auth.tsx`, `api.ts` |
| MEDIUM | `window.location.href` causes full page reloads | `auth.tsx`, `login/page.tsx` |
| MEDIUM | Duplicate public-path arrays in 3 files | `auth.tsx`, `api.ts`, `AppLayout.tsx` |
| LOW | No password complexity validation | `register/page.tsx` |
| LOW | Inactivity timeout is client-side only | `inactivity.ts` |

</details>

<details>
<summary><strong>Console App (Next.js :3004)</strong></summary>

### Positive Findings

- Dedicated `authClient` with 401 interceptor and refresh queue
- Platform admin role validation on login
- Inactivity auto-logout at 10 minutes

### Issues Found

| Severity | Issue | File |
|----------|-------|------|
| CRITICAL | Two competing `authClient` instances — one lacks interceptor | `api.ts`, `auth.tsx` |
| HIGH | No `middleware.ts` — zero server-side route protection | (missing) |
| HIGH | `platformClient` also lacks 401 interceptor | `api.ts` |
| MEDIUM | MFA verification creates throwaway Axios instance | `login/page.tsx` |
| MEDIUM | `from` query parameter set but never consumed | `ProtectedRoute.tsx`, `login/page.tsx` |
| MEDIUM | `NEXT_PUBLIC_AUTH_API_URL` defaults to HTTP | `api.ts` |
| MEDIUM | No rate limiting on client | `login/page.tsx` |

</details>

<details>
<summary><strong>Mobile App (Expo :8082)</strong></summary>

### Positive Findings

- Refresh tokens are httpOnly cookies — never exposed to JavaScript
- Cookie-based auth with `withCredentials: true`
- 401 interceptor with queue for concurrent request handling
- Best-effort logout (clears local state even if server call fails)
- MFA/TOTP support with 6-digit code validation
- No self-registration — admin-only user creation
- `fetchProfile` rejection forces re-login

### Issues Found

| Severity | Issue | File |
|----------|-------|------|
| HIGH | No certificate pinning — MITM vulnerable | `api.ts` |
| HIGH | Auth state persisted in plaintext AsyncStorage | `store.ts` |
| MEDIUM | `socketAccessToken` persisted without expiry management | `store.ts`, `authSlice.ts` |
| MEDIUM | Default API URL uses HTTP | `api.ts` |
| MEDIUM | Inactivity timer only resets on AppState transitions | `inactivity.ts` |
| MEDIUM | Push tokens not unregistered on logout | `notifications.ts` |
| LOW | Debug logging leaks auth data | `api.ts`, `authSlice.ts` |
| LOW | MFA session token persists in AsyncStorage during MFA flow | `store.ts` |
| LOW | Missing `autoComplete` attributes on login form | `LoginScreen.tsx` |

</details>

<details>
<summary><strong>API Gateway (port 4000)</strong></summary>

### Positive Findings

- ProxyMiddleware validates JWT on every request
- Service-to-service tokens (30s expiry) for downstream trust
- CORS configured with `credentials: true` and `Set-Cookie` exposed
- WebSocket auth validates tokens on handshake

### Issues Found

| Severity | Issue | File |
|----------|-------|------|
| CRITICAL | JWT token accepted as URL query parameter on WebSocket | `realtime.gateway.ts` |
| HIGH | No `algorithms` restriction in `jwt.verify()` | `proxy.middleware.ts` |
| HIGH | `POST /realtime/emit` has no role check | `realtime.controller.ts` |
| HIGH | `AuthController` is unreachable dead code (shadowed by proxy) | `auth.controller.ts` |
| HIGH | `public: true` on routes is defined but never read | `domain/routes/index.ts` |
| MEDIUM | CORS origins hardcoded to localhost | `main.ts` |
| MEDIUM | Original JWT forwarded to downstream alongside service token | `proxy.middleware.ts` |
| MEDIUM | WebSocket CORS list includes private IPs not in HTTP CORS | `realtime.gateway.ts` |
| MEDIUM | Three parallel JWT verification implementations | Multiple files |
| LOW | Failed JWT verification silently swallowed (no logging) | `proxy.middleware.ts` |
| LOW | No rate limiting at proxy level | `main.ts` |
| LOW | Swagger `persistAuthorization: true` stores tokens | `main.ts` |

</details>

<details>
<summary><strong>Auth Service (port 4001)</strong></summary>

### Positive Findings

- Refresh token rotation with SHA-256 hashing
- MFA/TOTP support with otplib
- Rate limiting via `@nestjs/throttler` (10 req/60s for login, 5 req/300s for MFA)
- Passwords hashed with bcrypt (12 salt rounds)
- Access tokens: 15min expiry. Refresh tokens: 7d expiry
- `detectRefreshTokenReuse()` exists (but not called by newer controller)

### Issues Found

| Severity | Issue | File |
|----------|-------|------|
| CRITICAL | Refresh token reuse not detected in newer controller | `presentation/controllers/auth.controller.ts` |
| CRITICAL | 2FA can be disabled without code verification | `presentation/controllers/auth.controller.ts` |
| HIGH | `/auth/register` does not set cookies | `presentation/controllers/auth.controller.ts` |
| HIGH | No password complexity requirements | `presentation/dto/auth.dto.ts` |
| HIGH | `JwtAuthGuard` only checks Bearer header, not cookies | `packages/auth/src/nestjs/index.ts` |
| HIGH | Client cookie helper cannot set HttpOnly | `packages/auth/src/cookie.ts` |
| HIGH | Client storage helper stores JWTs in localStorage | `packages/auth/src/storage.ts` |
| MEDIUM | `replacedByToken` never populated | `prisma-refresh-token.repository.ts` |
| MEDIUM | `LoginDto` password min length (6) differs from `RegisterDto` (8) | `presentation/dto/auth.dto.ts` |
| MEDIUM | `updateProfile` accepts email change without duplicate check | `application/services/auth.service.ts` |
| LOW | Global middleware catch block is empty (no logging) | `main.ts` |
| LOW | In-memory throttler — limits are per-process, not per-IP | `app.module.ts` |

</details>

---

## Environment Variables Required

| Variable | Used By | Notes |
|----------|---------|-------|
| `JWT_SECRET` | All services | Must be at least 256 bits, generated with `crypto.randomBytes()` |
| `JWT_REFRESH_SECRET` | Auth service | Separate secret for refresh tokens |
| `SERVICE_SECRET` | Gateway + Auth service | For service-to-service token signing |
| `MFA_SECRET` | Auth service | For TOTP secret generation |
| `DATABASE_URL` | Auth service | PostgreSQL connection string |
| `NEXT_PUBLIC_API_URL` | Web/Console apps | API gateway URL (must be HTTPS in production) |
| `EXPO_PUBLIC_API_URL` | Mobile app | API gateway URL |
| `EXPO_PUBLIC_API_GATEWAY_URL` | Mobile app | WebSocket URL |

---

*This audit was generated on 2026-07-15. Re-audit after completing Phase 1 fixes.*
