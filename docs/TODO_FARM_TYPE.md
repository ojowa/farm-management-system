# TODO: Add `farmType` to Farm Model

**Created:** July 2, 2026
**Status:** Complete

---

## 1. Design Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Storage | Plain `String` field with comment | Matches existing codebase convention (no Prisma enums used anywhere) |
| Allowed values | `CROP`, `LIVESTOCK`, `POULTRY`, `DAIRY`, `AQUACULTURE` | Fixed set, no MIXED (mixed = multiple farms under one org) |
| Mutability | Required on create, immutable after creation | User confirmed: no type changes after creation |
| Default | No default — user must choose | Prevents accidental wrong-type farms |
| Subscription | `maxFarms` stays total; per-type limits via `features` JSON on `SubscriptionPlan` | Flexible, adjustable without schema changes |

---

## 2. Farm Type Reference

| Type | Badge Color | Relevant Sub-sections |
|------|-------------|----------------------|
| `CROP` | Green | Fields, Crop Cycles, Inventory, Expenses, Sales |
| `LIVESTOCK` | Brown | Livestock, Workers, Inventory, Expenses, Sales |
| `POULTRY` | Orange | Poultry Houses, Pens, Flocks, Workers, Inventory |
| `DAIRY` | Blue | Dairy Cattle, Milking Records, Milk Sales |
| `AQUACULTURE` | Cyan | Ponds/Tanks, Feeding Records, Water Quality |

---

## 3. Files to Change

### Step 1: Database Schema

- [x] **`packages/database/prisma/schema.prisma`**
  - Add `farmType String` field to `Farm` model (required, no default)
  - Add comment: `// CROP, LIVESTOCK, POULTRY, DAIRY, AQUACULTURE`
  - Add `@@index([farmType])` for filtering
  - Run `prisma db push` to apply

### Step 2: Types & Validation (Packages)

- [x] **`packages/types/src/farm.ts`**
  - Add `farmType: string` to `Farm` interface
  - Add `farmType: string` to `CreateFarmRequest`
  - Add `FARM_TYPES` constant: `['CROP', 'LIVESTOCK', 'POULTRY', 'DAIRY', 'AQUACULTURE'] as const`
  - Add `FarmType` type: `typeof FARM_TYPES[number]`

- [x] **`packages/validation/src/farm.schema.ts`**
  - Add `farmType` to `createFarmSchema` as required: `z.enum(['CROP', 'LIVESTOCK', 'POULTRY', 'DAIRY', 'AQUACULTURE'])`
  - Add `farmType` to `updateFarmSchema` as optional (for admin override)

### Step 3: Farm Service (Backend)

- [x] **`services/farm-service/src/modules/farm/farm.repository.ts`**
  - Add `farmType` to `createFarm` method parameters and prisma create call
  - Add `farmType` filter to `getAllFarms` query (optional filter)
  - Include `farmType` in all response objects

- [x] **`services/farm-service/src/modules/farm/farm.controller.ts`**
  - Add `farmType` query parameter extraction in `getAllFarms`
  - Pass `farmType` filter to repository method

### Step 4: Admin Frontend

- [x] **`apps/admin/src/app/(app)/farms/page.tsx`**
  - Add `farmType: string` to local `Farm` interface
  - Add farm type column to table (with color-coded badge)
  - Add farm type filter dropdown (All, CROP, LIVESTOCK, POULTRY, DAIRY, AQUACULTURE)
  - Add farm type selector to "Add Farm" dialog form
  - Add farm type badge colors: green(CROP), brown(LIVESTOCK), orange(POULTRY), blue(DAIRY), cyan(AQUACULTURE)

- [x] **`apps/admin/src/app/(app)/farms/new/page.tsx`**
  - Add farm type selector as first required field in creation form

- [x] **`apps/admin/src/app/(app)/farms/[id]/page.tsx`**
  - Display farm type on detail page

- [x] **`apps/admin/src/app/(app)/farms/[id]/edit/page.tsx`**
  - Show farm type as read-only (immutable after creation)

### Step 4B: Mobile Frontend (React Native)

- [x] **`apps/mobile/src/utils/entityTransformers.ts`**
  - Add `farmType: string` to `RawFarm` interface
  - Add `farmType: string` to `MobileFarm` interface
  - Pass `farmType` through in `transformFarm()` function

