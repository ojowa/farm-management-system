# Farm Management System — Mobile Client Audit Report

**Path:** `C:\Project\farm-management-system\farm-client\mobile`
**Audit Date:** 25/10/2026
**Package:** `@farm/mobile` v1.0.0
**Expo SDK:** ~57 / React Native 0.86.3
**Framework:** Expo Router (file-based routing)

---

## 1. Executive Summary

The mobile client is a **well-structured, modular React Native/Expo application** with clear separation of concerns:

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Routing layer | `app/` | Expo Router file-based pages and layouts |
| Business logic layer | `src/modules/` | Domain-specific feature modules |
| Core infrastructure | `src/core/` | Theme, navigation, UI kit, hooks, utils |
| State layer | `src/store/` | Redux store, RTK Query API, persisted slices |
| Service layer | `src/services/` | HTTP API, offline queue, socket, notifications |
| Shared UI package | `packages/ui-native/` | Internal component library |
| E2E tests | `e2e/` | Detox end-to-end tests |
| Native config | `plugins/`, `app.json` | Native plugin configuration |

Structure quality: **Well-organized** - domain modules map cleanly to business areas, the core layer provides reusable infrastructure, and state management is centralized with RTK + RTK Query.

---

## 2. Root-Level Inventory

### 2.1 Configuration Files

| File | Size | Purpose |
|------|------|---------|
| `package.json` | 3.2 KB | Dependencies, scripts, npm@10.9.3 |
| `package-lock.json` | 507.7 KB | Lockfile |
| `tsconfig.json` | 416 bytes | Strict TS, `@/*` alias to `./src/*` |
| `tsconfig.test.json` | 411 bytes | Test TS config |
| `babel.config.js` | 679 bytes | Babel + React Native Worklets |
| `metro.config.js` | 1.7 KB | Metro bundler, `@/*` alias resolution |
| `app.json` | 1.7 KB | Expo app config, iOS/Android/Web settings, native plugins |
| `eas.json` | 1.9 KB | EAS build profiles (development, preview, production, local variants) |
| `detox.config.js` | 3.3 KB | Detox E2E test configuration |
| `index.js` | 63 bytes | Entry point (delegates to Expo Router via `main`) |
| `.env` | 1.4 KB | Environment variables |
| `.env.example` | 1.5 KB | Example env file |
| `.gitignore` | 385 bytes | Git ignore rules |
| `.nvmrc` | 9 bytes | Node version |

### 2.2 Key EAS Build Profiles

| Profile | Platform | Node | API URL | Build Type |
|---------|----------|------|---------|------------|
| `development` | iOS/Android | 22.18.0 | https://farm-management-system-farm-server-vert.vercel.app/v1 | APK (Android) |
| `preview` | iOS/Android | 22.18.0 | https://farm-management-system-farm-server-vert.vercel.app/v1 | APK |
| `production` | iOS/Android | 22.18.0 | https://farm-management-system-farm-server-vert.vercel.app/v1 | App Bundle (Android) |
| `development-local` | iOS/Android | 22.18.0 | http://localhost:4000/v1 | APK |
| `preview-local` | iOS/Android | 22.18.0 | https://farm-management-system-farm-server-vert.vercel.app/v1 | APK |

### 2.3 Native Plugins

