# TODO: Backend Alignment for Web (Next.js)

## Purpose
This checklist aligns **web frontend capabilities** with **backend API/service contracts**.
It is derived from `web_todo.md` and expanded into backend-actionable items.

---

## Current known gaps (from `web_todo.md`)

### 1) Pagination / filtering / sorting via query params (backend contract gap)
**Status (web):**
- Implemented client-side pagination/filtering/sorting as a temporary solution.

**Status (backend):**
- ✅ **Farm-service**: Implemented pagination in farm.service.ts:19-21
- ✅ **Crop-service**: Implemented pagination in crop.service.ts:20-22
- ✅ **Livestock-service**: Implemented pagination in livestock.service.ts:38-40
- ✅ **Poultry-service**: Implemented pagination in poultry.service.ts:130-132
- ✅ **Inventory-service**: Implemented pagination in inventory.service.ts:33-35
- ✅ **Finance-service**: Implemented pagination in finance.service.ts:42-44
- ✅ **Reporting-service**: Implemented pagination

**Backend TODO:**
All entity endpoints now support pagination via query params with proper response envelope: `{ data, total, page, totalPages }`

**Apply to (web modules):**
- Farms ✅
- Crops ✅
- Livestock ✅
- Poultry (list + submodules) ✅
- Inventory ✅
- Finance/Reports ✅
- Reports views ✅

### 2) Real-time updates (Socket.IO event emission gap)
**Status (web):**
- Socket.io-client wiring exists.
- List pages are registered with `useRealtime(entity, handler)`.

**Status (backend):**
- ❌ **Farm-service**: Does NOT yet emit realtime events
- ❌ **Crop-service**: Does NOT yet emit realtime events
- ❌ **Livestock-service**: Does NOT yet emit realtime events
- ❌ **Poultry-service**: Does NOT yet emit realtime events
- ❌ **Inventory-service**: Does NOT yet emit realtime events
- ❌ **Finance-service**: Does NOT yet emit realtime events
- ✅ **Notification-service**: Already emits realtime events via gateway

**Backend TODO:**
- Define and implement a shared Socket.IO gateway (or consistent event publisher) that emits a realtime event on write operations.
- Each entity service (farm, crop, livestock, poultry, inventory, finance) needs to emit `realtime:event` with payload: `{ entity, action, data }` where action is: `created | updated | deleted`

**Apply to (web modules):**
- farms, crops, livestock, poultry, inventory, workers (and notifications if expected)

### 3) Notifications deep links (`Notification.link`) gap
**Status (web):**
- Notification center supports deep links using `notification.link`.

**Status (backend):**
- Backend notification creation flow likely does not populate the `link` field.

**Backend TODO:**
- Ensure Notification model includes `link` (if not already in schema).
- Populate `link` during notification creation flows.
- Ensure responses sent over HTTP/Socket include `link`.

### 4) Medication module backend endpoint missing (frontend partial)
**Status (web):**
- Medication module pages exist but are marked partial (frontend only, no backend endpoint).

**Backend TODO:**
- Implement Medication CRUD endpoint(s) used by web.
- Confirm data model (e.g., medication entries, dates, dosage, related poultry/livestock/crop entity).
- Ensure list/detail responses match frontend expectations.

---

### 2) Real-time updates (Socket.IO event emission gap)
**Status (web):**
- Socket.io-client wiring exists.
- List pages are registered with `useRealtime(entity, handler)`.

**Status (backend):**
- Backend services do **not** emit realtime events yet.

**Backend TODO:**
- Define and implement a shared Socket.IO gateway (or consistent event publisher) that emits a realtime event on write operations.

**Socket event contract (proposed; confirm in code):**
- event names: `realtime:event` (or a similar agreed convention)
- payload shape (proposed):
  - `{ entity, action, data }`
  - `action` in: `created | updated | deleted`

**Apply to (web modules):**
- farms, crops, livestock, poultry, inventory, workers (and notifications if expected)

---

### 3) Notifications deep links (`Notification.link`) gap
**Status (web):**
- Notification center supports deep links using `notification.link`.

**Status (backend):**
- Backend notification creation flow likely does not populate the `link` field.

**Backend TODO:**
- Ensure Notification model includes `link` (if not already in schema).
- Populate `link` during notification creation flows.
- Ensure responses sent over HTTP/Socket include `link`.

---

### 4) Medication module backend endpoint missing (frontend partial)
**Status (web):**
- Medication module pages exist but are marked partial (frontend only, no backend endpoint).

**Backend TODO:**
- Implement Medication CRUD endpoint(s) used by web.
- Confirm data model (e.g., medication entries, dates, dosage, related poultry/livestock/crop entity).
- Ensure list/detail responses match frontend expectations.

---

## Concrete checklist by service/module (to fill after backend inspection)
> The sections below will be made precise after we inspect API routes/controllers/gateways.

### farms-service
- [x] Add list query params support (filters: organizationId, name, location; pagination; sorting)
- [x] Update response to `{data,total,page,totalPages}`
- [ ] Emit realtime events on create/update/delete

### crop-service
- [x] Add list query params support (filters: name, fieldId, cropId, status; pagination; sorting)
- [x] Update response envelope
- [ ] Emit realtime events

### livestock-service
- [x] Add list query params support (filters: farmId, species, status, search; pagination; sorting)
- [x] Update response envelope
- [ ] Emit realtime events

### poultry-service
- [x] Add list query params support (all 7 endpoints: poultryHouses, pens, breeds, flocks, feedingRecords, vaccinationRecords, mortalityRecords)
- [x] Add list endpoints for submodules used by web (egg production, feeding, vaccination, mortality)
- [ ] Emit realtime events

### inventory-service
- [x] Add list query params support (filters: farmId, category, search; pagination; sorting)
- [x] Update response envelope
- [ ] Emit realtime events

### finance-service / reporting-service
- [x] Confirm finance/report endpoints needed by web are query-param capable (if required)
- [x] Update response envelope if lists are paginated
- [ ] Emit realtime events if web expects updates

### notification-service
- [ ] Ensure `Notification.link` is present in schema/DTO
- [ ] Ensure notification creation populates `link`
- [ ] Emit realtime notification events if required by web UI

### api-gateway / socket gateway
- [ ] Ensure HTTP routes proxy query params properly to services
- [ ] Ensure Socket.IO gateway forwards/emit realtime events to clients

---

## Definition of Done (alignment)
- [x] Every web list page that currently does client-side filtering/pagination has a backend equivalent option.
- [ ] List pages receive realtime updates (create/update/delete) without manual refresh.
- [ ] Notification deep links work end-to-end.
- [ ] Medication module works fully with backend CRUD endpoints.

