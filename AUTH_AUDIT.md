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
│  :3000)  │   │  :3001)   │   │  :8081)  │   │  :3002)  │
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

### C1. Client library exports `localStorage` token storage

**File:** `packages/auth/src/storage.ts`

```typescript
export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}
export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}
```

Any XSS attack can read `localStorage` and steal tokens. The server already sets httpOnly cookies — these helpers should be removed entirely. If any app imports them, it must be migrated to cookie-only auth.

---

### C2. Client-side cookie helper cannot set `HttpOnly`

**File:** `packages/auth/src/cookie.ts`

```typescript
export function setCookie(name: string, value: string, days: number) {
  document.cookie = `${name}=${value}; ...`;
}
```

`document.cookie` by definition cannot set `HttpOnly` cookies. Tokens set this way are JS-accessible and XSS-vulnerable. Cookie setting must only happen server-side via `Set-Cookie` headers.

---

### C3. `JwtAuthGuard` ignores cookies — breaks web/console auth

**File:** `packages/auth/src/nestjs/index.ts`

```typescript
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<any>();
    const token = extractBearerToken(req.headers.authorization);
    if (!token) throw new UnauthorizedException('Authentication required');
    // ...
  }
}
```

Only reads `Authorization: Bearer` header. The web and console apps send tokens exclusively via cookies. Any controller guarded by `JwtAuthGuard` returns 401 for cookie-authenticated users. The auth-service `main.ts` middleware partially compensates by pre-populating `req.user`, but the guard overwrites it and throws.

**Fix:** Read `req.cookies.accessToken` as a fallback when no `Authorization` header is present.

---

### C4. Refresh token reuse not detected in newer controller

**File:** `services/auth-service/src/presentation/controllers/auth.controller.ts:54-66`

The `refreshToken()` method calls `authService.refreshToken()` directly without calling `detectRefreshTokenReuse()` first. The older controller (`src/modules/auth/auth.controller.ts:63-64`) does call it. A stolen refresh token can be reused indefinitely to mint new tokens.

**Fix:** Add `detectRefreshTokenReuse()` call before token rotation, and revoke all sessions on reuse detection.

---

### C5. 2FA can be disabled without code verification

**File:** `services/auth-service/src/presentation/controllers/auth.controller.ts:141-146`

```typescript
@Post('2fa/disable')
@UseGuards(JwtAuthGuard)
async disable2fa(@Req() req: any) {
  await this.authService.disable2fa(req.user?.sub);
  return { message: '2FA disabled successfully' };
}
```

No TOTP code required. Anyone with a valid access token can disable 2FA without proving they control the authenticator.

**Fix:** Accept a `code` parameter and verify it before disabling.

---

### C6. JWT token accepted as URL query parameter on WebSocket

**File:** `services/api-gateway/src/modules/realtime/realtime.gateway.ts:55-57`

```typescript
if (!token && client.handshake.query?.token) {
  token = client.handshake.query.token as string;
}
```

Query parameters appear in server access logs, browser history, and proxy logs. This leaks the JWT to anyone with access to logs.

**Fix:** Remove query parameter support. Only accept tokens from `client.handshake.auth.token` or cookies.

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

Login sets `accessToken` and `refreshToken` cookies. Register does not — it returns tokens in the JSON body only. Web app users who register must log in separately.

**Fix:** Set cookies on the register response, same as login.

---

### H2. JWT `verify()` called without algorithm restriction

**Files:** `packages/auth/src/jwt.ts`, `services/api-gateway/src/infrastructure/routing/proxy.middleware.ts`

```typescript
const decoded = jwtVerify(token, secret); // no algorithms option
```

Without `algorithms: ['HS256']`, older `jsonwebtoken` versions may accept `alg: none` or algorithm confusion attacks.

**Fix:** Add `{ algorithms: ['HS256'] }` to all `jwt.verify()` calls.

---

### H3. Web app token refresh is a no-op

**File:** `apps/web/src/lib/api.ts:13-24`

```typescript
setupTokenRefresh(
  client.client,
  () => null,      // getRefreshToken — always returns null
  () => {},         // setTokens — no-op
  () => {},         // clearTokens — no-op
  () => { /* redirect to /login */ },
);
```

When the access token expires, the user is bounced to `/login` with no silent refresh. Every 15 minutes, active users lose their session.

**Fix:** Either implement working refresh callbacks (read refresh token from cookie), or remove cookie-based auth and switch to client-side token management with Bearer tokens.

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

### H5. Console app has two competing `authClient` instances

**Files:** `apps/console/src/lib/api.ts:13-18`, `apps/console/src/lib/auth.tsx:10-15`

| Instance | Port | Has 401 interceptor? |
|----------|------|---------------------|
| `api.ts` authClient | 4001 | No |
| `auth.tsx` authClient | 4000 | Yes |

