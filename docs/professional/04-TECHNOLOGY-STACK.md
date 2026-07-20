# Technology Stack & Justification

**Document Classification:** Internal — Confidential
**Version:** 1.0 | **Date:** July 2026

---

## 1. Stack Overview

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Monorepo** | Turborepo + pnpm | pnpm 10.27.0 | Workspace management, build orchestration |
| **Backend Framework** | NestJS | 11.x | 13 microservices with DI, guards, interceptors |
| **Web Frontend** | Next.js | 15.1.7 | Admin, Web, Console apps (React 19) |
| **CSS** | TailwindCSS | 4.x | Utility-first styling |
| **Mobile** | Expo SDK | 54 | React Native 0.81.5, iOS + Android |
| **State (Mobile)** | Redux Toolkit | Latest | Offline-capable state management |
| **Database** | PostgreSQL | 16 | Relational data store, 42 models |
| **ORM** | Prisma | 6.4.1 | Type-safe database access |
| **Connection Pool** | PgBouncer | 1.23.1 | Transaction-mode pooling, 200 max clients |
| **Auth** | JWT + bcryptjs | jsonwebtoken 9.x | Token-based authentication |
| **MFA** | TOTP (otplib) | 13.4.x | Time-based one-time passwords |
| **Validation** | Zod + class-validator | — | Schema + DTO validation |
| **Real-time** | Socket.IO | — | WebSocket events |
| **Push Notifications** | Firebase Admin SDK | 12.7.x | Expo push token delivery |
| **Email** | Nodemailer | — | SMTP email delivery |
| **HTTP Client** | Axios | 1.18.x | API client library |
| **Testing** | Vitest + Jest | — | Unit/integration tests |
| **Deployment** | Render.com | — | Cloud hosting (16 services) |
| **CI/CD** | GitHub Actions | — | Automated build/test/deploy |
| **Monitoring** | Prometheus + Grafana | — | Metrics dashboards |
| **Logging** | Loki + Sentry | — | Log aggregation + error tracking |
| **Cache** | Redis | — | Session cache, rate limiting |

---

## 2. Selection Rationale

### 2.1 Backend: NestJS

**Why NestJS over Express/Fastify/Hapi?**

| Factor | NestJS | Express | Fastify |
|--------|--------|---------|---------|
| Module system | ✅ Built-in | ❌ Manual | ⚠️ Plugin-based |
| Dependency injection | ✅ Native | ❌ None | ❌ None |
| TypeScript support | ✅ First-class | ⚠️ Add-on | ✅ Good |
| Guards & Interceptors | ✅ Native | ❌ Middleware only | ⚠️ Hooks |
| Microservices support | ✅ Built-in | ❌ Manual | ❌ Manual |
| Learning curve | Moderate | Easy | Easy |
| Community | Growing fast | Mature | Growing |

**Decision:** NestJS provides the structure, DI, and microservices patterns that
a 13-service architecture requires without building custom infrastructure.

### 2.2 Frontend: Next.js

**Why Next.js over Vite/CRA/Remix?**

| Factor | Next.js | Vite + React | Remix |
|--------|---------|-------------|-------|
| Server-side rendering | ✅ Native | ❌ Client only | ✅ Native |
| API routes (rewrites) | ✅ Built-in proxy | ❌ Need backend | ✅ Built-in |
| App Router | ✅ Latest (v15) | N/A | ✅ File-based |
| React 19 support | ✅ | ✅ | ✅ |
| Deployment | ✅ Vercel/Render | ✅ Static | ✅ Vercel |
| Middleware | ✅ Server-side | ❌ | ✅ |

**Decision:** Next.js rewrites proxy `/auth/*` and `/api/*` to the gateway,
eliminating CORS issues in development. App Router provides clean layout nesting.

### 2.3 Database: PostgreSQL

**Why PostgreSQL over MySQL/MongoDB?**

| Factor | PostgreSQL | MySQL | MongoDB |
|--------|-----------|-------|---------|
| JSON support | ✅ JSONB | ⚠️ Limited | ✅ Native |
| ACID transactions | ✅ | ✅ | ⚠️ Multi-document |
| Full-text search | ✅ Built-in | ⚠️ Basic | ✅ Atlas Search |
| Row-level security | ✅ Native | ❌ | ❌ |
| Complex queries | ✅ Excellent | ✅ Good | ⚠️ Aggregation |
| Prisma support | ✅ First-class | ✅ Good | ✅ Good |
| Geospatial | ✅ PostGIS | ⚠️ Basic | ✅ GeoJSON |

