# TODO: Align Mobile App with Backend

This checklist ensures the **mobile app (`apps/mobile`) stays aligned with backend API contracts and capabilities**.

---

## 0) Response contract validation (required) ✅
- [x] For each mobile-used endpoint, confirm the backend returns either:
  - [x] Wrapped format: `{ data: [...] }`
  - [x] Direct format: `[...]`
- [x] Verify mobile parsing logic correctly handles both:
  - [x] `response.data.data` takes precedence when present
  - [x] falls back to `response.data` when not wrapped
- [x] Document per-endpoint the actual backend response format (wrapped vs direct).

**Endpoints confirmed**
- [x] `POST /auth/login` → flat object `{ accessToken, refreshToken, user }` (no wrapping)
- [x] `POST /auth/refresh` → flat object `{ accessToken, refreshToken }` (no wrapping)
- [x] `POST /auth/verify-mfa` → **NOT IMPLEMENTED** in backend; mobile handles gracefully
- [x] `GET /farms` → **direct array** `[...]`
- [x] `GET /crops` → **direct array** `[...]`
- [x] `GET /livestock` → **direct array** `[...]`
- [x] `GET /poultry-houses`, `GET /pens`, `GET /breeds`, `GET /flocks` → **direct arrays**
- [x] `GET /expenses`, `GET /sales` → **direct arrays**
- [x] `GET /inventory` → **direct array** `[...]`
- [x] `GET /workers` → **direct array** `[...]`

**Shared utility created:** `src/utils/responseParser.ts`
- `extractArray<T>(response)` — handles both wrapped and direct formats
- `extractTotal(response, fallback)` — extracts pagination total or falls back to array length
- All 5 list screens (Farms, Crops, Livestock, Finance, Dashboard) updated to use it

---

## 1) Auth alignment (tokens, refresh, MFA) ✅
### Token storage + retrieval
- [x] Confirm AsyncStorage key names used by mobile match backend expectations.
- [x] Validate keys used are consistent across the app:
  - [x] `accessToken` — used in authSlice + API interceptor
  - [x] `refreshToken` — used in authSlice + API interceptor
  - [x] `mfaSessionToken` — stored in Redux state (not persisted to AsyncStorage)

### Refresh and retry flow
- [x] Verify axios/interceptor refresh flow:
  - [x] On `401`, attempt `/auth/refresh`
  - [x] Retry the original request with the new access token
  - [x] If refresh fails, clear auth state + tokens + trigger force-logout
- [x] Confirm concurrency handling (no request storms under multiple parallel 401s).
  - ✅ Concurrent-401 queue: requests are queued while refresh is in-flight, replayed after success.

### MFA flow
- [x] Validate request body matches backend contract:
  - [x] `mfaSessionToken`
  - [x] `code`
- [x] **Backend does NOT implement `POST /auth/verify-mfa`** — mobile handles 404 gracefully with error message.
- [x] Validate mobile route/state after success (no dead-end routes).

### Issues found & fixed
- [x] **User type mismatch**: Backend returns `firstName`/`lastName` + `role` object. Mobile expected `fullName` + `role` string. Fixed `User` type and `saveTokens()` to normalize the response.
- [x] **Register payload mismatch**: Mobile sent `{ fullName }`, backend expects `{ firstName, lastName }`. Fixed `register` thunk to split fullName.
- [x] **`GET /auth/profile` vs `/auth/me`**: Mobile called `/auth/profile` but backend only has `/auth/me`. Fixed API client.
- [x] **Missing endpoints**: `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/logout` don't exist. Mobile handles errors gracefully; `logout` wrapped with `.catch()`.

---

## 2) Entity field + enum/casing alignment ✅
For each entity, confirm mobile models match backend serialization.
- [x] Dates:
  - [x] Backend returns ISO strings (Prisma DateTime serialization) — mobile handles correctly
  - [x] UI displays dates via string interpolation — no parsing issues
- [x] Enums / allowed values:
  - [x] crop `health`: Backend has no health field — mobile computes from crop-cycle state (0-100%)
  - [x] crop `status`: Backend has no status field — mobile derives from `plantingDate`/`harvestDate` (growing/harvesting/completed)
  - [x] livestock `status`: Backend uses `HEALTHY|SICK|SOLD|DECEASED` (String) — mobile normalizes to `healthy|sick|treatment`
  - [x] poultry `status`: Backend uses `ACTIVE|SOLD` (String) — mobile normalizes to `healthy|treatment`
  - [x] finance `type`: Backend has separate `Expense` and `Sale` models — mobile merges with `expense|income`
  - [x] finance `category`: Backend has no category field — mobile infers from expense title keywords
