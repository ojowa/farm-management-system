# Executive Summary

## Farm Management System (FMS)

**Document Classification:** Internal — Confidential
**Version:** 1.0 | **Date:** July 2026
**Prepared for:** Project Stakeholders, Technical Leadership

---

## 1. Project Vision

The Farm Management System is a cloud-native, multi-tenant SaaS platform that
digitises and centralises the full lifecycle of farm operations — from planting
to harvest, from livestock birth to market, and from seed inventory to financial
settlement — across crops, livestock, poultry, finance, workforce, and equipment
management.

The platform serves four distinct user tiers through purpose-built interfaces,
backed by a scalable microservices architecture sharing a single PostgreSQL database
with tenant-level data isolation.

---

## 2. Problem Statement

Agricultural operations across Africa and emerging markets face compounding
challenges:

- **Fragmented record-keeping** — Farm data lives in paper notebooks, spreadsheets,
  and WhatsApp messages, creating data silos and loss risk.
- **Limited visibility** — Farm owners and managers lack real-time insight into
  crop health, livestock performance, worker productivity, and financial position.
- **No scale path** — Existing tools are either too complex (enterprise ERP) or
  too simple (single-purpose apps), leaving mid-scale farms underserved.
- **Compliance gaps** — Traceability requirements for export markets (GlobalGAP,
  ISO 22000) demand digital audit trails that most farms cannot produce.
- **Financial opacity** — Without integrated profit/loss tracking per crop cycle
  or livestock batch, farms cannot make data-driven investment decisions.

---

## 3. Proposed Solution

FMS addresses these challenges through a **single platform** comprising:

| Interface | Audience | Purpose |
|-----------|----------|---------|
| **Web App** | Workers / field staff | Daily data capture (attendance, observations, tasks) |
| **Admin App** | Farm owners / managers | Full CRUD, dashboards, analytics, crop calendar, breeding records |
| **Console App** | Platform administrators | User/org management, feature flags, subscription billing, health monitoring |
| **Mobile App** | Field workers (offline-capable) | GPS-tagged data capture, offline sync, push notifications |

### Core Capabilities

| Domain | Capabilities |
|--------|-------------|
| **Farm Management** | Farm profiles, field mapping, inventory tracking, geolocation |
| **Crop Management** | Crop cycles, stage tracking, irrigation scheduling, pest/disease logs, yield records |
| **Livestock Management** | Individual animal records, health records, breeding, vaccination, weight tracking |
| **Poultry Management** | Flock batch tracking, mortality logs, feeding records, vaccination schedules |
| **Finance** | Expense tracking, sales recording, budgeting, contract management, marketplace listings |
| **HR & Workforce** | Worker profiles, task assignment, attendance (clock-in/out), leave management, shift scheduling |
| **Reporting** | Automated reports, scheduled delivery, profitability analysis |
| **Notifications** | Real-time push, email delivery, in-app alerts, WebSocket events |

---

## 4. Key Differentiators

1. **Multi-tenancy by design** — Every data query is scoped to `organizationId`,
   enabling one deployment to serve unlimited farm organisations.
2. **Domain-driven architecture** — 10 bounded contexts with clear separation of
   concerns, enabling independent scaling and feature evolution.
3. **Offline-first mobile** — SyncQueue model enables data capture without
   connectivity, syncing when network returns.
4. **Platform administration** — Built-in SaaS infrastructure (feature flags,
   subscription plans, audit logs, broadcast announcements) reduces operational
   overhead.
5. **42 data models** covering every farm operation, with role-based access
   (8 roles, 60+ permissions) ensuring least-privilege access.

---

## 5. Technical Summary

| Aspect | Detail |
|--------|--------|
| **Architecture** | Microservices (13 NestJS services) + API Gateway |
| **Frontend** | Next.js 15 (Web/Admin/Console), Expo SDK 54 (Mobile) |
| **Database** | PostgreSQL 16 + Prisma ORM + PgBouncer connection pooling |
| **Auth** | JWT (access/refresh tokens), httpOnly cookies (browser), Bearer (mobile), MFA/TOTP |
| **Real-time** | Socket.IO (WebSocket events) |
| **Deployment** | Render.com (production), Docker Compose (development) |
| **Monorepo** | Turborepo + pnpm workspaces (23+ packages) |
| **Testing** | Vitest (admin/web), Jest (services/mobile) — 67 mobile tests passing |

---

## 6. Current Status

| Milestone | Status |
|-----------|--------|
| Core microservices (13 services) | ✅ Complete |
| DDD refactoring (6 phases) | ✅ Complete |
| Admin app (44 pages) | ✅ Complete |
| Web app | ✅ Complete |
| Console app | ✅ Complete (30 known issues in progress) |
| Mobile app (Expo) | 🟡 90% complete (67 tests passing) |
| Security hardening (12 fixes) | ✅ 11/12 applied (CSRF pending) |
| Deployment (Render.com) | ✅ Live (16 services) |
| CI/CD pipeline | 🟡 Partially active (admin CI live) |

---

## 7. Impact & Outcomes

### Quantitative
- **13 microservices** handling distinct business domains
- **42 database models** covering full farm operations
- **120+ API endpoints** accessible through a single gateway
- **4 frontend interfaces** serving 4 distinct user tiers
- **60+ granular permissions** enforcing least-privilege access

### Qualitative
- **Single source of truth** for all farm data across crops, livestock, finance, and workforce
- **Real-time visibility** into farm operations from any device, anywhere
- **Audit-ready** with every mutation logged with actor, timestamp, and before/after values
- **Subscription-ready** with built-in plan management, feature gating, and billing hooks

---

## 8. Next Steps

1. Complete mobile app EAS build and app store submission
2. Implement CSRF protection (last remaining high-severity security item)
3. Close 30 console app API route mismatches
4. Complete CI/CD pipelines for all services
5. Deploy production monitoring (Prometheus, Grafana, Sentry)
6. Launch pilot with 3–5 farm organisations

---

*For detailed architecture, see [System Architecture](./03-SYSTEM-ARCHITECTURE.md).
For technical decisions, see [Technology Stack](./04-TECHNOLOGY-STACK.md).
For the full build plan, see [Implementation Roadmap](./07-IMPLEMENTATION-ROADMAP.md).*
