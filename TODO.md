# TODO.md — Fully develop the mobile app

## Scope
Mobile app = `apps/mobile` (Expo + React Native + Expo Router + Redux Toolkit + Axios + AsyncStorage).

## Phase 0 — Stabilize foundation (must-have)
- [ ] Verify Expo Router navigation is correctly wired from the app entry
  - [ ] Ensure root layout redirects unauthenticated users to `/(auth)/login`
  - [ ] Ensure MFA-required users go to `/(auth)/mfa` (or equivalent)
- [ ] Ensure Redux auth bootstrap loads tokens/user on startup
- [ ] Ensure `logout()` clears:
  - [ ] AsyncStorage tokens
  - [ ] Redux auth state
  - [ ] Any persisted UI state (selected IDs, filters)
- [ ] Replace console-only errors with UI feedback (toasts/alerts)
- [ ] Add global network/loading UX:
  - [ ] Global retry buttons for initial data fetch
  - [ ] Consistent loading skeletons/spinners

## Phase 1 — CRUD for each entity (highest priority functional completeness)
> For each module below: list, detail, add, edit, delete should exist and work end-to-end.

### Farms
- [x] Implement Farms add screen (UI + form)
- [x] Implement Farms edit screen (prefill + submit)
- [x] Implement Farms detail screen (view single farm)
- [x] Wire View/Edit/Delete buttons to real screens
- [x] Confirm delete flow calls `farmsAPI.delete()` and updates list state
- [x] Add form validation:
  - [x] required fields
  - [x] numeric ranges (size, crops, animals where applicable)
  - [x] status toggle (active/inactive)

### Crops
- [x] Implement Crops add screen
- [x] Implement Crops edit screen
- [x] Implement Crops detail screen
- [x] Wire View/Edit actions to real screens
- [x] Add crop health/status editing UI
- [x] Add farm assignment selector (dropdown/search)
- [x] Add form validation (area, plantedDate, health 0-100)

### Livestock & Poultry
- [x] Implement Livestock add screen
- [x] Implement Poultry add screen (or a unified create screen)
- [x] Implement Livestock/Poultry edit screens
- [x] Implement Livestock/Poultry detail screens
- [x] Implement "Health" screens for:
  - [x] updating health status
  - [x] last checkup date
- [x] Ensure combined list links to correct detail/health routes
- [x] Add form validation:
  - [x] quantity > 0
  - [x] health allowed values (healthy/sick/treatment)
  - [x] breed required

### Finance
- [x] Implement Finance add transaction screen
- [x] Implement Finance edit transaction screen
- [x] Implement Finance detail screen (optional, but recommended)
- [x] Wire Add Transaction / Edit actions
- [x] Implement delete flow for transactions
- [x] Add form validation:
  - [x] type income/expense
  - [x] category required
  - [x] amount sign rules (store as signed or normalized—match backend expectation)
  - [x] date required/valid format

## Phase 2 — Improve lists: filtering, pagination, sorting
- [x] Add pagination to farms/crops/livestock/finance lists
  - [x] UI controls or infinite scroll
  - [x] backend query params support (if available)
- [x] Strengthen filtering UI:
  - [x] farms: status
  - [x] crops: by farm + status/health (if backend supports)
  - [x] livestock: type + optional farm filter
  - [x] finance: income/expense + category + date range
- [x] Add empty-state consistency across all screens
- [x] Add pull-to-refresh for all list screens (verify all routes)

## Phase 3 — Real-time updates (sync)
- [x] Integrate Socket.io events (socket.io-client already installed)
- [x] Decide event contract (e.g. `farm.created`, `farm.updated`, `farm.deleted`)
- [x] Update Redux store on events (apply patches or re-fetch module lists)
- [x] Handle connectivity changes gracefully:
  - [x] show "reconnecting…" UI
  - [x] avoid duplicate requests

## Phase 4 — Offline mode + caching
- [x] Implement offline persistence
  - [x] Install/configure persistence (e.g., redux-persist) or custom caching
- [x] Cache GET results per module (farms/crops/animals/finance)
- [x] Detect offline/online with NetInfo
- [x] Queue write operations (create/update/delete) while offline
- [x] Reconcile queued operations once online

## Phase 5 — Push notifications + reminders
- [x] Add push notification support (Expo Notifications)
- [x] Request permissions UX in Settings
- [x] Implement notification handlers + deep links to relevant screens
- [ ] Add server-side notification triggers (or verify existing backend support)

## Phase 6 — Media & profile enhancements
- [x] Add avatar upload in Settings
  - [x] file picker/image picker
  - [x] upload to backend/storage
  - [x] update profile avatar URL
- [x] Implement "Edit Profile" screen if not already present

## Phase 7 — UI/UX polish + accessibility
- [x] Dark mode support (theme integration)
- [x] Accessibility improvements:
  - [x] label important inputs
  - [x] improve contrast
  - [x] ensure screen-reader friendly text
- [x] Consistent component library usage:
  - [x] standardize spacing/buttons/cards
- [x] Replace placeholder navigation targets with real routes (no missing screens)

## Phase 8 — Security & correctness
- [x] Verify auth edge cases:
  - [x] refresh failure redirects to login
  - [x] MFA session expiry handling
- [x] Ensure API client refresh flow is correct under concurrent 401s
- [x] Ensure tokens are not leaked in logs

## Phase 9 — Testing & release readiness
- [x] Run manual testing using `apps/mobile/TESTING_CHECKLIST.md`
- [x] Add/verify automated tests (at least basic unit tests for:
  - [x] reducers (authSlice, syncSlice, uiSlice — 67 tests)
  - [x] API client error handling (apiError.ts — toApiError, describeApiError)
  - [x] auth token refresh flow (refreshAccessToken.rejected clears all state)
  - [x] storage cleanup (clearAllStorage removes all keys)
  )
- [x] Performance checks:
  - [x] large list scrolling (FlatList: removeClippedSubviews, maxToRenderPerBatch, windowSize)
  - [x] reduce re-renders (useMemo for filtered arrays, useCallback for renderItem)
- [x] Build production artifacts:
  - [x] `eas build --platform ios`
  - [x] `eas build --platform android`

## Done criteria
- [x] All core screens have full CRUD (where applicable)
- [x] Navigation routes exist for every button/link
- [x] App passes the mobile testing checklist for integration and error handling
- [x] Offline/real-time features implemented to spec (if included in product requirements)

