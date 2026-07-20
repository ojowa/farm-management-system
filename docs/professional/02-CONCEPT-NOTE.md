# Concept Note

## Farm Management System (FMS)

**Document Classification:** Internal — Confidential
**Version:** 1.0 | **Date:** July 2026
**Prepared for:** Project Stakeholders, Technical Leadership

---

## 1. Background & Context

Agriculture is the backbone of economies across Sub-Saharan Africa, employing
over 60% of the workforce. Yet the sector suffers from a critical technology
gap: most farm operations still rely on manual, paper-based record-keeping.

This gap creates cascading problems:

- **Data loss** — Paper records are damaged, lost, or illegible within months.
- **No traceability** — Export markets (EU, US) increasingly demand farm-to-fork
  traceability under regulations like the EU Farm to Fork Strategy.
- **Financial opacity** — Without digitised financial records, farms cannot
  demonstrate creditworthiness to lenders, missing an estimated $65 billion
  annual credit gap in African agriculture.
- **Operational inefficiency** — Manual scheduling of planting, irrigation,
  and harvesting leads to suboptimal resource allocation.
- **Regulatory non-compliance** — National agricultural authorities (e.g.,
  Nigeria's NAQS, Kenya's KEPHIS) increasingly require digital reporting.

### Existing Solutions

| Solution | Limitation |
|----------|-----------|
| Paper notebooks | No search, no analytics, data loss |
| Spreadsheets (Excel) | Single-user, no audit trail, no mobile access |
| Enterprise ERP (SAP, Oracle) | Too expensive ($50k+), too complex for farm operations |
| Single-purpose apps | Crop-only or livestock-only, no integrated finance/HR |
| WhatsApp groups | Unstructured, no reporting, no compliance |

**None of these provide an integrated, multi-tenant, offline-capable farm
management platform with role-based access and financial tracking.**

---

## 2. Problem Statement

Farm operators need a **single, integrated platform** that:

1. Records and tracks all farm activities (crops, livestock, poultry) in real time.
2. Provides financial visibility (expenses, sales, profitability) per crop cycle
   or livestock batch.
3. Manages workforce (attendance, tasks, leave, shifts) with audit trails.
4. Works offline on mobile devices in areas with limited connectivity.
5. Scales from a single smallholder farm to a multi-farm enterprise.
6. Supports multiple user roles with appropriate access controls.
7. Generates automated reports for compliance and decision-making.

---

## 3. Proposed Solution

### 3.1 System Overview