Roles, permissions, and API-key calls go through the port 4001 instance which **never auto-refreshes on 401**. Users get silent failures.

**Fix:** Unify into a single `authClient` instance with the interceptor, or add the interceptor to the `api.ts` instance.

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

### H8. Realtime broadcast endpoint has no role check

**File:** `services/api-gateway/src/modules/realtime/realtime.controller.ts`

```typescript
@Post('emit')
handleEmitEvent(@Body() event: RealtimeEvent) {
  this.gateway.broadcastRealtimeEvent(event);
  return { success: true };
}
```

Any authenticated user (even WORKER role) can inject fake realtime events to all connected clients. No role-based restriction.

**Fix:** Add `@UseGuards(PlatformAdminGuard)` or check for MANAGER/ADMIN role.

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

### Phase 1: Security Fixes (do first)

| # | Task | Files |
|---|------|-------|
| 1 | Remove `packages/auth/src/storage.ts` localStorage helpers | `packages/auth/src/storage.ts` |
| 2 | Remove or disable `packages/auth/src/cookie.ts` `setCookie()` | `packages/auth/src/cookie.ts` |
| 3 | Fix `JwtAuthGuard` to read `req.cookies.accessToken` | `packages/auth/src/nestjs/index.ts` |
| 4 | Add refresh token reuse detection to newer controller | `auth-service/src/presentation/controllers/auth.controller.ts` |
| 5 | Require TOTP code on `/auth/2fa/disable` | `auth-service/src/presentation/controllers/auth.controller.ts` |
| 6 | Remove query-parameter token support from WebSocket | `api-gateway/src/modules/realtime/realtime.gateway.ts` |
| 7 | Rotate all secrets, add `.env` to `.gitignore` | `.env`, `.gitignore` |

### Phase 2: Auth Flow Fixes

| # | Task | Files |
|---|------|-------|
| 8 | Set cookies on `/auth/register` response | `auth-service/src/presentation/controllers/auth.controller.ts` |
| 9 | Add `algorithms: ['HS256']` to all `jwt.verify()` calls | `packages/auth/src/jwt.ts`, `api-gateway/src/infrastructure/routing/proxy.middleware.ts` |
| 10 | Implement working token refresh on web app | `apps/web/src/lib/api.ts`, `apps/web/src/lib/auth.tsx` |
| 11 | Add BFF or Next.js API route for auth (cookie port fix) | `apps/web/src/app/api/auth/[...slug]/route.ts` (new) |
| 12 | Unify console app's two `authClient` instances | `apps/console/src/lib/api.ts`, `apps/console/src/lib/auth.tsx` |
| 13 | Add password complexity rules | `auth-service/src/presentation/dto/auth.dto.ts` |
| 14 | Populate `replacedByToken` during refresh rotation | `auth-service/src/infrastructure/persistence/prisma-refresh-token.repository.ts` |
| 15 | Add CSRF protection (SameSite=Strict or Double-Submit) | All apps, auth-service cookie config |

### Phase 3: Mobile-Specific

| # | Task | Files |
|---|------|-------|
| 16 | Add certificate pinning | `apps/mobile/src/services/api.ts` |
| 17 | Move `socketAccessToken` to in-memory only | `apps/mobile/src/store/store.ts`, `apps/mobile/src/store/slices/authSlice.ts` |
| 18 | Fix inactivity timer to track touch events | `apps/mobile/src/utils/inactivity.ts` |
| 19 | Call `unregisterFromNotifications()` on logout | `apps/mobile/src/services/notifications.ts`, `apps/mobile/src/store/slices/authSlice.ts` |

### Phase 4: Cleanup

| # | Task | Files |
|---|------|-------|
| 20 | Delete dead code: gateway `AuthController`, Passport strategy, `Roles` decorator, `@farm/auth/storage.ts`, older `src/modules/auth/` | Multiple files |
| 21 | Make CORS origin env-configurable | `api-gateway/src/main.ts` |
| 22 | Fix duplicate redirect in web auth | `apps/web/src/lib/auth.tsx`, `apps/web/src/lib/api.ts` |
| 23 | Deduplicate public path arrays | `apps/web/src/lib/` (shared constant) |
| 24 | Add logging to auth-service middleware catch block | `auth-service/src/main.ts` |
| 25 | Restrict `/realtime/emit` to admin roles | `api-gateway/src/modules/realtime/realtime.controller.ts` |

---

## Per-App Detailed Findings

<details>
<summary><strong>Web App (Next.js :3000)</strong></summary>

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
<summary><strong>Console App (Next.js :3001)</strong></summary>

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
<summary><strong>Mobile App (Expo :8081)</strong></summary>

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
