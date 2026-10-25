# Admin vs Mobile UI Alignment Audit
Date: 2026-10-25
Scope: farm-client/admin (Next.js 15) vs farm-client/mobile (Expo Router)

## Executive Summary
Overall structure differs by platform (web tables/dialogs vs mobile stacks). Core domains (Farms, Livestock, Poulvest Poultry, Crops, Finance, Inventory, Tasks, Workers) exist on both. Main gaps: Poultry data chain alignment, HR/workforce parity, some admin-only modules missing on mobile, and form/validation inconsistencies.

## Module-by-Module

### Dashboard
| Item | Admin | Mobile | Status | Notes |
|---|---|---|---|---|
| Overview stats | `/app/(app)/dashboard/page.tsx` | `/app/(app)/index.tsx` | Partial | Mobile simpler; admin has more widgets/reports links. Align metric names. |

### Farms
| Item | Admin | Mobile | Status | Notes |
|---|---|---|---|---|
| List/Detail/Edit/Add | `/app/(app)/farms/*` | `/app/(app)/farms/*` (index/list/add/[id]/edit/add-field/data-transfer) | Mostly aligned | Mobile has extra `data-transfer.tsx`, `add-field.tsx`. Good parity. |

### Crops
| Item | Admin | Mobile | Status | Notes |
|---|---|---|---D----|--- |
| List/Add/Detail/Edit/Calendar/Irrigation/Pest-Disease | `/app/(app)/crops/*` | `/app/(app)/crops/*` | Mostly aligned | Parity is decent. |

### Livestock
| Item | Admin | Mobile | Status | Notes |
|---|---|---|---|--- |
| List/Add/Detail/Edit/Health/Vaccinations/Weight/Breeding | `/app/(app)/livestock/*` | `/app/(app)/livestock/*` | Mostly aligned | Admin has cleaner filters; mobile forms need validation check against server. |

### Poultry (Critical)
| Item | Admin | Mobile | Status | Notes |
|---|---|---|---|--- |
| Houses/Pens/Breeds/Flocks | `/app/(app)/poultry/houses/*`, `/app/(app)/poultry/flocks/*` | `/app/(app)/poultry/houses.tsx`, `/app/(app)/poultry/flocks/*` | Partial | Admin uses structured tables + dialogs; mobile uses different layout. |
| Add Flock | `/app/(app)/poultry/flocks/page.tsx` (dialog) | `/app/(app)/poultry/add.tsx` or `/app/(app)/poultry/flocks/index.tsx` | **Mismatch** | **PEN NOT LOADING** - Mobile not filtering pens by selected farm/house correctly. Must use farm->house->pen chain. |
| Records (egg/feeding/vaccination/mortality/medication/sales) | `/app/(app)/poultry/[module]/[id]/*` with config | Separate tabs: `egg-production.tsx`, `feeding.tsx`, `vaccinations.tsx`, `mortality.tsx`, `medications.tsx`, `sales.tsx` | Partial | Admin shows flock batchCode links; mobile may show raw IDs. Need to resolve links. |
| Detail/Edit | Admin has dynamic routes + house edit | `/app/(app)/poultry/[id]/index.tsx`, `[id]/edit.tsx` | Partial | Need to ensure IDs match API. |

### Finance
| Item | Admin | Mobile | Status | Notes |
|---|---|---|---|--- |
| Transactions/Budgets/Profitability/Reports | `/app/(app)/finance/*` | `/app/(app)/finance/*` | Mostly aligned | Check currency/formats. |

### Inventory
| Item | Admin | Mobile | Status | Notes |
|---|---|---|---|--- |
| List/Adjustments/Low-stock | `/app/(app)/inventory/*` | `/app/(app)/inventory/*` | Mostly aligned | Mobile simplified. |

### HR/Workforce (Gap)
| Item | Admin | Mobile | Status | Notes |
|---|---|---|---|--- |
| Workers | `/app/(app)/workers/*` | `/app/(app)/workers/*` | Mostly aligned | Good. |
| Roster/Attendance/Leave | `/app/(app)/roster/*`, `/app/(app)/workers/attendance/*`, `/app/(app)/hr/leave/*` | `/app/(app)/roster/*`, `/app/(app)/attendance/*`, `/app/(app)/leave.tsx` | **Partial** | Admin has full HR module (`hr/leave/types`, `balances`, `approvals`). Mobile missing admin HR subpages. Consolidate into consistent flows. |

### Aquaculture
| Item | Admin | Mobile | Status | Notes |
|---|---|---|---|--- |
| List/Add/Detail/Edit | `/app/(app)/aquaculture/*` (admin?) | `/app/(app)\aquaculture/*` | Unknown/Admin missing or hidden | Mobile has aquaculture; check admin presence. |
...