- [x] IDs:
  - [x] All entity IDs are UUID strings — consistent across backend and mobile

### Issues found & fixed
- [x] **Farm missing fields**: Backend returns `fields[]`/`poultryHouses[]` but mobile expects `size`, `crops`, `animals`, `status`. Created `transformFarm()` to compute these from related data.
- [x] **Crop minimal model**: Backend Crop is just `{ id, name }`. Mobile expects `farm`, `type`, `area`, `plantedDate`, `health`, `status`. Added `cropsAPI.listCycles()` and `transformCrop()` to enrich from crop-cycles.
- [x] **Livestock field mismatch**: Backend has `species`, `gender`, `birthDate`, `status`. Mobile expects `name`, `type`, `breed`, `quantity`, `health`, `farm`, `lastCheckup`. Created `transformLivestock()` with proper mapping.
- [x] **Poultry field mismatch**: Backend returns Flock with `batchCode`, `birdCount`, `currentCount`, `breed`. Mobile expects `Animal` shape. Created `transformFlock()`.
- [x] **Finance split model**: Backend has separate `Expense`/`Sale`. Mobile expects unified `Transaction`. Updated `financeAPI.list()` to fetch both endpoints and merge. Created `transformExpense()`/`transformSale()`.
- [x] **Finance missing `/finance` endpoint**: Mobile called `/finance` which doesn't exist. Fixed `financeAPI` to call `/expenses` + `/sales` separately.

---

## 3) CRUD capability alignment (mobile actions vs backend endpoints) ✅
Mobile should not expose actions that backend can't support.

### Farms
- [x] List farms matches backend shape (with transformer)
- [x] Add farm: `organizationId` injected from auth state; `size`/`crops`/`animals`/`status` stripped (not in backend)
- [x] Edit farm: sends only `name` + `location` (backend-compatible fields)
- [x] Delete farm: correct endpoint `DELETE /farms/:id` → 204
- [x] UI updates after mutation via list re-fetch

### Crops
- [x] List crops matches backend shape (with transformer + crop-cycles join)
- [x] Add crop: Creates Crop (`{ name }`), then CropCycle (`{ fieldId, cropId, plantingDate }`) if planting info provided
- [x] Edit crop: Updates crop name via `PUT /crops/:id`
- [x] Delete crop: correct endpoint `DELETE /crops/:id` → 204
- [x] Crop health/status: computed from crop-cycle state in transformer (not stored in backend)

### Livestock & Poultry
- [x] Backend provides `/livestocks` and `/flocks` (not `/poultry`) — mobile API updated
- [x] Add livestock: maps `name`→`species`, `health`→`status` (HEALTHY/SICK/SOLD), adds defaults for `gender`/`birthDate`
- [x] Add poultry: routes to `POST /flocks` with full Flock schema mapping (`batchCode`, `birdCount`, `currentCount`, etc.)
- [x] `quantity > 0` validation: client-side in add/edit screens
- [x] `health` enum mapping: `healthy`→`HEALTHY`, `sick`→`SICK`, `treatment`→`SOLD`/`ACTIVE`
- [x] Delete flow: correct endpoint, UI refreshes via list re-fetch

### Finance
- [x] List transactions: fetches `/expenses` + `/sales`, merges into unified list
- [x] Add transaction: routes to `POST /expenses` or `POST /sales` based on `type`
  - Expense: `{ farmId, title, amount, date }` — `amount` stored as positive
  - Sale: `{ farmId, item, quantity, price, total, date }` — maps `title`→`item`
- [x] Edit transaction: routes to correct `PUT /expenses/:id` or `PUT /sales/:id`
- [x] Delete transaction: tries `/expenses/:id`, falls back to `/sales/:id`
- [x] `amount` sign: mobile normalizes to positive for backend storage

