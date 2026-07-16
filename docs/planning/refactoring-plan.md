# Farm Management System — Refactoring Plan

> **Date:** July 2026
> **Scope:** Frontend/backend separation + clean architecture implementation across all 4 apps

---

## Table of Contents

1. [Current State Audit](#1-current-state-audit)
2. [Critical Issues](#2-critical-issues)
3. [Proposed Directory Structure](#3-proposed-directory-structure)
4. [Phase 0: Shared Types & API Layer](#4-phase-0-shared-types--api-layer)
5. [Phase 1: Data-Fetching Layer](#5-phase-1-data-fetching-layer)
6. [Phase 2: Component Architecture](#6-phase-2-component-architecture)
7. [Phase 3: Architecture Consistency](#7-phase-3-architecture-consistency)
8. [Phase 4: Console Integration](#8-phase-4-console-integration)
9. [Phase 5: Frontend/Backend Directory Separation](#9-phase-5-frontendbackend-directory-separation)
10. [Phase 6: Server Components (Optional)](#10-phase-6-server-components-optional)
11. [Package Dependency Rules](#11-package-dependency-rules)
12. [Implementation Order](#12-implementation-order)

---

## 1. Current State Audit

### 1.1 Cross-App Comparison

| Aspect | web | console | admin | mobile |
|---|---|---|---|---|
| **Framework** | Next.js 15 App Router | Next.js App Router | Next.js App Router | Expo Router 6 |
| **API client** | `@farm/api-client` | `@farm/api-client` | Own axios (458 lines) | Own axios (655 lines) |
| **State mgmt** | Context only | Context only | Context only | Redux Toolkit + persist |
| **Data fetching** | `useState` + `useEffect` | `useState` + `useEffect` | Custom `useFetch` (cache) | `useState` + `useEffect` |
| **Types** | Inline `any` | Inline `any` | Inline `any` | Inline `any` |
| **Uses `@farm/types`** | Yes | Yes | Yes | Yes |
| **Uses `@farm/validation`** | Yes | **No** | Yes | Yes |
| **Uses `@farm/api-client`** | Yes | Yes | **No** | **No** |
| **Components** | 11 flat | 1 file | 30+ (ui/ + flat) | 3 tiers |
| **Hooks** | 6 | **0** | 5 | 8 |

### 1.2 Shared Packages Status

| Package | Frontend Consumers | Backend Consumers | Status |
|---|---|---|---|
| `@farm/auth` | web, admin, mobile, console | All 12 services | Active, well-used |
| `@farm/types` | web, console, admin, mobile | All services | Active |
| `@farm/validation` | web, admin, mobile | All services | **Console missing** |
| `@farm/api-client` | **web only** | None | **3 apps don't use it** |
| `@farm/ui` | None | None | **Skeletal, unused** |
| `@farm/database` | None | All services | Backend-only |
| `@farm/domain-core` | None | All services | Backend-only |
| `@farm/utils` | None | All services | Backend-primary |
| `@farm/*-domain` (x10) | None | Corresponding services | Backend-only |

### 1.3 Empty Packages (Dead Weight)

These directories exist under `packages/` but contain no code or `package.json`:

- `charts/`
- `config/`
- `constants/`
- `maps/`
- `notifications/`
- `permissions/`
- `stores/`
- `testing/`

### 1.4 Root-Level Infrastructure Files

Currently scattered at the monorepo root:

- `docker-compose.yml` (Postgres + PgBouncer)
- `pgbouncer/` (config files)
- `render.yaml` + `render.yml` (deployment config)
- `scripts/` (devops scripts)

---

## 2. Critical Issues

### 2.1 Triple API Client Duplication

Three separate Axios implementations with identical CRUD patterns:

| File | Lines | Used By |
|---|---|---|
| `apps/web/src/lib/api.ts` | ~200 | Re-exports from `@farm/api-client` |
| `apps/console/src/lib/api.ts` | 180 | Standalone, 2 Axios instances |
| `apps/admin/src/lib/api.ts` | 458 | Standalone, 28 API modules |
| `apps/mobile/src/services/api.ts` | 655 | Standalone, 30+ API modules |

### 2.2 No Type Safety at API Boundary

Every app uses `any` for API request/response types despite `@farm/types` providing typed interfaces:

```typescript
// Current (admin/api.ts)
create: (data: any) => apiClient.post('/farms', data),
update: (id: string, data: any) => apiClient.put(`/farms/${id}`, data),

// Should be
create: (data: CreateFarmRequest) => apiClient.post('/farms', data),
update: (id: string, data: UpdateFarmRequest) => apiClient.put(`/farms/${id}`, data),
```

### 2.3 No Data-Fetching Abstraction

Every page in every app duplicates this pattern:

```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

const loadData = async () => {
  setLoading(true);
  try {
    const { data } = await someAPI.list(params);
    setData(data.items);
  } catch (err) {
    toastError(getErrorMessage(err));
  }
  setLoading(false);
};

useEffect(() => { loadData(); }, [dependencies]);
```

This is repeated in **50+ page files** across 4 apps.

### 2.4 Permission Logic Duplicated

Both `apps/web/src/lib/permissions.ts` and `apps/admin/src/lib/permissions.ts` re-implement `matchesPermission()` locally instead of importing from `@farm/auth/roles`.

### 2.5 Console Is an Island

`apps/console` does not use:
- `@farm/types` (defines its own `User`, `Org`, `Role`, etc.)
- `@farm/validation` (defines its own Zod schemas)
- `@farm/api-client` (has its own Axios setup)

### 2.6 Monolithic Page Components

Pages mix data fetching, filtering, pagination, forms, and modals in single files:

- `apps/console/src/app/(platform)/organizations/[id]/page.tsx` — 517 lines
- `apps/web/src/app/(app)/farms/page.tsx` — 221 lines
- `apps/admin/src/app/(app)/crops/page.tsx` — 300+ lines

### 2.7 No SSR Anywhere

All pages are `'use client'` with `useEffect` data fetching. No Next.js server components, no `getServerSideProps`, no route handler usage.

---

## 3. Proposed Directory Structure

```
farm-management-system/
│
├── apps/                              # FRONTEND APPLICATIONS
│   ├── web/                           # Next.js customer-facing (port 3001)
│   ├── admin/                         # Next.js farm admin (port 3000)
│   ├── console/                       # Next.js platform console (port 3004)
│   └── mobile/                        # Expo React Native (port 8082)
│
├── services/                          # BACKEND SERVICES
│   ├── api-gateway/                   # NestJS gateway (port 4000)
│   ├── auth-service/                  # NestJS auth (port 4001)
│   ├── farm-service/                  # NestJS (port 4002)
│   ├── livestock-service/             # NestJS (port 4003)
│   ├── poultry-service/               # NestJS (port 4004)
│   ├── finance-service/               # NestJS (port 4006)
│   ├── notification-service/          # NestJS (port 4005)
│   ├── reporting-service/             # NestJS (port 4008)
│   ├── worker-service/                # NestJS (port 4007)
│   ├── organization-service/          # NestJS (port 4009)
│   ├── crop-service/                  # NestJS (port 4011)
│   ├── hr-service/                    # NestJS (port 4012)
│   └── platform-service/              # NestJS (port 4020)
│
├── packages/                          # SHARED PACKAGES
│   │
│   │  ── Shared (frontend + backend) ──
│   ├── auth/                          # @farm/auth
│   ├── types/                         # @farm/types
│   ├── validation/                    # @farm/validation
│   │
│   │  ── Frontend-only ──
│   ├── api-client/                    # @farm/api-client
│   ├── ui/                            # @farm/ui (web React components)
│   ├── ui-native/                     # @farm/ui-native (React Native) [NEW]
│   ├── hooks/                         # @farm/hooks (shared React hooks) [NEW]
│   │
│   │  ── Backend-only ──
│   ├── database/                      # @farm/database
│   ├── domain-core/                   # @farm/domain-core
│   ├── utils/                         # @farm/utils
│   │
│   │  ── Domain packages (DDD) ──
│   └── domains/
│       ├── crop-domain/
│       ├── farm-domain/
│       ├── finance-domain/
│       ├── hr-domain/
│       ├── identity-domain/
│       ├── livestock-domain/
│       ├── notification-domain/
│       ├── platform-domain/
│       ├── poultry-domain/
│       └── reporting-domain/
│
├── infra/                             # INFRASTRUCTURE [NEW]
│   ├── docker-compose.yml             # Postgres + PgBouncer
│   ├── pgbouncer/                     # PgBouncer config
│   ├── render.yaml                    # Render deployment
│   └── render.yml                     # Render deployment (alt)
│
├── scripts/                           # DEVOPS SCRIPTS
├── docs/                              # DOCUMENTATION
├── .github/                           # CI/CD
│
│  ── Root config ──
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── tsconfig.json
```

### 3.1 What Changes vs Current

| Current Location | New Location | Reason |
|---|---|---|
| `pgbouncer/` (root) | `infra/pgbouncer/` | Infrastructure grouping |
| `docker-compose.yml` (root) | `infra/docker-compose.yml` | Infrastructure grouping |
| `render.yaml` + `render.yml` (root) | `infra/render.yaml` | Infrastructure grouping |
| `packages/ui/` (unused) | `packages/ui/` + `packages/ui-native/` | Web + RN split |
| No shared hooks | `packages/hooks/` | DRY custom hooks |
| Empty `packages/` dirs | Deleted | Dead weight removal |

### 3.2 Target App Structure (Next.js)

After clean architecture refactor, each Next.js app should follow:

```
apps/<app>/
├── src/
│   ├── app/                    # Next.js App Router routes
│   ├── components/
│   │   ├── ui/                 # Re-exports from @farm/ui
│   │   └── features/           # Feature-specific components
│   │       ├── farms/
│   │       │   ├── FarmList.tsx
│   │       │   ├── FarmForm.tsx
│   │       │   ├── FarmDetail.tsx
│   │       │   └── index.ts
│   │       ├── crops/
│   │       └── ...
│   ├── hooks/                  # Domain hooks
│   │   ├── useFarms.ts
│   │   ├── useCrops.ts
│   │   └── ...
│   ├── lib/                    # Infrastructure
│   │   ├── api.ts              # Client setup (thin wrapper around @farm/api-client)
│   │   ├── auth.tsx            # Auth context
│   │   ├── socket.tsx          # Socket context
│   │   └── providers.tsx       # Provider tree
│   └── types/                  # App-specific types (extends @farm/types)
└── package.json
```

### 3.3 Target App Structure (Mobile)

```
apps/mobile/
├── app/                        # Expo Router file-based routes
├── src/
│   ├── store/                  # Redux store + slices
│   ├── services/               # @farm/api-client instance + offline adapter
│   ├── hooks/                  # Domain hooks
│   ├── components/
│   │   ├── ui/                 # Re-exports from @farm/ui-native
│   │   ├── feedback/           # StateView, ToastHost, ErrorBoundary
│   │   └── features/           # Feature-specific components
│   ├── screens/                # Screen containers (thin wrappers)
│   └── utils/                  # App-specific utilities
└── package.json
```

---

## 4. Phase 0: Shared Types & API Layer

**Goal:** Stop the bleeding. Make the API boundary typed and deduplicate HTTP clients.

**Effort:** Medium | **Impact:** High

### 4a. Expand `@farm/types`

Add missing frontend-specific types to `packages/types/src/`:

| New File | Types to Add |
|---|---|
| `dashboard.ts` | `DashboardStats`, `KPIData`, `FarmOverview` |
| `health.ts` | `ServiceHealth`, `HealthSummary`, `HealthCheck` |
| `platform.ts` | `AuditLog`, `Broadcast`, `ConfigItem`, `ApiKey`, `Feature`, `SubscriptionPlan` |
| `api.ts` | `PaginatedResponse<T>`, `ApiError`, `ApiResponse<T>` (upgrade existing) |

**Also:** Add frontend-facing request/response types for all 30+ domains. Currently `@farm/types` has `CreateFarmRequest` and `UpdateFarmRequest` but many domains are missing their request types.

### 4b. Make `@farm/api-client` the Single API Source

| App | Current State | Action |
|---|---|---|
| `apps/web` | Already uses `@farm/api-client` | Verify completeness, add missing endpoints |
| `apps/admin` | 458-line standalone `api.ts` | Replace with `@farm/api-client` import |
| `apps/console` | 180-line standalone `api.ts` | Replace with `@farm/api-client` import |
| `apps/mobile` | 655-line standalone `api.ts` | Replace with `@farm/api-client` + RN adapter |

**Mobile-specific:** Create a React Native adapter in `@farm/api-client` that:
- Uses `withCredentials: true` for cookie-based auth
- Handles 401 refresh with queue pattern
- Exports an `createMobileClient()` factory

### 4c. Fix Permission Duplication

Delete from both `apps/web/src/lib/permissions.ts` and `apps/admin/src/lib/permissions.ts`:
- `matchesPermission()` — import from `@farm/auth/roles`
- `extractPermissions()` — import from `@farm/auth/roles`

Replace with:
```typescript
import { matchesPermission, userHasPermission } from '@farm/auth/roles';
```

### 4d. Clean Empty Packages

Delete these empty directories under `packages/`:
- `charts/`, `config/`, `constants/`, `hooks/`, `maps/`, `notifications/`, `permissions/`, `stores/`, `testing/`

---

## 5. Phase 1: Data-Fetching Layer

**Goal:** Replace every page's `useState` + `useEffect` + loading boilerplate.

**Effort:** High | **Impact:** High

### 5a. Web, Console, Admin — TanStack Query (React Query)

Add `@tanstack/react-query` to each Next.js app:

```typescript
// lib/providers.tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,      // 1 minute
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### 5b. Domain Query Hooks

Create shared hooks in `packages/hooks/` or app-local `hooks/`:

```typescript
// hooks/useFarms.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { farmsAPI } from '@farm/api-client';
import type { Farm, CreateFarmRequest, UpdateFarmRequest } from '@farm/types';

export function useFarms(params?: FarmListParams) {
  return useQuery({
    queryKey: ['farms', params],
    queryFn: () => farmsAPI.list(params),
  });
}

export function useFarm(id: string) {
  return useQuery({
    queryKey: ['farms', id],
    queryFn: () => farmsAPI.get(id),
    enabled: !!id,
  });
}

export function useCreateFarm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFarmRequest) => farmsAPI.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['farms'] }),
  });
}

export function useUpdateFarm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFarmRequest }) =>
      farmsAPI.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['farms'] }),
  });
}