- [x] **`apps/mobile/src/screens/app/FarmsScreen.tsx`**
  - Add `farmType: string` to local farm type definition
  - Add farm type badge on each farm card (color-coded)
  - Update filter logic to support farm type filtering

- [x] **`apps/mobile/app/(app)/farms/add.tsx`**
  - Add farm type picker/selector as first required field in creation form
  - Validate farmType is selected before submission

- [x] **`apps/mobile/app/(app)/farms/[id]/index.tsx`**
  - Display farm type badge on detail screen

- [x] **`apps/mobile/app/(app)/farms/[id]/edit.tsx`**
  - Show farm type as read-only (disabled picker or text)
  - Add info message: "Farm type cannot be changed after creation"

- [x] **`apps/mobile/src/store/slices/uiSlice.ts`**
  - Add `farmTypeFilter: string` to farms filter state (default: 'all')
  - Add `setFarmTypeFilter` action

- [x] **`apps/mobile/src/services/api.ts`**
  - Add `farmType` to `farmsAPI.create()` data parameter

### Step 4C: Web Frontend (Next.js)

- [x] **`apps/web/src/lib/api.ts`**
  - farmsAPI passes data directly (farmType included in form data)

- [x] **`apps/web/src/lib/validation.ts`**
  - Add `farmType` to `farmFormSchema` as required enum field

- [x] **`apps/web/src/app/(app)/farms/page.tsx`**
  - Add `farmType: string` to local `Farm` interface
  - Add farm type column to table (with color-coded badge)
  - Add farm type filter dropdown (All, CROP, LIVESTOCK, POULTRY, DAIRY, AQUACULTURE)
  - Add farm type selector to "Add Farm" modal form

- [x] **`apps/web/src/app/(app)/farms/[id]/page.tsx`**
  - Display farm type badge on detail page

- [x] **`apps/web/src/app/(app)/dashboard/page.tsx`**
  - Add farm type breakdown to dashboard stats

### Step 5: Subscription Limit Flexibility

- [x] **`packages/database/prisma/seed.ts`**
  - Updated subscription plan `features` from flat array to structured object:
    - `features.modules` — existing module list
    - `features.farmTypes` — allowed farm types per plan
  - FREE: `['CROP']`
  - BASIC: `['CROP', 'LIVESTOCK']`
  - PRO: `['CROP', 'LIVESTOCK', 'POULTRY', 'DAIRY']`
  - ENTERPRISE: `['CROP', 'LIVESTOCK', 'POULTRY', 'DAIRY', 'AQUACULTURE']`

- [x] **`packages/database/src/features.ts`**
  - Added `checkFarmTypeAllowed(prisma, organizationId, farmType)` — returns null if allowed, error message if not
  - Added `farmTypeGuard` Express middleware — reads `req.body.farmType`, checks against org plan's `features.farmTypes`
  - Super admins bypass farm type checks
  - Falls back to FREE plan (`CROP` only) if no plan assigned

- [x] **`services/farm-service/src/modules/farm/farm.module.ts`**
  - Added `farmTypeGuard` middleware to `POST /farms` route (after `subscriptionLimitGuard`)

### Step 6: Build & Verify

- [x] Run full `npx turbo run build` to verify no regressions (19/19 packages successful)

---

## 4. Subscription Per-Type Limits (Future)

The `SubscriptionPlan.features` JSON field stores type-specific config:

```json
{
  "farmTypes": ["CROP", "LIVESTOCK", "POULTRY", "DAIRY", "AQUACULTURE"],
  "maxPoultryFarms": 5,
  "maxDairyFarms": 2
}
```

This is checked at the service layer via `farmTypeGuard`, not the schema level — keeps the DB simple and limits adjustable per plan without migrations.

---

## 5. Migration Notes

- Existing farms will have no `farmType` — need to handle gracefully:
  - Option A: Set default to `"CROP"` for all existing farms
  - Option B: Make field nullable temporarily, backfill, then make required
  - **Recommended:** Option A (simplest, all existing farms are crop-based)

- Run `prisma db push` (not `migrate dev`) to match existing workflow

---

## 6. Out of Scope

- MIXED farm type (user confirmed: mixed = multiple farms under one org)
- New sub-entity models for dairy/aquaculture (user confirmed: keep existing models)
- Farm type changes after creation (user confirmed: immutable)
- Prisma enums (codebase uses plain strings everywhere)

---

*Last updated: July 2, 2026*
