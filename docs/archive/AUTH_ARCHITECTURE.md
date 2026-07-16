> **⚠️ SUPERSEDED** — This document has been merged into [ARCHITECTURE.md](./ARCHITECTURE.md).  
> Content below is kept for historical reference but may be outdated.

# Farm Management System - Authentication Architecture

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Token System](#token-system)
4. [Backend Services](#backend-services)
5. [Shared Auth Package](#shared-auth-package)
6. [Frontend Apps](#frontend-apps)
7. [Request Flow](#request-flow)
8. [Known Issues & Bugs](#known-issues--bugs)

---

## Overview

The Farm Management System uses a **JWT-based authentication** system with:
- **Access tokens** (short-lived, 15 min) signed with `JWT_SECRET`
- **Refresh tokens** (long-lived, 7 days) - database-stored for web/admin, JWT-based for console
- **Cookie + localStorage dual storage** for middleware checks + API calls
- **Gateway-first auth** pattern: the API gateway verifies tokens before proxying to services

There are **3 separate frontend apps** and **15+ backend services**, each with different auth patterns.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND APPS                              │
├──────────────────┬──────────────────┬────────────────────────────┤
│  Web (port 3000) │ Admin (port 3001)│ Console (port 3004)       │
│  /login, /dashboard│  /login, /      │  /login, /dashboard      │
│                   │                  │                            │
│ Tokens:           │ Tokens:          │ Tokens:                    │
│ localStorage keys:│ localStorage keys:│ localStorage keys:       │
│  accessToken      │  accessToken     │  console_accessToken      │
│  refreshToken     │  refreshToken    │  console_refreshToken     │
│  user             │  user            │  console_user             │
│ Cookie keys:      │ Cookie keys:     │ Cookie keys:              │
│  accessToken      │  accessToken     │  console_accessToken      │
│  refreshToken     │  refreshToken    │  console_refreshToken     │
├──────────────────┴──────────────────┴────────────────────────────┤
│              All point to Gateway (port 4000)                     │
│              Web/Admin → http://localhost:4000                    │
│              Console → http://localhost:4020 (platform-service)   │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (NestJS, port 4000)                │
│                                                                   │
│  1. loadEnv() reads root .env BEFORE NestJS boots                │
│  2. ConfigModule.forRoot() with envFilePath                       │
│  3. ProxyMiddleware: verifies JWT, sets x-user-* headers          │
│  4. AuthController: /auth/login, /auth/profile, etc.              │
│  5. Routes /auth/* directly to auth-service (bypasses proxy)      │
│  6. All other routes → proxied to backend services                │
│                                                                   │
│  PUBLIC_PREFIXES: ['/auth', '/health'] - no JWT verification      │
└──────┬──────────┬──────────┬──────────┬──────────┬───────────────┘
       │          │          │          │          │
       ▼          ▼          ▼          ▼          ▼
┌────────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐
│auth-service│ │  farm  │ │ crop   │ │poultry │ │ notification│
│ port 4001  │ │  4002  │ │  4011  │ │  4004  │ │   4005     │
│            │ │        │ │        │ │        │ │            │
│ Express    │ │Express │ │Express │ │Express │ │  NestJS    │
│ dotenv ✓   │ │dotenv ✓│ │dotenv ✓│ │dotenv ✓│ │  no dotenv │
│            │ │        │ │        │ │        │ │            │
│ /auth/*    │ │/api/*  │ │/*      │ │/*      │ │ /*         │
│ /roles/*   │ │        │ │        │ │        │ │            │
│ /permissions│ │        │ │        │ │        │ │            │
│ /admin/*   │ │        │ │        │ │        │ │            │
│ /org-admin/*│ │        │ │        │ │        │ │            │
└────────────┘ └────────┘ └────────┘ └────────┘ └────────────┘

┌────────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐
│livestock   │ │finance │ │inventory│ │  hr    │ │  worker    │
│ port 4003  │ │  4006  │ │  4010  │ │  4012  │ │   4007     │
│ Express    │ │Express │ │Express │ │Express │ │  Express   │
│ dotenv ✓   │ │dotenv ✓│ │dotenv ✓│ │dotenv ✓│ │  dotenv ✓  │
└────────────┘ └────────┘ └────────┘ └────────┘ └────────────┘

┌────────────┐ ┌────────────┐ ┌────────────────┐
│reporting   │ │organization│ │  platform-svc  │
│ port 4008  │ │ port 4009  │ │   port 4020   │
│ Express    │ │  NestJS    │ │   Express      │
│ dotenv ✓   │ │ dotenv ✓   │ │   dotenv ✓     │
└────────────┘ └────────────┘ └────────────────┘
```

---

## Token System

### Access Token (JWT)

**Signed by:** `process.env.JWT_SECRET` (from root `.env`)
**Default secret fallback:** `'secret'` (in `@farm/auth` package)
**Expiry:** 15 minutes

**Payload shape:**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "ORGANIZATION_OWNER",
  "organizationId": "org-uuid"
}
```

**Sign locations:**
- `services/auth-service/src/services/auth.service.ts:140` - `jwt.sign(payload, getJWTSecret(), { expiresIn: JWT_EXPIRES_IN })`
- `services/auth-service/src/controllers/auth.controller.ts:170-180` - switch-organization re-signs
- `services/platform-service/src/routes/auth.routes.ts:45-49` - console login signs with `isPlatformAdmin: true`

**Verify locations:**
- `packages/auth/src/jwt.ts:20-21` - `resolveSecret()` reads `process.env.JWT_SECRET || 'secret'`
- `packages/auth/src/jwt.ts:29` - `verify(token, resolveSecret())`
- `services/platform-service/src/middleware/platform-admin.guard.ts:31` - direct `jwt.verify(token, getJWTSecret())`
- `apps/api-gateway/src/modules/auth/strategies/jwt.strategy.ts:12` - Passport strategy `secretOrKey`

### Refresh Token

**Two different implementations exist:**

#### auth-service (web + admin) - Database-stored tokens
- Random UUID stored in `RefreshToken` table
- Token rotation on every refresh (old revoked, new issued)
- 30-day expiry
- `services/auth-service/src/services/auth.service.ts:143-157`

#### platform-service (console) - JWT-based refresh tokens
- JWT with `{ sub: userId, type: 'refresh' }` payload
- 7-day expiry
- No database storage, no rotation
- `services/platform-service/src/routes/auth.routes.ts:51-55`

---

## Backend Services

### API Gateway (`apps/api-gateway`, NestJS, port 4000)

**Env loading:** Manual `loadEnv()` function in `main.ts` reads root `.env` before NestJS boots. Also has `ConfigModule.forRoot()` with `envFilePath`.

**Auth mechanisms:**
1. **ProxyMiddleware** (`modules/proxy/proxy.middleware.ts`): Intercepts all requests except `/auth` and `/health`. Calls `verifyAccessToken()` from `@farm/auth`. Sets headers: `x-user-id`, `x-user-role`, `x-organization-id`, `x-user-email`.
2. **AuthController** (`modules/auth/controllers/auth.controller.ts`): Uses `JwtAuthGuard` + `AuthorizationGuard` from `@farm/auth` for protected endpoints.
3. **JwtStrategy** (`modules/auth/strategies/jwt.strategy.ts`): Passport strategy used by `PassportModule`, reads `process.env.JWT_SECRET || 'secret'` in constructor.

**AuthController delegates to auth-service:**
```
POST /auth/login   → axios.post → auth-service:4001/auth/login
POST /auth/register → axios.post → auth-service:4001/auth/register
POST /auth/refresh  → axios.post → auth-service:4001/auth/refresh
GET  /auth/profile  → axios.get  → auth-service:4001/auth/me (with auth header forwarded)
```

**Proxy routes:**
```
/farms      → localhost:4002 (farm-service)
/crops      → localhost:4011 (crop-service)
/livestocks → localhost:4003 (livestock-service)
/poultry    → localhost:4004 (poultry-service)
/notifications → localhost:4005 (notification-service)
/finance    → localhost:4006 (finance-service)
/workers    → localhost:4007 (worker-service)
/tasks      → localhost:4007 (worker-service)
/leave      → localhost:4012 (hr-service)
/shifts     → localhost:4012 (hr-service)
/shift-assignments → localhost:4012 (hr-service)
/messages   → localhost:4012 (hr-service)
/correspondence → localhost:4012 (hr-service)
/reporting  → localhost:4008 (reporting-service)
/organizations → localhost:4009 (organization-service)
/inventory  → localhost:4010 (inventory-service)
/medications → localhost:4004 (poultry-service)
/roles      → localhost:4001 (auth-service)
/permissions → localhost:4001 (auth-service)
/admin      → localhost:4001 (auth-service)
/org-admin  → localhost:4001 (auth-service)
```

### Auth Service (`services/auth-service`, Express, port 4001)

**Env loading:** `dotenv.config({ path: path.resolve(__dirname, '../../../.env') })`

**JWT token generation:** `getJWTSecret()` - lazy reads `process.env.JWT_SECRET || 'secret'`

**Routes:**
- `POST /auth/login` - public, returns `{ accessToken, refreshToken, user }`
- `POST /auth/register` - public
- `POST /auth/refresh` - public, validates DB-stored refresh token, rotates it
- `GET /auth/me` - `authMiddleware()` required
- `GET /auth/profile` - `authMiddleware()` required (alias of /me)
- `PUT /auth/profile` - `authMiddleware()` required
- `GET /auth/my-organizations` - `authMiddleware()` required
- `POST /auth/switch-organization` - `authMiddleware()` required, re-issues tokens

**Refresh token table:** `RefreshToken { id, userId, token, expiresAt, revoked, createdAt }`

### Platform Service (`services/platform-service`, Express, port 4020)

**Env loading:** `dotenv.config({ path: path.resolve(__dirname, '../../../.env') })`

**JWT verification:** `platformAdminGuard` middleware - direct `jwt.verify(token, getJWTSecret())`

**Auth is completely independent from auth-service:**
- Has its own `/auth/login` (only SUPER_ADMIN/SUPPORT_ADMIN)
- Has its own `/auth/refresh` (JWT-based, no DB storage)
- Has its own `/auth/me` (protected by `platformAdminGuard`)

### Backend NestJS Services (farm, crop, livestock, poultry, finance, inventory, hr, worker, reporting)

**Env loading:** `ConfigModule.forRoot()` with `envFilePath`

**Auth pattern:** All use `JwtAuthGuard` and `AuthorizationGuard` from `@farm/auth/nestjs`. The gateway's ProxyMiddleware already verified the token and set `x-user-*` headers. The backend services trust these headers for user identity. They also apply `rlsMiddleware` for row-level security.

### Organization Service & Notification Service (NestJS)

**Organization service:** Uses `ConfigModule.forRoot()` with `envFilePath` for env loading. Uses `JwtAuthGuard` from `@farm/auth`.

**Notification service:** No explicit dotenv loading. Uses `rlsMiddleware` from `@farm/database`.

---

## Shared Auth Package (`packages/auth`)

### `src/jwt.ts` - Core JWT logic
```typescript
resolveSecret(): string => process.env.JWT_SECRET || 'secret'
verifyAccessToken(token: string): VerifiedUser  // throws on failure
extractBearerToken(authorization?: string): string | null
class AuthError extends Error { statusCode: number }
```

### `src/express/index.ts` - Express middleware
```typescript
authMiddleware(options?: { roles?, permission? }): MiddlewareFunction
requireAuth: MiddlewareFunction  // shorthand for authMiddleware()
asyncHandler(fn): MiddlewareFunction  // wraps async route handlers
```

### `src/nestjs/index.ts` - NestJS guards
```typescript
JwtAuthGuard implements CanActivate       // calls verifyAccessToken()
AuthorizationGuard implements CanActivate  // reads role/permission metadata
Roles(...roles): decorator
Permission(name): decorator
CurrentUser(): param decorator
Auth(...roles): convenience decorator combining roles + guard
```

### `src/roles.ts` - Role definitions
8 roles: SUPER_ADMIN, SUPPORT_ADMIN, ORGANIZATION_OWNER, FARM_MANAGER, ACCOUNTANT, SUPERVISOR, VETERINARIAN, WORKER
- `roleHasPermission(role, permission)` - with wildcard matching
- `userHasAnyRole(userRole, allowed[])` - exact match

---

## Frontend Apps

### Web App (`apps/web`, Next.js, port 3000)

**Files:**
- `src/lib/auth.tsx` - AuthProvider, useAuth hook
- `src/lib/api.ts` - axios client, interceptors, API modules
- `middleware.ts` - Next.js middleware for route protection

**Token storage:**
| Store | Key | Purpose |
|-------|-----|---------|
| localStorage | `accessToken` | API calls via interceptor |
| localStorage | `refreshToken` | Token refresh |
| localStorage | `user` | Cached user object |
| localStorage | `mfaSessionToken` | MFA flow |
| Cookie | `accessToken` | Server-side middleware checks (7 days) |
| Cookie | `refreshToken` | Server-side refresh (30 days) |

**Middleware (`middleware.ts`):**
- Checks `accessToken` cookie
- Redirects to `/login` if no token on protected routes
- Redirects to `/dashboard` if token present on auth pages
- Matcher: `/((?!_next|favicon.ico|public).*)`

**Auth flow:**
1. `login()` → POST `/auth/login` → stores tokens in localStorage + cookies → redirects to `/dashboard`
2. On page load: reads cached user from localStorage, shows it immediately, calls `refreshUser()` in background
3. `refreshUser()` → GET `/auth/profile` with `accessToken` from localStorage
4. If profile fails → `clearAllAuth()` → removes all tokens + cookies → user set to null
5. Axios interceptor catches 401 → calls POST `/auth/refresh` with `refreshToken` → updates both localStorage + cookies
6. If refresh fails → clears everything → `window.location.href = '/login'`

### Admin App (`apps/admin`, Next.js, port 3001)

**Files:**
- `src/lib/auth.tsx` - AuthProvider, useAuth hook
- `src/lib/api.ts` - axios client, interceptors, API modules
- No `middleware.ts` (no server-side route protection)

**Token storage:** Same as web (`accessToken`, `refreshToken`, `user`)
**Cookie expiry:** `accessToken` cookie = 1 day (vs web's 7 days)

**Differences from web:**
- Has `buildUser()` helper function (web duplicates this inline)
- `useEffect` always `await`s `refreshUser()` before setting `loading = false`
- Adds `x-selected-organization` header for SUPER_ADMIN org switching
- No `switchOrganization` or `myOrganizations` in AuthContext

### Console App (`apps/console`, Next.js, port 3004)

**Files:**
- `src/lib/auth.tsx` - AuthProvider, useAuth hook
- `src/lib/api.ts` - platformClient axios, interceptors
- No `middleware.ts`

**Token storage (prefixed):**
| Store | Key | Purpose |
|-------|-----|---------|
| localStorage | `console_accessToken` | API calls |
| localStorage | `console_refreshToken` | Token refresh |
| localStorage | `console_user` | Cached user |
| Cookie | `console_accessToken` | Server-side checks (1 day) |
| Cookie | `console_refreshToken` | Server-side refresh (7 days) |

**Connects to:** `platform-service` at `http://localhost:4020` (NOT the gateway)
**Refresh:** Posts to `platform-service:4020/auth/refresh` (JWT-based, no DB rotation)
**`/auth/me` endpoint:** `GET platform-service:4020/auth/me` (protected by `platformAdminGuard`)

---

## Request Flow

### 1. Login (Web/Admin)
```
Browser → POST localhost:4000/auth/login
Gateway → (PUBLIC, no JWT check) → AuthController.login()
Gateway → axios.post → auth-service:4001/auth/login
auth-service → validates credentials → generates JWT + DB refresh token
auth-service → returns { accessToken, refreshToken, user }
Gateway → forwards response to browser
Browser → stores in localStorage + cookies → redirects to /dashboard
```

### 2. API Request (after login)
```
Browser → GET localhost:4000/farms
Interceptor → attaches Bearer token from localStorage
Gateway → ProxyMiddleware.use():
  1. Path is not PUBLIC → extract token → verifyAccessToken(token)
  2. Token valid → sets x-user-id, x-user-role, x-organization-id, x-user-email
  3. Finds proxy route: /farms → localhost:4002
  4. Proxies request with x-user-* headers to farm-service
farm-service → rlsMiddleware reads x-organization-id → sets RLS context
farm-service → handles request → returns response
Gateway → forwards response to browser
```

### 3. Page Refresh
```
Browser loads → Next.js middleware checks accessToken cookie
  - No cookie → redirect to /login
  - Has cookie → render page
AuthProvider mounts:
  1. Reads cached user from localStorage → shows immediately (no loading spinner)
  2. Calls refreshUser() → GET /auth/profile
  3. Profile succeeds → updates user state
  4. Profile fails (token expired) → clearAllAuth() → redirect to /login
```

### 4. Token Refresh (401 response)
```
Browser makes API request → gets 401 from any service
Axios interceptor catches 401:
  1. Checks if already refreshing → queues request if so
  2. Posts refreshToken to /auth/refresh
  3. Gets new accessToken + refreshToken
  4. Updates localStorage + cookies
  5. Retries original request with new token
  6. If refresh fails → clear everything → redirect to /login
```

---

## Known Issues & Bugs

### 1. `loadEnv()` double-loading and env value priority
**File:** `apps/api-gateway/src/main.ts:20`
```typescript
if (!process.env[key]) process.env[key] = val;
```
`loadEnv()` only sets values that don't already exist. If any env var is already set (e.g. from system environment), the `.env` file value is skipped. This could cause issues if someone sets `JWT_SECRET=wrong` in the system environment.

### 2. Admin cookie expiry mismatch
**File:** `apps/admin/src/lib/auth.tsx:52` vs `apps/web/src/lib/auth.tsx:53`
- Admin sets `accessToken` cookie for **1 day**
- Web sets `accessToken` cookie for **7 days**
- Both tokens expire in **15 minutes**
- Cookie expiry should be shorter (e.g. 15-30 min) to match token expiry

### 3. Inconsistent `refreshUser` behavior across apps
- **Web**: Shows cached user immediately, refreshes in background (good UX, but stale data possible)
- **Admin**: Always awaits `refreshUser()` before hiding loading spinner (blocking but fresh data)
- **Console**: Same as admin

### 4. No Next.js middleware for admin/console
- Only web has `middleware.ts` for server-side route protection
- Admin and console rely entirely on client-side auth checks
- Users can briefly see protected pages before JS loads and redirects

### 5. Duplicate cookie helper functions
`setCookie`, `deleteCookie`, `setAuthCookies`, `clearAuthCookies` are defined independently in:
- `apps/web/src/lib/auth.tsx`
- `apps/web/src/lib/api.ts`
- `apps/admin/src/lib/auth.tsx`
- `apps/admin/src/lib/api.ts`
- `apps/console/src/lib/auth.tsx`
- `apps/console/src/lib/api.ts`

Should be extracted to `@farm/auth` or a shared utils package.

### 6. Gateway `AuthController.getProfile` silently falls back
**File:** `apps/api-gateway/src/modules/auth/services/auth.service.ts:24-35`
```typescript
async getProfile(user: any, authHeader?: string): Promise<any> {
  try {
    const response = await axios.get(`${this.authServiceUrl}/me`, { headers: { Authorization: authHeader } });
    return response.data;
  } catch {
    return user;  // silently returns JWT payload instead of fresh DB data
  }
}
```
If auth-service is down or its `/me` endpoint fails, the gateway returns the JWT payload (which lacks `firstName`, `lastName`, `organization`, `role.permissions`, etc.), causing broken UI.

### 7. Platform-service refresh doesn't return `refreshToken`
**File:** `services/platform-service/src/routes/auth.routes.ts:101`
```typescript
res.json({ accessToken: newAccessToken });
```
Console's interceptor expects `refreshToken` in the refresh response (`data.refreshToken`) but platform-service only returns `accessToken`. This means the refresh token never gets rotated/updated on the console side.

### 8. `switchOrganization` in auth-service uses different JWT expiry
**File:** `services/auth-service/src/controllers/auth.controller.ts:179`
```typescript
jwt.sign({...}, getJWTSecret(), { expiresIn: '1h' })  // 1 hour!
```
But regular login uses `15m`. After switching org, the access token lives 4x longer.

### 9. Console user object from `/auth/me` doesn't include role details
Platform-service's `/auth/me` returns:
```json
{ "id", "email", "firstName", "lastName", "role": "SUPER_ADMIN", "organizationId", "organizationName" }
```
While auth-service's `/auth/me` returns the full user with `role.permissions`, `organization.subscriptionPlanRef`, etc. The console AuthProvider doesn't need these, but this creates inconsistency.

### 10. Web app shows stale cached user while refreshing
If a user's permissions or role change in the database, the web app shows the stale cached `user` from localStorage until `refreshUser()` completes. If the token is still valid but the user is now deactivated, the user sees their old profile briefly.

### 11. No logout endpoint on auth-service
Web and admin call `authAPI.logout()` which hits `POST /auth/logout`. This route doesn't exist on auth-service. The gateway's AuthController doesn't have a `logout` endpoint either. The POST goes through to auth-service which returns 404, but the frontend catches the error and clears local state anyway.

### 12. Console doesn't call backend logout
Console's `logout()` only clears local state (localStorage + cookies) without calling any server endpoint. The refresh token (JWT-based) remains valid until expiry.