export function useDeleteFarm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => farmsAPI.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['farms'] }),
  });
}
```

### 5c. Mobile — RTK Query

Replace manual axios calls in mobile with RTK Query:

```typescript
// src/store/api/farmsApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Farm, CreateFarmRequest } from '@farm/types';

export const farmsApi = createApi({
  reducerPath: 'farmsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_GATEWAY_URL,
    credentials: 'include',
  }),
  tagTypes: ['Farm'],
  endpoints: (builder) => ({
    listFarms: builder.query<Farm[], FarmListParams>({
      query: (params) => ({ url: '/farms', params }),
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Farm' as const, id })), 'Farm']
          : ['Farm'],
    }),
    createFarm: builder.mutation<Farm, CreateFarmRequest>({
      query: (body) => ({ url: '/farms', method: 'POST', body }),
      invalidatesTags: ['Farm'],
    }),
    updateFarm: builder.mutation<Farm, { id: string; data: UpdateFarmRequest }>({
      query: ({ id, data }) => ({ url: `/farms/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Farm', id }],
    }),
    deleteFarm: builder.mutation<void, string>({
      query: (id) => ({ url: `/farms/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Farm', id }],
    }),
  }),
});

export const { useListFarmsQuery, useCreateFarmMutation, useUpdateFarmMutation, useDeleteFarmMutation } = farmsApi;
```

### 5d. Page Refactor Example

**Before (current pattern):**
```typescript
'use client';
import { useState, useEffect } from 'react';
import { farmsAPI } from '@/lib/api';
import { useToast } from '@/lib/toasts';