**Decision:** PostgreSQL's RLS, JSONB, and PostGIS capabilities align perfectly
with multi-tenancy, flexible schemas, and geolocation features.

### 2.4 ORM: Prisma

**Why Prisma over TypeORM/Sequelize/Drizzle?**

| Factor | Prisma | TypeORM | Sequelize | Drizzle |
|--------|--------|---------|-----------|---------|
| Type safety | ✅ Full | ⚠️ Partial | ⚠️ Partial | ✅ Full |
| Migration system | ✅ Excellent | ⚠️ Manual | ⚠️ Manual | ✅ Good |
| Client generation | ✅ Auto | ❌ Manual | ❌ Manual | ❌ Manual |
| Query performance | ✅ Good | ✅ Good | ✅ Good | ✅ Excellent |
| Learning curve | Easy | Moderate | Moderate | Hard |
| Ecosystem | Growing | Mature | Mature | New |

**Decision:** Prisma's auto-generated client and type safety dramatically
reduce runtime errors. The schema-first approach aligns with DDD's focus on
domain modeling.

### 2.5 Monorepo: Turborepo + pnpm

**Why Turborepo over Nx/Lerna/Rush?**

| Factor | Turborepo | Nx | Lerna | Rush |
|--------|-----------|-----|-------|------|
| Setup complexity | ✅ Minimal | ⚠️ Moderate | ⚠️ Moderate | ❌ High |
| Build caching | ✅ Native | ✅ Native | ❌ | ✅ |
| pnpm workspace support | ✅ Native | ✅ | ⚠️ | ✅ |
| Docker support | ✅ | ✅ | ❌ | ✅ |
| Bundle size | ✅ Small | ⚠️ Large | ✅ Small | ⚠️ Large |

**Decision:** Turborepo + pnpm provides the simplest, fastest monorepo setup
with native caching and workspace support.

---

## 3. Version Matrix

| Package | Version | Notes |
|---------|---------|-------|
| Node.js | 24.13.1 | LTS |
| TypeScript | 5.8.3 | Strict mode enabled |
| NestJS | 11.1.27 | Latest 11.x |
| Next.js | 15.1.7 | App Router |
| React | 19.x | Latest |
| Expo SDK | 54 | Latest stable |
| React Native | 0.81.5 | Latest |
| Prisma | 6.19.3 | Client |
| PostgreSQL | 16 | Docker image |
| PgBouncer | 1.23.1 | Connection pooling |
| pnpm | 10.27.0 | Package manager |

---

## 4. Package Dependencies (Key)

### Backend Services
- `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express` — NestJS framework
- `@nestjs/jwt`, `@nestjs/passport` — Authentication
- `@nestjs/config` — Environment configuration
- `@nestjs/throttler` — Rate limiting
- `@nestjs/websockets`, `@nestjs/platform-socket.io` — WebSocket support
- `@nestjs/swagger` — API documentation
- `@nestjs/axios` — HTTP client for proxy
- `@prisma/client` — Database ORM
- `jsonwebtoken` — JWT signing/verification
- `bcryptjs` — Password hashing
- `otplib` — TOTP MFA
- `zod` — Schema validation
- `class-validator`, `class-transformer` — DTO validation
- `cookie-parser` — Cookie parsing
- `helmet` — Security headers
- `socket.io` — WebSocket server

### Frontend (Web/Admin/Console)
- `next` — React framework
- `react`, `react-dom` — UI library
- `@tanstack/react-query` — Server state management
- `tailwindcss` — Utility CSS
- `axios` — HTTP client
- `recharts` — Charts and dashboards
- `socket.io-client` — Real-time events

### Mobile
- `expo` — React Native framework
- `react-native` — Mobile UI
- `@reduxjs/toolkit` — State management
- `expo-router` — Navigation
- `@react-native-async-storage/async-storage` — Local storage
- `socket.io-client` — Real-time events
- `expo-notifications` — Push notifications
- `expo-location` — GPS services

---

*For the full architecture, see [System Architecture](./03-SYSTEM-ARCHITECTURE.md).
For data models, see [Data Management](./05-DATA-MANAGEMENT.md).*
