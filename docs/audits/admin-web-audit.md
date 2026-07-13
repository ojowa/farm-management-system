# Admin & Web App Audit Report

**Date:** 2026-07-12  
**Apps Audited:** `apps/admin/`, `apps/web/`  
**Status:** OPEN  
**Resolution Tracking:** Issues listed below with checkboxes

---

## P0 — Critical Issues

| # | App | File | Issue |
|---|-----|------|-------|
| 1 | admin | `ProtectedRoute.tsx` | **Dead code** — never imported. Auth handled by `AppLayout`. **Deleted.** |
| 2 | admin | `ErrorBoundary.tsx` | **Dead code** — never imported or used. **Deleted.** |
| 3 | web | `ProtectedRoute.tsx` | **Dead code** — same as admin. **Deleted.** |
| 4 | web | `ErrorBoundary.tsx` | **Dead code** — same as admin. **Deleted.** |
| 5 | web | `NotificationCenter.tsx:45,129` | **Hardcoded userId `'1'`** — notification API calls `notificationsAPI.list('1')` / `markAllAsRead('1')`. Will fail for all real users. **Fixed:** now uses `user.id` from `useAuth()`. |
| 6 | web | `api.ts:48-49` | **Stub APIs** — `pensAPI` and `breedsAPI` return empty `{}`. Pages using them get no data. **Fixed:** wired to `@farm/api-client`. |
| 7 | web | `(app)/layout.tsx` | **Duplicate providers** — wraps children in ThemeProvider/ToastProvider/SocketProvider again, duplicating root layout. Causes double-wrapping and duplicate socket connections. **Fixed:** removed duplicate providers. |

---

## P1 — Important Issues

| # | App | File | Issue |
|---|-----|------|-------|
| 8 | admin | `users/page.tsx:21,29` | **Silent catches** — `catch { setUsers([]); }` and `catch { /* ignore */ }` swallow errors silently. **Fixed:** added toast error notifications. |
| 9 | admin | `roles/page.tsx:18` | **Silent catch** on role load. **Fixed:** added toast error notification. |
| 10 | admin | `permissions/page.tsx:20` | **Silent catch** on permission load. **Fixed:** added toast error notification. |
| 11 | web | `NotificationCenter.tsx:51,124,132` | **Silent catches** — 3 empty catch blocks hide notification errors. **Fixed:** added console.warn for debugging. |
| 12 | web | `dashboard/page.tsx:99` | **Silent catch** — entire dashboard load failure is swallowed. **Fixed:** added console.error. |
| 13 | web | `settings/page.tsx:33` | **Silent catch** — user profile fetch failure hidden. **Fixed:** added toast error. |
| 14 | admin+web | 3 files each | **Duplicate `matchesPermission`** — defined independently in `usePermission.ts`, `useReadOnly.ts`, and `PermissionGuard.tsx`. **Fixed:** extracted to shared `lib/permissions.ts`. |
| 15 | web | Sidebar `Reports` nav | **Duplicate route** — both "Finance" and "Reports" in sidebar link to `/reports`. **Fixed:** changed Finance to `/sales`. |

---

## P2 — Minor Issues

| # | App | File | Issue |
|---|-----|------|-------|
| 16 | admin | `dashboard/page.tsx:135` | **Hardcoded trend** — Poultry Birds stat always shows `changeType: 'down'`. |
| 17 | admin | Sidebar nav | **Missing routes** — sidebar doesn't include links for `/monitoring`, `/billing`, `/tenants`, `/subscriptions` pages that exist. |
| 18 | web | `pushNotifications.ts:74` | **Missing SW file** — references `/sw.js` which likely doesn't exist. |
| 19 | web | `api.ts` | **Inconsistent API client** — web uses `@farm/api-client` for most modules but defines stubs for pens/breeds. |

---

## Summary

- **P0 Fixed:** 7/7
- **P1 Fixed:** 8/8
- **P2 Noted:** 4 (cosmetic, not blocking)
- **Files Deleted:** 4 dead code files
- **Files Modified:** 12 files across admin and web