export default function FarmsPage() {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  const loadFarms = async () => {
    setLoading(true);
    try {
      const { data } = await farmsAPI.list({ page });
      setFarms(data.items);
    } catch (err) {
      toast.error('Failed to load farms');
    }
    setLoading(false);
  };

  useEffect(() => { loadFarms(); }, [page]);

  // ... 200 lines of JSX mixing table, filters, forms, modals
}
```

**After (clean architecture):**
```typescript
'use client';
import { useFarms } from '@/hooks/useFarms';
import { FarmList } from '@/components/features/farms/FarmList';
import { FarmFilters } from '@/components/features/farms/FarmFilters';
import { DataTable } from '@/components/ui/DataTable';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

export default function FarmsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useFarms({ page });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} onRetry={() => setPage(page)} />;

  return (
    <div>
      <FarmFilters />
      <FarmList farms={data?.items ?? []} />
      <Pagination page={page} onPageChange={setPage} />
    </div>
  );
}
```

---

## 6. Phase 2: Component Architecture

**Goal:** Extract shared UI into `@farm/ui`, decompose monolithic pages.

**Effort:** Medium | **Impact:** Medium

### 6a. Build `@farm/ui` as the Shared Component Library

Move primitives from `apps/admin/src/components/ui/` (already well-structured):

| Component | Source | Props |
|---|---|---|
| `Button` | admin `components/ui/button.tsx` | `variant`, `size`, `disabled`, `loading` |
| `Input` | admin `components/ui/input.tsx` | `label`, `error`, `placeholder` |
| `Select` | admin `components/ui/select.tsx` | `options`, `value`, `onChange` |
| `Table` | admin `components/ui/table.tsx` | `columns`, `data`, `loading` |
| `Card` | admin `components/ui/card.tsx` | `title`, `description`, `children` |
| `Badge` | admin `components/ui/badge.tsx` | `variant`, `children` |
| `Dialog` | admin `components/ui/dialog.tsx` | `open`, `onClose`, `title` |
| `Pagination` | admin `components/ui/pagination.tsx` | `page`, `total`, `onPageChange` |
| `Loading` | admin `components/ui/loading.tsx` | `size`, `fullPage` |
| `EmptyState` | web `components/ui.tsx` | `icon`, `title`, `description` |

**Package config:**
```json
{
  "name": "@farm/ui",
  "main": "./src/index.ts",
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  }
}
```

### 6b. Create `@farm/ui-native` for Mobile

Port primitives to React Native from `apps/mobile/src/components/common/`:

| Component | Source |
|---|---|
| `Button` | `UIComponents.tsx` Button |
| `TextInput` | `UIComponents.tsx` TextInputField |
| `Card` | `UIComponents.tsx` Card |
| `Badge` | `ReusableComponents.tsx` Badge |
| `Modal` | `ReusableComponents.tsx` Modal |
| `LoadingSpinner` | `ReusableComponents.tsx` LoadingSpinner |
| `EmptyState` | `ReusableComponents.tsx` EmptyState |
| `StatsCard` | `ReusableComponents.tsx` StatsCard |
| `ConfirmDialog` | `ReusableComponents.tsx` ConfirmDialog |

**Package config:**
```json
{
  "name": "@farm/ui-native",
  "main": "./src/index.ts",
  "peerDependencies": {
    "react": "^19.0.0",
    "react-native": ">=0.70.0"
  }
}
```

### 6c. Decompose Page Components

Each monolithic page should be split into:

```
page.tsx                  # Route entry (thin wrapper)
├── index.ts              # Feature barrel export
├── FarmList.tsx          # Table/list view
├── FarmForm.tsx          # Create/edit form
├── FarmDetail.tsx        # Detail view
├── FarmFilters.tsx       # Filter controls
├── FarmStats.tsx         # KPI cards (if applicable)
└── types.ts              # Feature-specific types (extends @farm/types)
```

**Example decomposition of `apps/console/src/app/(platform)/organizations/[id]/page.tsx` (517 lines):**

```
organizations/[id]/
├── page.tsx              # ~30 lines: loads org, renders tabs
├── OrgDetail.tsx         # ~80 lines: header, stats, actions
├── OrgMembers.tsx        # ~100 lines: member list + invite
├── OrgSettings.tsx       # ~80 lines: settings form
├── OrgBilling.tsx        # ~60 lines: subscription info
├── OrgAudit.tsx          # ~60 lines: audit log
└── types.ts              # ~20 lines: OrgDetail, OrgMember interfaces
```

### 6d. Extract Shared Patterns

Create these reusable components across apps:

| Component | Purpose | Currently Duplicated In |
|---|---|---|
| `DataTable` | Sortable table with loading/empty states | web, admin, console (all separate implementations) |
| `FilterBar` | Search + filter controls | web, admin |
| `Pagination` | Page navigation | web, admin, console (3 implementations) |
| `ConfirmDialog` | Destructive action confirmation | admin (uses `confirm()` in others) |
| `EmptyState` | No-data placeholder | web, admin, console, mobile (4 implementations) |
| `LoadingSpinner` | Loading indicator | web, admin, console, mobile (4 implementations) |
| `PageHeader` | Title + actions bar | web, admin |
| `StatCard` | KPI display card | web, admin, mobile (3 implementations) |

---

## 7. Phase 3: Architecture Consistency

**Goal:** All 4 apps follow the same directory structure and patterns.

**Effort:** Low | **Impact:** Medium

### 7a. Standardize Next.js App Structure

All Next.js apps (web, admin, console) should follow:

```
src/
├── app/                    # Routes (App Router)
├── components/
│   ├── ui/                 # @farm/ui re-exports
│   └── features/           # Feature-specific components
├── hooks/                  # Domain hooks
├── lib/                    # Infrastructure
│   ├── api.ts              # Client setup (thin)
│   ├── auth.tsx            # Auth context
│   ├── socket.tsx          # Socket context
│   └── providers.tsx       # Provider tree
└── types/                  # App-specific types
```

### 7b. Standardize Imports

```typescript
// Always import types from @farm/types
import type { Farm, CreateFarmRequest } from '@farm/types';

