# Console App Audit Report

**Date:** 2026-07-12
**App:** `apps/console/` (Platform Console - port 3004)
**Backend:** `services/platform-service/` (port 4020)

---

## Summary

The console app is a platform admin panel for managing organizations, users, subscriptions, feature flags, broadcasts, audit logs, and system health. It has **30 identified issues** across 4 priority levels.

---

## P0 - Critical (Blocks Functionality)

### 1. Double AuthProvider
- `app/layout.tsx:14` wraps `{children}` in `<AuthProvider>`
- `app/(platform)/layout.tsx:175` wraps `{children}` in `<AuthProvider>` again
- Creates nested auth contexts; the inner one shadows the outer. Login/logout state may not propagate correctly.

### 2. API Route Mismatches (Frontend vs Backend)
Console `lib/api.ts` calls platform-service directly at port 4020, but ALL routes are wrong:

| Console API Call | Actual Backend Route | Status |
|---|---|---|
| `GET /users` | NO CONTROLLER | **MISSING** |
| `GET /users/:id` | NO CONTROLLER | **MISSING** |
| `PATCH /users/:id` | NO CONTROLLER | **MISSING** |
| `DELETE /users/:id` | NO CONTROLLER | **MISSING** |
| `POST /users/:id/impersonate` | NO CONTROLLER | **MISSING** |
| `POST /users/:id/force-logout` | NO CONTROLLER | **MISSING** |
| `GET /users/:id/sessions` | NO CONTROLLER | **MISSING** |
| `PUT /users/:id/toggle-active` | NO CONTROLLER | **MISSING** |
| `GET /organizations` | NO CONTROLLER | **MISSING** (org-service at :4009 has it, not platform-service) |
| `GET /organizations/:id` | NO CONTROLLER | **MISSING** |
| `POST /organizations` | NO CONTROLLER | **MISSING** |
| `PATCH /organizations/:id` | NO CONTROLLER | **MISSING** |
| `DELETE /organizations/:id` | NO CONTROLLER | **MISSING** |
| `POST /organizations/:id/suspend` | NO CONTROLLER | **MISSING** |
| `POST /organizations/:id/activate` | NO CONTROLLER | **MISSING** |
| `GET /organizations/:id/stats` | NO CONTROLLER | **MISSING** |
| `GET /organizations/:id/members` | NO CONTROLLER | **MISSING** |
| `PATCH /organizations/:id/subscription` | NO CONTROLLER | **MISSING** |
| `GET /features` | `/api/platform-features` | **WRONG PREFIX** |
| `GET /features/:id` | `/api/platform-features/:id` | **WRONG PREFIX** |
| `PATCH /features/:id` | `/api/platform-features/:id` | **WRONG PREFIX** |
| `GET /features/:id/overrides` | `/api/platform-features/:id/overrides` | **WRONG PREFIX** |
| `POST /features/:id/overrides` | `/api/platform-features/:id/overrides` | **WRONG PREFIX** |
| `DELETE /features/:id/overrides/:orgId` | `/api/platform-features/:id/overrides/:orgId` | **WRONG PREFIX** |
| `GET /subscriptions/plans` | `/api/platform-subscriptions/plans` | **WRONG PREFIX** |
| `GET /subscriptions/plans/:id` | `/api/platform-subscriptions/plans/:id` | **WRONG PREFIX** |
| `POST /subscriptions/plans` | `/api/platform-subscriptions/plans` | **WRONG PREFIX** |
| `PATCH /subscriptions/plans/:id` | `/api/platform-subscriptions/plans/:id` | **WRONG PREFIX** |
| `DELETE /subscriptions/plans/:id` | `/api/platform-subscriptions/plans/:id` | **WRONG PREFIX** |
| `PATCH /subscriptions/organizations/:id/subscription` | NO CONTROLLER | **MISSING** |
| `GET /health` | `/api/platform-health` | **WRONG PREFIX** |
| `POST /health/check` | `/api/platform-health/check` | **WRONG PREFIX** |
| `GET /audit` | `/api/platform-audit` | **WRONG PREFIX** |
| `GET /audit/:id` | `/api/platform-audit/:id` | **WRONG PREFIX** |
| `GET /broadcasts` | NO CONTROLLER | **MISSING** |
| `GET /broadcasts/:id` | NO CONTROLLER | **MISSING** |
| `POST /broadcasts` | NO CONTROLLER | **MISSING** |
| `PATCH /broadcasts/:id` | NO CONTROLLER | **MISSING** |
| `DELETE /broadcasts/:id` | NO CONTROLLER | **MISSING** |
| `GET /config` | NO CONTROLLER | **MISSING** |
| `GET /config/:key` | NO CONTROLLER | **MISSING** |
| `PATCH /config` | NO CONTROLLER | **MISSING** |