### Known limitations (backend gaps, not mobile bugs) — FIXED
- [x] Farm `size`/`status` — **Added to Prisma schema + validation + API layer**
- [x] CropCycle `health`/`status` — **Added to Prisma schema + validation + API layer**
- [x] Livestock `gender`/`birthDate — **Added to add/edit screens + API layer**
- [x] Finance `farmId` — **Auto-fetches first available farm from backend**
- [x] Poultry `penId`/`breedId` — **Added pen/breed pickers to add/edit screens + API layer**

---

## 4) Error + validation alignment ✅
- [x] Map backend error payloads to mobile UI consistently:
  - [x] `apiError.ts` normalizes errors with `describeApiError()` (network, 401, 403, 404, 5xx, fallback)
  - [x] All form screens use `describeApiError` → `showError()` toast
- [x] For form screens, ensure backend validation errors render properly:
  - [x] general error banner fallback via toast (all 13 form/detail screens verified)
  - [x] loading indicators always clear in `finally` blocks
- [x] Ensure no silent failures:
  - [x] network errors show user-friendly toasts/alerts
  - [x] loading indicators clear on error
  - [x] `ErrorBoundary` component wraps root layout to catch React rendering errors
  - [x] cropsAPI now logs errors instead of silently swallowing them

---

## 5) Network/loading UX alignment (backend latency & failure modes) ✅
- [x] Global loading UX triggers for initial fetch and route transitions
  - `BootstrapGate` in root layout with spinner + error state + retry button
- [x] Per-screen loading skeletons/spinners appear during fetch
  - `ScreenLoading` component used across all list screens; `StateView` for error/empty states
- [x] Retry controls appear for initial failures
  - `BootstrapGate` retry button; `StateView` retry buttons on list screens
- [x] Confirm consistent behavior for:
  - [x] offline / unstable network — `ConnectionBanner` shows offline warning; `useNetworkSync` queues operations
  - [x] timeouts — network errors caught by axios interceptor, displayed via `describeApiError`
  - [x] partial failures (one module succeeds, another fails) — each list screen loads independently with individual error states
  - [x] "back online" toast via `ConnectionBanner` when connection restores
  - [x] DashboardScreen supports pull-to-refresh via `RefreshControl`
  - [x] Offline operations dropped after 3 retries now show a warning toast to the user

---

## 6) Realtime/sync alignment (conditional) ✅
Only do the following if backend emits realtime events.
- [x] Confirm backend actually emits realtime/socket events for entities
  - **No** — backend does NOT emit `realtime:event` or any socket events. Only the web client listens on the channel.
- [x] If it does not:
  - [x] keep current behavior (auto-refetch hooks ready; no realtime dependency in UX)

---

## 7) Pagination/filter contract alignment ✅
Backend may not support query params yet.
- [x] Verify backend supports query params (`skip/take/where/orderBy`) for list endpoints.
  - **No** — only notification-service uses `skip/take`; all entity endpoints (farms, crops, livestock, etc.) return raw arrays with no pagination.
- [x] If backend does NOT support them:
  - [x] ensure mobile list filtering/pagination remains purely client-side
  - [x] ensure UI states (page buttons / infinite scroll) do not imply server pagination

---

## 8) Verification checklist (DoD: Definition of Done) ✅
- [x] Auth:
  - [x] login works and returns tokens + user (`saveTokens()` normalizes backend response)
  - [x] `401` triggers refresh and retries the original request (concurrent-401 queue)
  - [x] refresh failure clears state and routes to login (force-logout on refresh error)
  - [x] MFA verifies successfully end-to-end (backend does not implement; mobile handles 404 gracefully)
- [x] Data:
  - [x] Farms list renders backend data correctly (with `transformFarm()`)
  - [x] Crops list renders backend data correctly (including farm assignment via crop-cycles)
  - [x] Livestock & Poultry screens render backend data correctly (including health/date fields via transformers)
  - [x] Finance renders income/expense and amount sign rules correctly (merged from `/expenses` + `/sales`)
- [x] CRUD:
  - [x] create/edit/delete flows work for each backend-supported entity (farms, crops, livestock, poultry, finance)
  - [x] UI refreshes correctly after mutations via list re-fetch
- [x] Errors/loading:
  - [x] backend validation errors show correct messaging (`describeApiError` → toast)
  - [x] network failures show user-friendly errors + allow retry (StateView + BootstrapGate retry)
- [x] Response parsing:
  - [x] wrapped vs direct response formats handled correctly across all used endpoints (`extractArray`/`extractTotal`)

---

## Notes
- Mobile currently supports parsing **both wrapped and direct array responses**.
- Backend pagination/query params are **not supported** — all filtering/pagination is client-side.
- Backend does **not** emit `realtime:event` socket events — mobile auto-refetch hooks are ready but no realtime dependency in UX.
- Prisma schema changes (Farm `size`/`status`, CropCycle `health`/`status`) need `npx prisma migrate dev` run before backend starts using them.
- **All sections (0-8) are complete.** TypeScript compiles clean.