// Always import validation from @farm/validation
import { createFarmSchema } from '@farm/validation';

// Always import API from @farm/api-client
import { farmsAPI } from '@farm/api-client';

// Always import UI from @farm/ui
import { Button, Card, Table } from '@farm/ui';

// Always import auth from @farm/auth
import { isPublicPath } from '@farm/auth/paths';
import { matchesPermission } from '@farm/auth/roles';
```

### 7c. Standardize Error Handling

```typescript
// Create a shared error handler pattern
import { getErrorMessage } from '@farm/utils';

// In components
try {
  await createFarm(data);
  toast.success('Farm created');
} catch (err) {
  toast.error(getErrorMessage(err));
}
```

---

## 8. Phase 4: Console Integration

**Goal:** Console stops being an island.

**Effort:** Low | **Impact:** Medium

### 8a. Add Missing Dependencies

```bash
pnpm add @farm/types @farm/validation @farm/api-client --filter @farm/console
```

### 8b. Replace Inline Types

| Current (inline in page files) | Replace With |
|---|---|
| `interface User { ... }` in `users/page.tsx` | `import type { User } from '@farm/types'` |
| `interface Org { ... }` in `organizations/page.tsx` | `import type { Organization } from '@farm/types'` |
| `interface Role { ... }` in `roles/page.tsx` | `import type { UserRole } from '@farm/types'` |
| `interface Option { ... }` | Shared `SelectOption` type in `@farm/types` |
| `interface ServiceHealth { ... }` | `import type { ServiceHealth } from '@farm/types'` |

### 8c. Replace Inline Schemas

| Current | Replace With |
|---|---|
| Local Zod schemas in `src/lib/validation.ts` | `import { loginSchema, ... } from '@farm/validation'` |

### 8d. Replace API Module

| Current | Replace With |
|---|---|
| `src/lib/api.ts` (180 lines, 2 Axios instances) | `import { createPlatformClient } from '@farm/api-client'` |

### 8e. Extract Layout Components

Move from `src/app/(platform)/layout.tsx` (195 lines):
- `Sidebar` → `src/components/layout/Sidebar.tsx`
- `Header` → `src/components/layout/Header.tsx`
- `UserSection` → `src/components/layout/UserSection.tsx`

---

## 9. Phase 5: Frontend/Backend Directory Separation

**Goal:** Physically separate infrastructure files from application code.

**Effort:** Low | **Impact:** Low (organizational clarity)

### 9a. Create `infra/` Directory

```bash
mkdir infra
mv docker-compose.yml infra/
mv pgbouncer/ infra/
mv render.yaml infra/
mv render.yml infra/
```

### 9b. Update References

Update any scripts or CI/CD that reference the moved files:

| File | Old Path | New Path |
|---|---|---|
| `scripts/*.sh` | `./docker-compose.yml` | `./infra/docker-compose.yml` |
| `.github/workflows/*.yml` | `docker-compose.yml` | `infra/docker-compose.yml` |

### 9c. Clean Empty Packages

```bash
rm -rf packages/charts packages/config packages/constants
rm -rf packages/hooks packages.maps packages/notifications
rm -rf packages/permissions packages/stores packages/testing
```

### 9d. Create `packages/ui-native/` (if not done in Phase 2)

```bash
mkdir -p packages/ui-native/src/components
```

### 9e. Create `packages/hooks/` (if not done in Phase 2)

Move shared hooks from individual apps:

| Hook | Currently In | Move To |
|---|---|---|
| `useDebounce` | web, admin, mobile | `packages/hooks/src/useDebounce.ts` |
| `useLocalStorage` | web, admin | `packages/hooks/src/useLocalStorage.ts` |
| `useMediaQuery` | web, admin | `packages/hooks/src/useMediaQuery.ts` |

---

## 10. Phase 6: Server Components (Optional)

**Goal:** Migrate data-fetching pages from `'use client'` to server components where possible.

**Effort:** High | **Impact:** Medium (performance + SEO)

### 10a. Candidates for Server Components

| Page Type | Migration Strategy |
|---|---|
| Dashboard | Fetch stats server-side, render KPI cards as RSC |
| List pages (initial load) | Server-side first page, client-side for filters/pagination |
| Detail pages | Server-side initial data, client-side for actions |
| Static pages (settings, about) | Full RSC |

### 10b. Migration Pattern

```typescript
// Before (all client)
'use client';
import { useEffect, useState } from 'react';
import { farmsAPI } from '@/lib/api';

export default function FarmsPage() {
  const [farms, setFarms] = useState([]);
  useEffect(() => { farmsAPI.list().then(r => setFarms(r.data.items)); }, []);
  return <FarmList farms={farms} />;
}

// After (server component + client island)
// app/(app)/farms/page.tsx (SERVER)
import { farmsAPI } from '@/lib/server-api';
import { FarmsClient } from './FarmsClient';

export default async function FarmsPage() {
  const { data } = await farmsAPI.list({ page: 1 });
  return <FarmsClient initialFarms={data.items} />;
}

// app/(app)/farms/FarmsClient.tsx (CLIENT)
'use client';
import { useState } from 'react';
import { useFarms } from '@/hooks/useFarms';

export function FarmsClient({ initialFarms }) {
  const [page, setPage] = useState(1);
  const { data } = useFarms({ page }, { initialData: initialFarms });
  return <FarmList farms={data.items} />;
}
```

---

## 11. Package Dependency Rules

### Dependency Graph

```
                    ┌──────────────────────┐
                    │    apps/web           │
                    │    apps/admin         │
                    │    apps/console       │
                    │    apps/mobile        │
                    └──────────┬───────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
    ┌────▼────┐         ┌─────▼─────┐         ┌────▼────┐
    │ @farm/  │         │ @farm/    │         │ @farm/  │
    │ api-    │         │ ui        │         │ hooks   │
    │ client  │         │ ui-native │         │         │
    └────┬────┘         └─────┬─────┘         └────┬────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
                    ┌──────────▼───────────┐
                    │  SHARED PACKAGES      │
                    │  @farm/auth           │
                    │  @farm/types          │
                    │  @farm/validation     │
                    └──────────┬───────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
    ┌────▼────┐         ┌─────▼─────┐         ┌────▼────┐
    │ @farm/  │         │ @farm/    │         │ @farm/  │
    │ database│         │ domain-   │         │ utils   │
    └────┬────┘         │ core      │         └────┬────┘
         │              └─────┬─────┘              │
         │                    │                     │
         └────────────────────┼─────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  services/*         │
                    │  (NestJS backends)  │
                    └────────────────────┘
```

### Allowed Dependencies

| Package | May Depend On |
|---|---|
| `apps/*` | `@farm/auth`, `@farm/types`, `@farm/validation`, `@farm/api-client`, `@farm/ui`, `@farm/ui-native`, `@farm/hooks` |
| `services/*` | `@farm/auth`, `@farm/types`, `@farm/validation`, `@farm/database`, `@farm/domain-core`, `@farm/utils`, `@farm/*-domain` |
| `@farm/api-client` | `@farm/types`, `axios` |
| `@farm/ui` | `react`, `react-dom`, `clsx`, `tailwind-merge` |
| `@farm/ui-native` | `react`, `react-native` |
| `@farm/hooks` | `react` |
| `@farm/auth` | `@farm/types`, `jsonwebtoken` |
| `@farm/types` | (none — pure TypeScript) |
| `@farm/validation` | `zod`, `@farm/types` |
| `@farm/database` | `@prisma/client`, `@farm/types`, `@farm/auth` |
| `@farm/domain-core` | `uuid` |
| `@farm/utils` | `zod`, `@nestjs/common` (peer) |

### Forbidden Dependencies

| From | To | Reason |
|---|---|---|
| `apps/*` | `services/*` | Frontend must not import backend code |
| `services/*` | `apps/*` | Backend must not import frontend code |
| `@farm/api-client` | `@farm/database` | API client is frontend-only |
| `@farm/ui` | `@farm/database` | UI library is frontend-only |
| Any package | `apps/*` | Apps are leaf nodes, not dependencies |

---

## 12. Implementation Order

| Phase | Description | Effort | Impact | Dependencies |
|---|---|---|---|---|
| **0** | Shared types + API layer | Medium | **High** | None |
| **1** | Data-fetching layer (React Query / RTK Query) | High | **High** | Phase 0 |
| **2** | Component architecture (`@farm/ui`, `@farm/ui-native`) | Medium | Medium | Phase 0 |
| **3** | Architecture consistency (directory standardization) | Low | Medium | Phases 0-2 |
| **4** | Console integration | Low | Medium | Phase 0 |
| **5** | Frontend/backend directory separation | Low | Low | None (can run parallel) |
| **6** | Server components (optional) | High | Medium | Phases 0-1 |

### Recommended Execution Order

```
Week 1-2:  Phase 0 (types + API) + Phase 5 (directory separation) [parallel]
Week 2-3:  Phase 1 (data fetching) + Phase 4 (console) [parallel]
Week 3-4:  Phase 2 (components) + Phase 3 (consistency) [parallel]
Week 5+:   Phase 6 (server components, if desired)
```

### Quick Wins (Do First)

1. Delete empty `packages/` directories (5 minutes)
2. Move `docker-compose.yml` + `pgbouncer/` to `infra/` (10 minutes)
3. Fix permission duplication in web + admin (30 minutes)
4. Add `@farm/types` to console's dependencies (10 minutes)

---

## Appendix A: Files to Create

| File | Purpose |
|---|---|
| `packages/ui/src/index.ts` | Barrel export for web components |
| `packages/ui/src/components/*.tsx` | Shared React components |
| `packages/ui-native/src/index.ts` | Barrel export for RN components |
| `packages/ui-native/src/components/*.tsx` | Shared RN components |
| `packages/hooks/src/index.ts` | Barrel export for shared hooks |
| `packages/hooks/src/useDebounce.ts` | Debounce hook |
| `packages/hooks/src/useLocalStorage.ts` | LocalStorage hook |
| `packages/hooks/src/useMediaQuery.ts` | Media query hook |
| `packages/types/src/dashboard.ts` | Dashboard-specific types |
| `packages/types/src/platform.ts` | Platform admin types |
| `packages/types/src/health.ts` | Health check types |
| `apps/*/src/hooks/useFarms.ts` | Farm data-fetching hooks |
| `apps/*/src/hooks/useCrops.ts` | Crop data-fetching hooks |
| `apps/*/src/components/features/*/` | Feature component directories |

## Appendix B: Files to Delete

| File/Directory | Reason |
|---|---|
| `packages/charts/` | Empty placeholder |
| `packages/config/` | Empty placeholder |
| `packages/constants/` | Empty placeholder |
| `packages/hooks/` | Replaced by `packages/hooks/` with actual code |
| `packages/maps/` | Empty placeholder |
| `packages/notifications/` | Empty placeholder |
| `packages/permissions/` | Empty placeholder |
| `packages/stores/` | Empty placeholder |
| `packages/testing/` | Empty placeholder |
| `apps/web/src/lib/permissions.ts` | Duplicate of `@farm/auth/roles` |
| `apps/admin/src/lib/permissions.ts` | Duplicate of `@farm/auth/roles` |
| `apps/console/src/lib/api.ts` | Replaced by `@farm/api-client` |
| `apps/admin/src/lib/api.ts` | Replaced by `@farm/api-client` |
| `apps/mobile/src/services/api.ts` | Replaced by `@farm/api-client` |

## Appendix C: Updated `pnpm-workspace.yaml`

```yaml
packages:
  - apps/*
  - services/*
  - packages/*
  - packages/domains/*

ignoredBuiltDependencies:
  - '@prisma/client'
  - '@prisma/engines'
  - prisma
  - sharp
  - unrs-resolver

offline: false
storeDir: .pnpm-store
```

(No changes needed — current config already supports the proposed structure.)