**Root cause:** Platform-service has `setGlobalPrefix('api')` and controllers use `platform-` prefix (e.g., `@Controller('platform-features')`), so actual routes are `/api/platform-features`. Console calls plain `/features` without prefix.

### 3. Missing Backend Controllers
Platform-service only has 4 controllers:
- `PlatformFeaturesController` (`/api/platform-features`)
- `PlatformSubscriptionsController` (`/api/platform-subscriptions`)
- `PlatformAuditController` (`/api/platform-audit`)
- `PlatformHealthController` (`/api/platform-health`)

**Missing controllers needed:**
- `PlatformUsersController` - User management (list, get, update, deactivate, force-logout, impersonate, sessions, toggle-active)
- `PlatformOrganizationsController` - Organization management (list, get, create, update, delete, suspend, activate, stats, members, updateSubscription)
- `PlatformBroadcastsController` - Broadcast management (list, get, create, update, delete)
- `PlatformConfigController` - Platform config (list, get, update)

Note: The domain entities, repository interfaces, and Prisma models for Broadcast and PlatformConfig already exist.

---

## P1 - High (Poor UX)

### 4. Silent Error Catches Throughout
Every page swallows errors with `catch { /* ignore */ }`:
- `dashboard/page.tsx:25-27` - Stats load failures silently ignored
- `users/page.tsx:32` - User list load failure silently ignored
- `organizations/page.tsx:37` - Org list load failure silently ignored
- `organizations/[id]/page.tsx:61,75,84,92` - Module/toggle/subscription/user failures silently ignored
- `subscriptions/page.tsx:32` - Plans load failure silently ignored
- `features/page.tsx:26` - Features load failure silently ignored
- `audit/page.tsx:31` - Audit logs failure silently ignored
- `health/page.tsx:39,50` - Health data/check failure silently ignored
- `broadcasts/page.tsx:28` - Broadcasts load failure silently ignored

**Impact:** Users see empty states with no indication of errors.

### 5. Header Search Bar is Non-Functional
`layout.tsx:109-116` renders a search input with no `onChange` handler or search logic. Purely decorative.

### 6. Notification Bell is Non-Functional
`layout.tsx:118-123` renders a bell icon with a red dot but no click handler or notification list. Purely decorative.

---

## P2 - Medium (Code Quality)

### 7. Dead Components
- `components/ProtectedRoute.tsx` - Never imported/used anywhere
- `components/ErrorBoundary.tsx` - Never imported/used anywhere
- `components/ui/button.tsx` - Never imported/used
- `components/ui/card.tsx` - Never imported/used
- `components/ui/input.tsx` - Never imported/used

### 8. Dashboard activeOrgs/suspendedOrgs Always 0
`dashboard/page.tsx:32-33` hardcodes `activeOrgs: 0, suspendedOrgs: 0` and never fetches real data.

### 9. Dashboard "Updated just now" is Always Shown
`dashboard/page.tsx:175` - Static text "Updated just now" regardless of actual update time.

---

## P3 - Low (Polish)

### 10. Inconsistent Page Layouts
- `users/page.tsx`: `min-h-screen bg-gray-50 p-6`
- `subscriptions/page.tsx`: `min-h-screen bg-gray-50 p-6`
- `features/page.tsx`: `min-h-screen bg-gray-50 p-6`
- `audit/page.tsx`: `min-h-screen bg-gray-50 p-8`
- `health/page.tsx`: `min-h-screen bg-gray-50 p-8`
- `broadcasts/page.tsx`: `min-h-screen bg-gray-50 p-8`
- `organizations/page.tsx`: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`
- `organizations/[id]/page.tsx`: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`
- `dashboard/page.tsx`: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`

Mixed padding (p-6 vs p-8), mixed outer containers.

### 11. Subscription Plans Hardcoded Values
`subscriptions/page.tsx:25` - Form defaults `price: 0` without currency selection. Billing cycle not included in form.

---

## Architecture Notes

- **Console calls platform-service directly** at `http://localhost:4020`, bypassing the API gateway. This is fine for an admin tool but means ALL routes must exist on platform-service.
- **Platform-service has own auth** via `PlatformAdminGuard` that validates JWT and checks for `SUPER_ADMIN` or `SUPPORT_ADMIN` role. Does NOT use shared `JwtAuthGuard` from `@farm/auth`.
- **Prisma models exist** for `Broadcast`, `PlatformConfig`, `AuditLog`, `FeatureFlag`, `FeatureFlagOverride`, `SubscriptionPlan`, `SystemHealth`.
- **Repository interfaces exist** for `BroadcastRepository` and `PlatformConfigRepository` in `domain/repositories/platform.repository.ts` but have NO Prisma implementations.
- **Domain entities exist** for `Broadcast` and `PlatformConfig` in `domain/entities/platform.entity.ts`.
- **App has 7 pages**: dashboard, users, organizations, organizations/[id], subscriptions, features, audit, health, broadcasts = 9 routes total (with nested).
