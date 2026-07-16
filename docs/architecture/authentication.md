# Authentication & Authorization

The Farm Management System uses a single JWT issued by the `auth-service`. Every
other service trusts the token, never the client, and applies per-route
authorization via `@farm/auth`.

## Where the auth code lives

- `@farm/auth` (`packages/auth`): shared library with `verifyAccessToken`,
  `extractBearerToken`, the canonical role and permission matrix, and two
  framework-specific adapters:
  - Express: `authMiddleware({ roles?, permission? })` and an `AuthError` that
    downstream error handlers translate to 401/403 responses.
  - NestJS: `JwtAuthGuard`, `AuthorizationGuard`, `@Roles(...)`, `@Permission('...')`,
    and a `@CurrentUser()` parameter decorator.
- `services/auth-service`: the only place that issues and refreshes tokens.
  It signs JWTs with `{ sub, email, role, organizationId, iat, exp }` using
  the shared `JWT_SECRET`.
- `apps/api-gateway`: the proxy verifies the token once, then forwards the
  verified principal as headers (`x-user-id`, `x-user-role`, `x-organization-id`)
  to downstream services. Services can still verify independently for defense
  in depth.
- Per-service `*.module.ts` / `*.controller.ts` files apply the right
  `authMiddleware` / `@Roles` / `@Permission` to each route.

## Roles

`packages/auth/src/roles.ts` defines the canonical role names:

| Role | Intended use |
| ---- | ------------ |
| `SUPER_ADMIN` | Platform-wide superuser. |
| `SUPPORT_ADMIN` | Support staff; read-only plus impersonation. |
| `ORGANIZATION_OWNER` | Owns a tenant; can do anything inside it. |
| `FARM_MANAGER` | Manages a farm and most sub-domains. |
| `ACCOUNTANT` | Finance-focused; reads farm/inventory/reporting. |
| `SUPERVISOR` | Operational lead across crops, livestock, poultry, workers. |
| `VETERINARIAN` | Writes livestock + poultry health records. |
| `WORKER` | Read-only field operator. |

The same file declares a coarse-grained permission matrix
(`farm.read`, `farm.write`, `farm.delete`, `finance.write`, etc.). Both the
in-code matrix and the `RolePermission` rows seeded by `packages/database`
should be kept in sync.

## Authorization model

Each route declares either a role allow-list, a required permission, or both.
A `SUPER_ADMIN` always passes. Other roles pass if either the role
allow-list matches or the role grants the required permission.

```ts
// Express
router.post(
  '/expenses',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'ACCOUNTANT'], permission: 'finance.write' }),
  financeController.createExpense,
);

// NestJS
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Roles('ORGANIZATION_OWNER', 'FARM_MANAGER')
@Permission('farm.write')
@Post('farms')
create() {}
```

## Token lifecycle

- Access tokens are short-lived (default 15 minutes).
- Refresh tokens are random UUIDs stored in `RefreshToken` with rotation on use
  and a 30-day expiry.
- The auth-service issues tokens; every other service only verifies them.

## Adding a new role

1. Add the constant to `ROLES` in `packages/auth/src/roles.ts`.
2. Add grants to `ROLE_PERMISSIONS`.
3. Add the role name to the upsert list in
   `packages/database/prisma/seed.ts` and grant the corresponding permissions.
4. Update role allow-lists on the relevant routes.

---

## Token Sign & Verify Locations

**Sign locations:**
- `services/auth-service/src/services/auth.service.ts:140` - `jwt.sign(payload, getJWTSecret(), { expiresIn: JWT_EXPIRES_IN })`
- `services/auth-service/src/controllers/auth.controller.ts:170-180` - switch-organization re-signs
- `services/platform-service/src/routes/auth.routes.ts:45-49` - console login signs with `isPlatformAdmin: true`

**Verify locations:**
- `packages/auth/src/jwt.ts:20-21` - `resolveSecret()` reads `process.env.JWT_SECRET || 'secret'`
- `packages/auth/src/jwt.ts:29` - `verify(token, resolveSecret())`
- `services/platform-service/src/middleware/platform-admin.guard.ts:31` - direct `jwt.verify(token, getJWTSecret())`
- `apps/api-gateway/src/modules/auth/strategies/jwt.strategy.ts:12` - Passport strategy `secretOrKey`

## Two Refresh Token Implementations

### auth-service (web + admin) - Database-stored tokens
- Random UUID stored in `RefreshToken` table
- Token rotation on every refresh (old revoked, new issued)
- 30-day expiry
- `services/auth-service/src/services/auth.service.ts:143-157`

### platform-service (console) - JWT-based refresh tokens
- JWT with `{ sub: userId, type: 'refresh' }` payload
- 7-day expiry
- No database storage, no rotation
- `services/platform-service/src/routes/auth.routes.ts:51-55`

## Shared Auth Package API Surface (`packages/auth`)

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

## Request Flow Diagrams

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