The Farm Management System is a **cloud-native, multi-tenant SaaS platform** built
on a microservices architecture. It provides four purpose-built interfaces:

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interfaces                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Web    │  │  Admin   │  │ Console  │  │  Mobile  │   │
│  │  :3001   │  │  :3000   │  │  :3004   │  │  :8082   │   │
│  │ Workers  │  │ Managers │  │ Platform │  │  Field   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │         │
│       └──────────────┴──────┬───────┴──────────────┘        │
│                             │                               │
│                     ┌───────┴───────┐                       │
│                     │  API Gateway  │                       │
│                     │    :4000      │                       │
│                     │  JWT + Proxy  │                       │
│                     └───────┬───────┘                       │
│                             │                               │
│              ┌──────────────┼──────────────┐                │
│              │              │              │                │
│       ┌──────┴──────┐ ┌────┴─────┐ ┌──────┴──────┐        │
│       │ Auth :4001  │ │Farm :4002│ │Finance:4006 │        │
│       │ (Identity)  │ │(Crops+   │ │(Expenses,   │        │
│       │             │ │Livestock)│ │Sales,Budget)│        │
│       └──────┬──────┘ └────┬─────┘ └──────┬──────┘        │
│              │              │              │                │
│       ┌──────┴──────┐ ┌────┴─────┐ ┌──────┴──────┐        │
│       │Platform:4020│ │HR :4012  │ │Notify:4005  │        │
│       │(Admin console)│(Workers, │ │(Push,Email, │        │
│       │             │ │Attendance│ │Real-time)   │        │
│       └─────────────┘ └──────────┘ └─────────────┘        │
│              │              │              │                │
│              └──────────────┼──────────────┘                │
│                             │                               │
│                     ┌───────┴───────┐                       │
│                     │  PostgreSQL   │                       │
│                     │    :5432      │                       │
│                     │  42 models    │                       │
│                     └───────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Core Solution Features

| Feature | Description | Business Value |
|---------|-------------|---------------|
| **Farm Profiles** | Create, manage, and track multiple farms with geolocation | Centralised farm inventory |
| **Crop Cycles** | Full lifecycle: planting → growing → harvest → post-harvest | Optimised planting decisions |
| **Livestock Tracking** | Individual animal records, health, breeding, weight | Improved herd management |
| **Poultry Management** | Batch tracking, mortality logs, feeding, vaccination | Reduced mortality losses |
| **Financial Management** | Expenses, sales, budgets, contracts, marketplace | Profitability per crop/batch |
| **Workforce Management** | Workers, tasks, attendance, leave, shifts | Productivity accountability |
| **Real-time Alerts** | Push notifications, WebSocket events, email | Proactive decision-making |
| **Offline Sync** | Data capture without connectivity, sync on reconnection | Field-ready reliability |
| **Multi-tenancy** | Organisation-scoped data isolation | One platform, many farms |
| **Platform Admin** | Feature flags, subscriptions, audit logs, health checks | SaaS operational readiness |

---

## 4. Target Users & Personas

### 4.1 Primary Users

| Persona | Role | Interface | Key Needs |
|---------|------|-----------|-----------|
| **Kemi** — Farm Worker | Field data capture | Mobile / Web | Simple forms, offline support, task tracking |
| **Ade** — Farm Manager | Day-to-day operations | Admin App | Dashboard, crop calendar, worker oversight, inventory |
| **Bola** — Farm Owner | Strategic decisions | Admin App | Financial reports, profitability, contract management |
| **Chidi** — Platform Admin | System operations | Console | User management, feature flags, health monitoring |

### 4.2 Secondary Users

| Persona | Role | Needs |
|---------|------|-------|
| **Accountant** | Financial oversight | Budget tracking, expense reports, contract values |
| **Veterinarian** | Livestock health | Health records, vaccination schedules, treatment logs |
| **Supervisor** | Team management | Attendance, shift assignments, task completion |
| **Investor/Donor** | Accountability | Audit logs, financial reports, farm performance metrics |

---

## 5. Scope

### 5.1 In Scope (Phase 1 — Current)

- Multi-tenant SaaS platform with 13 backend microservices
- 42 database models covering 10 bounded contexts
- 4 frontend interfaces (Web, Admin, Console, Mobile)
- JWT-based authentication with httpOnly cookies + MFA/TOTP
- Role-based access control (8 roles, 60+ permissions)
- Real-time WebSocket events (Socket.IO)
- Push notifications (Firebase)
- Platform administration (feature flags, subscriptions, audit logs)
- Mobile offline sync (SyncQueue)
- Docker Compose local development
- Render.com production deployment

### 5.2 Out of Scope (Future Phases)

- Weather API integration (Phase 3)
- SMS notification delivery (Phase 3)
- GPS field mapping (Phase 4)
- IoT sensor integration (Phase 4)
- AI/ML crop yield prediction (Phase 4)
- Accounting software integration (Phase 4)
- Biometric authentication (Phase 5)

---

## 6. Key Differentiators

| # | Differentiator | Description |
|---|---------------|-------------|
| 1 | **Multi-tenant by design** | Every query scoped to `organizationId`; one deployment serves unlimited farm organisations |
| 2 | **Domain-driven architecture** | 10 bounded contexts with clear ownership, enabling independent scaling |
| 3 | **Offline-first mobile** | SyncQueue model captures data without connectivity, syncing automatically |
| 4 | **Integrated finance** | Profitability tracking per crop cycle and livestock batch |
| 5 | **Platform SaaS layer** | Built-in feature flags, subscription plans, audit logs reduce operational overhead |
| 6 | **Four interfaces, one backend** | Web, Admin, Console, and Mobile share the same microservices — no duplication |
| 7 | **60+ granular permissions** | Fine-grained RBAC from SUPER_ADMIN down to individual field workers |

---

## 7. Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Platform uptime | ≥ 99.5% | Uptime monitoring |
| API response time (p95) | < 500ms | Prometheus metrics |
| Mobile offline sync reliability | 100% | SyncQueue completion rate |
| User onboarding time | < 15 minutes | Time to first farm created |
| Data completeness | ≥ 90% of fields populated | Monthly audit |
| Security audit pass rate | ≥ 95% | Quarterly security review |

---

## 8. Technology Approach

The system is built on a proven, modern stack:

- **Backend:** NestJS 11 (TypeScript) — 13 microservices
- **Frontend:** Next.js 15 (React 19, TailwindCSS 4) — 3 web apps
- **Mobile:** Expo SDK 54 (React Native 0.81.5) — iOS + Android
- **Database:** PostgreSQL 16 + Prisma ORM + PgBouncer
- **Auth:** JWT + bcryptjs + TOTP MFA
- **Real-time:** Socket.IO (WebSocket)
- **Deployment:** Render.com (production), Docker Compose (development)

See [Technology Stack & Justification](./04-TECHNOLOGY-STACK.md) for full rationale.

---

## 9. Expected Impact

### Short-term (0–6 months)
- 5–10 pilot farm organisations onboarded
- 50+ active users across all interfaces
- Paper-based records eliminated for pilot farms
- Monthly financial reports generated automatically

### Medium-term (6–18 months)
- 50+ farm organisations on platform
- Integration with weather data services
- Mobile app on App Store / Google Play
- Compliance-ready audit trails for export markets

### Long-term (18–36 months)
- 500+ farm organisations
- AI-powered crop yield prediction
- IoT sensor integration for precision agriculture
- Multi-language support (Hausa, Yoruba, Swahili, French)

---

## 10. Budget Considerations

| Category | Estimated Cost (Annual) |
|----------|----------------------|
| Cloud infrastructure (Render.com) | $2,400 – $6,000 |
| Database (Neon PostgreSQL) | $600 – $2,400 |
| Domain & SSL | $50 |
| Firebase (push notifications) | Free tier → $25 |
| Monitoring (Sentry, Grafana) | Free tier → $50 |
| EAS Build (mobile) | $0 – $99/month |
| **Total estimated** | **$3,050 – $8,600/year** |

---

*For the full technical architecture, see [System Architecture](./03-SYSTEM-ARCHITECTURE.md).
For the build plan, see [Implementation Roadmap](./07-IMPLEMENTATION-ROADMAP.md).*
