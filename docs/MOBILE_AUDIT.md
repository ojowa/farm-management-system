# Mobile App Audit Report

## Summary
- **Total files audited**: 66 source files (src/ + app/)
- **Issues found**: 16 (3 P0, 5 P1, 8 P2)
- **Apps audited**: `apps/mobile`

---

## P0 — Critical (Runtime crashes, data corruption, security)

### 1. React hooks rule violation in FarmsScreen.tsx
**File**: `src/screens/app/FarmsScreen.tsx:158`
**Issue**: `useAppSelector` called inside `fetchFarms` callback (inside `useCallback`), violating React hooks rules. This causes unpredictable behavior — the selector runs outside the component render cycle.
**Fix**: Move `organizationId` selection to component body via `useAppSelector`.

### 2. React hooks rule violation in CropsScreen.tsx
**File**: `src/screens/app/CropsScreen.tsx:158` (same pattern as FarmsScreen)
**Issue**: Identical `useAppSelector` inside `fetchFarms` callback. Same hooks violation.
**Fix**: Same as FarmsScreen.

### 3. Empty route file — poultry/dashboard.tsx
**File**: `app/poultry/dashboard.tsx`
**Issue**: File is completely empty (0 lines). If a user navigates to this route, it will render nothing or crash depending on Expo Router behavior. This route is outside the `(app)` group so it won't be protected by the app layout.
**Fix**: Either remove the file or add a valid redirect/component.

---

## P1 — High (Silent failures, hardcoded config, degraded UX)

### 4. Silent catch in CropsScreen fetchFarms
**File**: `src/screens/app/CropsScreen.tsx:218`
**Issue**: `catch { /* ignore */ }` — farm list failure is completely silent. If the farms API is down, the farm filter dropdown will be empty with no user feedback.
**Fix**: Show toast or `console.warn`.

### 5. Silent catch in LivestockScreen fetchFarms
**File**: `src/screens/app/LivestockScreen.tsx:194`
**Issue**: Same as #4 — farm list failure is silent.
**Fix**: Show toast or `console.warn`.

### 6. Silent catch in TasksScreen loadTasks
**File**: `src/screens/app/TasksScreen.tsx:140`
**Issue**: `catch { /* ignore */ }` — task list failure is silent. User sees empty list with no error.
**Fix**: Show toast.

### 7. Silent catch in TasksScreen workersAPI
**File**: `src/screens/app/TasksScreen.tsx:148`
**Issue**: `.catch(() => {})` — worker list failure is silent. Assign-to dropdown will be empty with no explanation.
**Fix**: `console.warn`.

### 8. Silent catch in AttendanceScreen loadData
**File**: `src/screens/app/AttendanceScreen.tsx:92-93`
**Issue**: `catch { /* ignore */ }` — attendance load failure is silent.
**Fix**: Show toast.

### 9. Hardcoded finance categories
**File**: `src/screens/app/FinanceScreen.tsx:156-159`
**Issue**: `ALL_CATEGORIES` array is hardcoded: `['Crops', 'Livestock', 'Poultry', 'Services', 'Other', 'Seeds', 'Fertilizer', 'Feed', 'Veterinary', 'Equipment', 'Labor', 'Utilities']`. If categories are added/removed in the backend, the mobile app won't reflect changes without a code deploy.
**Fix**: Fetch from `financeAPI` or a shared config endpoint.

### 10. Missing weather tab route
**File**: `app/(app)/_layout.tsx:25`
**Issue**: `TAB_CONFIG` defines a `weather` tab (`{ name: 'weather', ... }`) but no `app/(app)/weather.tsx` file exists. Expo Router will fail to resolve this route.
**Fix**: Remove the weather tab entry or create a placeholder screen.

### 11. `useFetch` hook is unused
**File**: `src/hooks/useFetch.ts`
**Issue**: A well-written `useFetch` hook exists with caching, error handling, and transform support — but no screen uses it. Every screen duplicates manual fetch logic with loading/error state.
**Fix**: Migrate screens to use `useFetch` (low priority, technical debt).

---

## P2 — Medium (Code quality, duplication, minor bugs)

### 12. Duplicate color definitions in ReusableComponents.tsx
**File**: `src/components/common/ReusableComponents.tsx:12-25`
**Issue**: `ReusableComponents.tsx` redeclares a local `colors` object identical to `UIComponents.tsx`. This creates maintenance risk — if colors change in one file, they'll drift.
**Fix**: Import `colors` from `./UIComponents`.

### 13. inactivity.ts missing AppState listener
**File**: `src/utils/inactivity.ts:17-23`
**Issue**: `startInactivityTracker` defines `onAppStateChange` but never calls `AppState.addEventListener('change', onAppStateChange)`. The tracker arms the timer but app foreground/background transitions won't reset it.
**Fix**: Add `AppState.addEventListener` call and clean it up in the return function.

### 14. storage.ts clearAllStorage is a no-op
**File**: `src/utils/storage.ts:14-16`
**Issue**: `clearAllStorage()` has the comment "No-op: auth removed" but the function body is empty. If called during logout, nothing is actually cleared.
**Fix**: Either implement actual cleanup or remove the function and its callers.

### 15. Hardcoded API_BASE_URL fallback in notifications.ts and socketService.ts
**Files**: `src/services/notifications.ts:6-8`, `src/sync/socketService.ts:6-8`
**Issue**: Both files duplicate `API_BASE_URL` with the same fallback to `http://localhost:4000`. This should be a single shared constant.
**Fix**: Extract to a shared config module (e.g., `src/config.ts`).

### 16. Extensive use of `any` types
**Files**: Multiple screens (TasksScreen, AttendanceScreen, DashboardScreen, etc.)
**Issue**: Many screens use `any[]` for state variables (tasks, workers, attendance records). This defeats TypeScript's value.
**Fix**: Define proper interfaces for API responses.

---

## What's Good
- **Offline-first architecture**: Well-structured with `offlineApi.ts`, `reconcileQueue.ts`, and `syncSlice` for queue management with retry logic.
- **RBAC integration**: `usePermission` hook with wildcard matching is clean and consistent.
- **Entity transformers**: `entityTransformers.ts` cleanly maps backend shapes to mobile-friendly shapes.
- **Error classification**: `apiError.ts` categorizes errors into network/auth/server/client for user-friendly messages.
- **Response parser**: `responseParser.ts` handles dual API response formats (array vs wrapped).
- **Realtime sync**: Socket.io integration with module-level event subscriptions.
- **Toast system**: Redux-backed with auto-dismiss.
- **Accessibility**: Good use of `accessibilityRole`, `accessibilityLabel`, `accessibilityState` throughout.
- **FlatList optimization**: Screens use `removeClippedSubviews`, `maxToRenderPerBatch`, `windowSize`.
- **Consistent patterns**: All list screens follow the same loading → error → empty → list flow.

---

## Recommendations
1. **Fix P0 issues immediately** — hooks violations can cause subtle rendering bugs.
2. **Replace all silent catches** with at minimum `console.warn` for debuggability.
3. **Extract shared API base URL** to `src/config.ts`.
4. **Migrate screens to `useFetch`** to eliminate duplicate fetch/loading/error boilerplate.
5. **Add proper TypeScript types** for all API responses — replace `any[]`.
6. **Delete or complete `poultry/dashboard.tsx`**.
7. **Remove the weather tab** until the feature is implemented.