| Plugin | File | Purpose |
|--------|------|---------|
| `expo-router` | Expo core | File-based routing |
| `expo-secure-store` | Expo core | Encrypted token storage |
| `expo-notifications` | Expo core | Push notifications |
| `expo-image-picker` | Expo core | Image selection |
| `./plugins/withCertificatePinning` | `plugins/withCertificatePinning.js` | SSL certificate pinning (custom plugin) |
| `expo-splash-screen` | Expo core | Branded splash screen (#2E7D32 green) |

## 3. Source Directory Tree (`src/`)

```
src/
├── index.ts                          # Core barrel export (ui, hooks, theme)
├── farmTypes.ts                      # Canonical farm type definitions
├── core/
│   ├── index.ts                      # Core barrel (ui, hooks, theme)
│   ├── farmTypes.ts                  # Farm type enum/labels/colors
│   ├── hooks/
│   │   └── index.ts                  # useToasts hook
│   ├── navigation/
│   │   ├── sidebarConfig.ts          # Full nav config + visibility gating logic
│   │   └── SidebarContext.tsx        # Sidebar open/close context
│   ├── theme/
│   │   ├── index.ts                  # Theme barrel
│   │   ├── theme.ts                  # Light/dark color tokens + spacing scale
│   │   └── ThemeContext.tsx          # Persisted theme mode provider
│   ├── ui/
│   │   ├── index.ts                  # UI component barrel
│   │   ├── UIComponents.tsx          # Shared component library
│   │   ├── SelectField.tsx           # Custom select field
│   │   ├── MenuButton.tsx            # Sidebar toggle button
│   │   ├── Sidebar.tsx               # Navigation sidebar drawer
│   │   ├── feedback/
│   │   │   ├── index.ts
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── StateView.tsx
│   │   │   └── ToastHost.tsx
│   │   └── layout/
│   │       ├── ConnectionBanner.tsx  # Network status banner
│   │       └── ConnectionBanner.test.tsx
│   └── utils/
│       ├── index.ts                  # Utils barrel
│       ├── apiError.ts               # API error normalization
│       ├── currency.ts               # Currency formatting helpers
│       ├── entityTransformers.ts     # Server→client data transformation
│       ├── inactivity.ts             # Inactivity/session timeout tracking
│       ├── listPayload.ts            # List response pagination extraction
│       ├── reduxSecureStorage.ts     # Encrypted redux-persist adapter (native)
│       └── secureStorage.ts          # Token storage helpers (access/refresh/MFA/push)
├── modules/                          # Domain feature modules (barrel index per module)
│   ├── aquaculture/
│   │   └── index.ts
│   ├── auth/
│   │   ├── index.ts
│   │   ├── hooks/useAuth.ts
│   │   └── services/authSlice.ts + authSlice.test.ts
│   ├── communication/
│   │   └── index.ts
│   ├── crop/
│   │   └── index.ts
│   ├── farm/
│   │   └── index.ts
│   ├── finance/
│   │   └── index.ts
│   ├── hr/
│   │   └── index.ts
│   ├── inventory/
│   │   └── index.ts
│   ├── livestock/
│   │   └── index.ts
│   ├── notification/
│   │   └── index.ts
│   ├── poultry/
│   │   ├── index.ts
│   │   ├── flockChain.ts
│   │   ├── FlockFormPickers.tsx
│   │   ├── PoultryRecordScreen.tsx
│   │   ├── recordConfigs.ts
│   │   └── __tests__/
│   │       └── poultryFlockDetail.test.tsx
│   ├── reporting/
│   │   └── index.ts
│   ├── roles/
│   │   └── index.ts
│   ├── settings/
│   │   └── index.ts
│   ├── worker/
│   │   └── index.ts
│   └── settings/
│       └── index.ts
├── store/
│   ├── store.ts                      # Redux store + persist config + RTK middleware
│   ├── api.ts                        # RTK Query: farmsApi, cropsApi, livestockApi, financeApi, tasksApi
│   └── slices/
│       ├── uiSlice.ts                # Toasts, filters, pagination, selections
│       ├── uiSlice.test.ts
│       ├── syncSlice.ts              # Offline queue + socket/online state
│       ├── syncSlice.test.ts
│       └── notificationsSlice.ts     # Notification state + push registration
├── __tests__/                        # Screen-level component tests
│   ├── contractsMarketplaceScreens.test.tsx
│   ├── cropHub.test.tsx
│   ├── dashboardScreen.test.tsx
│   ├── equipmentScreen.test.tsx
│   ├── farmsHub.test.tsx
│   ├── financeHub.test.tsx
│   ├── inventoryHub.test.tsx
│   ├── livestockHub.test.tsx
│   ├── notificationsPush.test.ts
│   ├── poultryFlockDetail.test.tsx
│   ├── poultryHousePens.test.tsx
│   ├── poultryHub.test.tsx
│   ├── reportsHub.test.tsx
│   ├── rolesCorrespondenceScreens.test.tsx
│   ├── sidebar.test.tsx
│   ├── usersRolesScreens.test.tsx
│   ├── weatherScreen.test.tsx
│   └── workersScreen.test.tsx
├── scripts/                          # Build, lint, test scripts
├── package.json                      # Root package definition
├── README.md                         # Project documentation
└── .github/                          # GitHub workflows and CI
```
## 3. Source Directory Tree (`src/`)

```
src/
├── index.ts                          # Core barrel export (ui, hooks, theme)
├── farmTypes.ts                      # Canonical farm type definitions
├── core/
│   ├── index.ts                      # Core barrel (ui, hooks, theme)
│   ├── farmTypes.ts                  # Farm type enum/labels/colors
│   ├── hooks/
│   │   └── index.ts                  # useToasts hook
│   ├── navigation/
│   │   ├── sidebarConfig.ts          # Full nav config + visibility gating logic
│   │   └── SidebarContext.tsx        # Sidebar open/close context
│   ├── theme/
│   │   ├── index.ts                  # Theme barrel
│   │   ├── theme.ts                  # Light/dark color tokens + spacing scale
│   │   └── ThemeContext.tsx          # Persisted theme mode provider
│   ├── ui/
│   │   ├── index.ts                  # UI component barrel
│   │   ├── UIComponents.tsx          # Shared component library
│   │   ├── SelectField.tsx           # Custom select field
│   │   ├── MenuButton.tsx            # Sidebar toggle button
│   │   ├── Sidebar.tsx               # Navigation sidebar drawer
│   │   ├── feedback/
│   │   │   ├── index.ts
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── StateView.tsx
│   │   │   └── ToastHost.tsx
│   │   └── layout/
│   │       ├── ConnectionBanner.tsx  # Network status banner
│   │       └── ConnectionBanner.test.tsx
│   └── utils/
│       ├── index.ts                  # Utils barrel
│       ├── apiError.ts               # API error normalization
│       ├── currency.ts               # Currency formatting helpers
│       ├── entityTransformers.ts     # Server→client data transformation
│       ├── inactivity.ts             # Inactivity/session timeout tracking
│       ├── listPayload.ts            # List response pagination extraction
│       ├── reduxSecureStorage.ts     # Encrypted redux-persist adapter (native)
│       └── secureStorage.ts          # Token storage helpers (access/refresh/MFA/push)
├── modules/
│   ├── aquaculture/index.ts
│   ├── auth/index.ts
│   ├── auth/hooks/useAuth.ts
│   ├── auth/services/authSlice.ts + authSlice.test.ts
│   ├── communication/index.ts
│   ├── crop/index.ts
│   ├── farm/index.ts
│   ├── finance/index.ts
│   ├── hr/index.ts
│   ├── inventory/index.ts
│   ├── livestock/index.ts
│   ├── notification/index.ts
│   ├── poultry/index.ts
│   ├── poultry/flockChain.ts
│   ├── poultry/FlockFormPickers.tsx
│   ├── poultry/PoultryRecordScreen.tsx
│   ├── poultry/recordConfigs.ts
│   ├── poultry/__tests__/poultryFlockDetail.test.tsx
│   ├── reporting/index.ts
│   ├── settings/index.ts
│   ├── worker/index.ts
├── store/
│   ├── store.ts                      # Redux store + persist config + RTK middleware
│   ├── api.ts                        # RTK Query: farmsApi, cropsApi, livestockApi, financeApi, tasksApi
│   └── slices/
│       ├── uiSlice.ts                # Toasts, filters, pagination, selections
│       ├── uiSlice.test.ts
│       ├── syncSlice.ts              # Offline queue + socket/online state
│       ├── syncSlice.test.ts
│       └── notificationsSlice.ts     # Notification state + push registration
├── __tests__/                        # Screen-level component tests
│   ├── contractsMarketplaceScreens.test.tsx
│   ├── cropHub.test.tsx
│   ├── dashboardScreen.test.tsx
│   ├── equipmentScreen.test.tsx
│   ├── farmsHub.test.tsx
│   ├── financeHub.test.tsx
│   ├── inventoryHub.test.tsx
│   ├── livestockHub.test.tsx
│   ├── notificationsPush.test.ts
│   ├── poultryFlockDetail.test.tsx
│   ├── poultryHousePens.test.tsx
│   ├── poultryHub.test.tsx
│   ├── poultryRecordConfigs.test.ts
│   ├── poultryScreen.test.tsx
│   ├── reportsHub.test.tsx
│   ├── rosterCorrespondenceScreens.test.tsx
│   ├── sidebar.test.tsx
│   ├── usersRolesScreens.test.tsx
│   ├── weatherScreen.test.tsx
│   └── workersScreen.test.tsx
└── assets/
    ├── icon.png
    ├── adaptive-icon.png
    ├── splash.png
    └── favicon.png
```

## 4. App Layer (`app/`) — Expo Router Routes

```
app/
├── _layout.tsx                       # Root layout provider wrapper
├── (auth)/                           # Public auth routes
│   ├── _layout.tsx
│   ├── login.tsx
│   └── register.tsx
└── (app)/                            # Authenticated app routes
    ├── index.tsx                     # Dashboard hub
    ├── leave.tsx
    ├── messages.tsx
    ├── notifications.tsx
    ├── settings.tsx
    └── [domain-specific routes]/
        ├── aquaculture/
        ├── attendance/
        ├── contracts/
        ├── correspondence/
        ├── crops/
        ├── equipment/
        ├── farms/
        ├── finance/
        ├── inventory/
        ├── livestock/
        ├── marketplace/
        ├── poultry/
        ├── reports/
        ├── roles/
        ├── roster/
        ├── settings/
        ├── tasks/[id]/edit.tsx
        ├── tasks/[id]/index.tsx
        ├── users/index.tsx
        ├── users/[id]/index.tsx
        ├── weather.tsx
        └── workers/[id]/edit.tsx
        └── workers/[id]/index.tsx
        └── workers/index.tsx
```

### Route Groups

| Group | Screens | Purpose |
|-------|---------|---------|
| `(auth)` | Login, Register | Public authentication |
| `(app)` | 20+ screens | Authenticated farm management features |

## 5. Assets Directory

| File | Size | Purpose |
|------|------|---------|
| `icon.png` | 2.2 KB | App icon |
| `adaptive-icon.png` | 2.2 KB | Android adaptive icon |
| `splash.png` | 342 bytes | Splash screen |
| `favicon.png` | 156 bytes | Web favicon |

## 6. State Management Architecture

### 6.1 Redux Store Slices

| Slice | Persistence | Storage | Key State |
|-------|-------------|---------|-----------|
| `auth` | Yes (encrypted) | `expo-secure-store` | User, tokens, permissions, MFA |
| `ui` | Yes | AsyncStorage | Selected farm/crop/livestock IDs, filters, pagination, toasts |
| `sync` | Yes | AsyncStorage | Offline queue, socket status, online status |
| `notifications` | No (runtime only) | In-memory | Notification items, unread count, push status |
| `farmsApi`, `cropsApi`, `livestockApi`, `financeApi`, `tasksApi` | RTK Query cache | In-memory | Server data via RTK Query |

### 6.2 RTK Query Endpoints

| API | Endpoints |
|-----|-----------|
| `farmsApi` | listFarms, getFarm, createFarm, updateFarm, deleteFarm |
| `cropsApi` | listCrops, getCrop, createCrop, updateCrop, deleteCrop |
| `livestockApi` | listLivestock, getLivestock, createLivestock, updateLivestock, deleteLivestock |
| `financeApi` | listExpenses, listSales, createExpense, createSale |
| `tasksApi` | listTasks, getTask, createTask, updateTask, updateTaskStatus, deleteTask |

**Note:** A custom `baseQuery` wrapper unwraps the `{ success, data }` envelope that the server wraps all responses in. Without this, screens would receive `undefined` rows.

### 6.3 Sync / Offline Support

The `syncSlice` maintains an `offlineQueue` of `OfflineOperation` objects (method, endpoint, data, module, clientVersion, serverVersion, retryCount) — enabling optimistic updates and deferred synchronization when connectivity is restored.

## 7. Services Layer (`src/services/`)

| File | Size | Purpose |
|------|------|---------|
| `api.ts` | 48.5 KB | Axios HTTP client with auth interceptors |
| `offlineApi.ts` | 8.9 KB | Offline-capable API wrapper |
| `notifications.ts` | 15.1 KB | Push notification service |
| `types.ts` | 25.2 KB | Shared TypeScript types |
| `reconcileQueue.ts` | 3 KB | Offline queue reconciliation logic |
| `socketService.ts` | 5.9 KB | Socket.io realtime client |
| `socketService.test.ts` | 2 KB | Socket tests |
| `useNetworkSync.ts` | 2.9 KB | Network sync hook |
| `useNetworkSync.test.ts` | 2.7 KB | Network sync tests |

## 8. Shared UI Package (`packages/ui-native/`)

A separate internal component library with its own `package.json`:

| Component | Size |
|-----------|------|
| `Badge.tsx` | 1.2 KB |
| `Button.tsx` | 2.3 KB |
| `Card.tsx` | 1.6 KB |
| `EmptyState.tsx` | 1.2 KB |
| `LoadingSpinner.tsx` | 609 bytes |
| `Modal.tsx` | 2.2 KB |
| `Select.tsx` | 2.2 KB |
| `TextInput.tsx` | 1.8 KB |

Plus `tokens.ts` (design tokens) and barrel exports.

## 9. Testing Strategy

| Test Type | Location | Framework | Count |
|-----------|----------|-----------|-------|
| Unit tests | `src/store/slices/*.test.ts`, `src/core/utils/*.test.ts`, `src/modules/poultry/__tests__/` | Jest | ~10 files |
| Component tests | `src/__tests__/*.test.tsx` | @testing-library/react-native | 18 files |
| UI component tests | `src/core/ui/UIComponents.test.tsx`, `ConnectionBanner.test.tsx` | Jest + Testing Library | 2 files |
| E2E tests | `e2e/` | Detox | `login.test.ts` + jest config |

Test scripts:
- `npm test` — run all Jest tests
- `npm run test:component` — component tests only
- `npm run test:e2e:build:android/ios` — build Detox app
- `npm run test:e2e:android/ios` — run Detox tests

## 10. Core Architecture Patterns

### 10.1 Permission System (`usePermission` hook)
- Matches granted permissions against required ones
- Supports wildcard `*` and domain wildcard `domain.*` patterns
- Methods: `hasPermission`, `hasAnyPermission`, `canCreate`, `canRead`, `canUpdate`, `canDelete`, `canApprove`, `isReadOnly`

### 10.2 Navigation Gating (`sidebarConfig.ts`)
- Sidebar sections: Overview, Access, Farming, Assets, People, Money, Insights, System
- Each item has: label, emoji icon, route, permissions (ANY-of semantics), module (plan-gating)
- Visibility function `isSidebarItemVisible()` enforces both plan-module and permission gates
- Mirrors the admin portal sidebar exactly (23 items across 8 sections)

### 10.3 Theme System
- Light/Dark/System modes, persisted to AsyncStorage
- Full color token palette (primary, success, error, warning, borders, inputs, headers, tabs, etc.)
- Spacing scale: xs=4 → xxl=48

### 10.4 Security Features
- Certificate pinning via custom Expo plugin
- `expo-secure-store` for auth tokens (encrypted at rest on native)
- `reduxSecureStorage` adapter for redux-persist auth slice
- Push token opt-out persistence
- Inactivity/session timeout tracking

### 10.5 Farm Types (single source of truth)
`FARM_TYPES = ['CROP', 'LIVESTOCK', 'POULTRY', 'DAIRY', 'AQUACULTURE']` — kept in lockstep with the server's database features module and admin app.

## 11. Strengths Observed

1. **Clean domain modularity** — Each farm domain (crops, livestock, poultry, finance, workers) has its own module directory
2. **Centralized state** — Redux Toolkit + RTK Query with consistent patterns
3. **Security-first** — Certificate pinning, encrypted storage, MFA session handling
4. **Offline-ready** — Sync queue with offline operation tracking
5. **Type-safe** — Strict TypeScript with path aliases (`@/*`)
6. **Well-tested** — 18+ screen/component test files + slice/unit tests + Detox E2E
7. **Consistent theming** — Full light/dark design system with persistence
8. **Feature parity documentation** — Sidebar comments explicitly reference admin portal equivalence

## 12. Potential Observations / Areas to Review

| Area | Observation |
|------|-------------|
| `src/modules/` barrels | Most modules export only `index.ts` (barrel files). Logic appears to live in `app/` screens rather than domain modules — consider whether domain logic should be pushed down into `src/modules/` services/hooks |
| `services/api.ts` (48.5 KB) | Large monolithic API file — consider splitting by domain |
| E2E coverage | Only `login.test.ts` exists in `e2e/` — consider expanding critical path coverage |
| `detox.config.js` | References `ios/` and `android/` directories not present in listing — native directories may be generated by EAS prebuild |
| No `android/` or `ios/` in root | Native code is generated via Expo prebuild; ensure `eas build --local` or `npx expo prebuild` is part of CI |

## 13. Quick Reference: Common Commands

```bash
# From C:\Project\farm-management-system\farm-client\mobile

npm start                  # Start Expo dev server (port 8082)
npm run android            # Run on Android
npm run ios                # Run on iOS
npm run web                # Run on web
npm test                   # Run Jest tests
npm run typecheck          # TypeScript check
npm run build:android      # EAS Android preview build
npm run build:ios          # EAS iOS preview build
```

---

**Audit Conclusion:** The mobile client is **well-structured** with a professional layered architecture, clear separation between routing, domain modules, core infrastructure, and state management. It follows React Native/Expo best practices and shows strong attention to security, offline support, and testability.
