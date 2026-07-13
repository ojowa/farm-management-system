# Farm Management System

A multi-tenant SaaS platform for managing farm operations — crops, livestock, poultry, finance, HR, and equipment — built with NestJS microservices, Next.js web apps, and Expo mobile.

---

## Features

- **Authentication** — JWT, httpOnly cookies, 2FA/TOTP, RBAC (60+ permissions)
- **Multi-Tenancy** — Organization-scoped data isolation, subscription plans, feature flags
- **Farm Management** — Multiple farm types, geolocation, field management
- **Crop Lifecycle** — Crop cycles, growth stages, irrigation, pest/disease tracking, yield records
- **Poultry** — Flock tracking, houses/pens, feeding, vaccination, mortality, medications
- **Livestock** — Individual animal tracking, health records, breeding, weight tracking
- **Finance** — Expenses, sales, budgets, contracts, marketplace
- **HR** — Workers, tasks, attendance, leave, duty rosters, internal messaging
- **Notifications** — Push (Firebase), email (Nodemailer), WebSocket real-time
- **Equipment** — Equipment inventory, maintenance records
- **Documents** — File uploads linked to entities
- **Platform Admin** — Health monitoring, broadcasts, feature flags, subscription management
- **Offline Sync** — SyncQueue for mobile offline data synchronization

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm 10.27.0 |
| Backend | NestJS 11 (13 microservices) |
| Frontend | Next.js 15.1.7 + React 19 + TailwindCSS 4 |
| Mobile | Expo SDK 54 + React Native 0.81.5 + Redux Toolkit |
| Database | PostgreSQL 16 + Prisma 6.4.1 |
| Connection Pooling | PgBouncer 1.23.1 (transaction mode) |
| Auth | JWT + bcryptjs + TOTP (otplib) |
| Validation | Zod |
| Real-time | Socket.IO |
| Testing | Vitest (admin, web), Jest (services, mobile) |
| Deployment | Render.com + Docker Compose |

---

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd "Farm Management System"
corepack enable
pnpm install

# Set up database (Docker)
docker-compose up -d
pnpm db:push
pnpm db:seed

# Start all services
pnpm dev
```

| Service | URL |
|---------|-----|
| API Gateway | http://localhost:4000 |
| Swagger Docs | http://localhost:4000/docs |
| Web App | http://localhost:3001 |
| Admin Dashboard | http://localhost:3000 |
| Console | http://localhost:3004 |
| Mobile | http://localhost:8082 (Expo Go) |

See **[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)** for detailed setup.

---

## Project Structure

```
├── apps/                          # Frontend applications
│   ├── web/                       # Worker-facing app        (port 3001)
│   ├── admin/                     # Farm owner dashboard     (port 3000)
│   ├── console/                   # Platform admin console   (port 3004)
│   └── mobile/                    # Expo mobile app          (port 8082)
├── services/                      # Backend microservices
│   ├── api-gateway/               # Central gateway          (port 4000)
│   ├── auth-service/              # Authentication           (port 4001)
│   ├── farm-service/              # Farm management          (port 4002)
│   ├── livestock-service/         # Livestock management     (port 4003)
│   ├── poultry-service/           # Poultry management       (port 4004)
│   ├── notification-service/      # Notifications            (port 4005)
│   ├── finance-service/           # Finance tracking         (port 4006)
│   ├── worker-service/            # Worker management        (port 4007)
│   ├── reporting-service/         # Report generation        (port 4008)
│   ├── organization-service/      # Multi-tenant orgs        (port 4009)
│   ├── crop-service/              # Crop lifecycle           (port 4011)
│   ├── hr-service/                # HR operations            (port 4012)
│   └── platform-service/          # Platform admin           (port 4020)
├── packages/                      # Shared libraries
│   ├── database/                  # Prisma schema + client
│   ├── auth/                      # JWT, cookie helpers
│   ├── types/                     # TypeScript types
│   ├── validation/                # Zod schemas
│   ├── utils/                     # Utility functions
│   ├── domain-core/               # DDD base classes
│   ├── api-client/                # Axios API client
│   ├── ui/                        # Shared React components
│   └── domains/                   # 10 bounded context packages
└── docs/                          # Documentation
```

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for full architecture details.

---

## Documentation

### Core

| Document | Description |
|----------|-------------|
| [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) | Prerequisites, setup, first run |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, auth flow, DDD, multi-tenancy |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | All API endpoints documented |
| [docs/DATABASE.md](docs/DATABASE.md) | 42 Prisma models reference |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker, Render, environment variables |
| [docs/MOBILE.md](docs/MOBILE.md) | Expo Go setup, emulator, mobile dev |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Code style, PR process, conventions |

### Architecture Decision Records

| ADR | Decision |
|-----|----------|
| [ADR-001](docs/adr/001-nestjs-migration.md) | Why NestJS over Express |
| [ADR-002](docs/adr/002-httpOnly-cookies.md) | Why httpOnly cookies for web auth |
| [ADR-003](docs/adr/003-ddd-structure.md) | Why DDD with shared PostgreSQL |
| [ADR-004](docs/adr/004-api-gateway.md) | Why centralized API gateway |

### Audits

| Audit | Status |
|-------|--------|
| [Console Audit](docs/audits/console-audit.md) | OPEN |
| [Mobile Audit](docs/audits/mobile-audit.md) | OPEN |
| [Admin/Web Audit](docs/audits/admin-web-audit.md) | OPEN |

### Operations

| Document | Description |
|----------|-------------|
| [Platform Admin Procedures](docs/runbook/platform-admin-procedures.md) | Admin operations guide |
| [Troubleshooting](docs/runbook/troubleshooting.md) | Common issues and fixes |

### Roadmap

| Document | Description |
|----------|-------------|
| [Enhancement Roadmap](docs/roadmap/enhancements.md) | 8-phase feature plan |

---

## Service Ports

| Service | Port | Responsibility |
|---------|------|----------------|
| API Gateway | 4000 | Request routing, JWT auth, WebSocket |
| Auth Service | 4001 | Login, registration, 2FA, tokens |
| Farm Service | 4002 | Farm and field CRUD |
| Livestock Service | 4003 | Livestock tracking, health, breeding |
| Poultry Service | 4004 | Poultry flocks, feeding, vaccination |
| Notification Service | 4005 | Push, email, WebSocket events |
| Finance Service | 4006 | Expenses, sales, budgets, contracts |
| Worker Service | 4007 | Worker management, tasks |
| Reporting Service | 4008 | Report generation, scheduling |
| Organization Service | 4009 | Multi-tenant organization management |
| Crop Service | 4011 | Crop cycles, stages, irrigation |
| HR Service | 4012 | Attendance, leave, shifts, messaging |
| Platform Service | 4020 | Feature flags, subscriptions, health |

---

## Test Credentials

All users share the password: **`password123`**

| Email | Role | Access |
|-------|------|--------|
| `Admin@fms.com` | Super Admin | Console |
| `demo@farm.com` | Org Owner | Admin, Web, Mobile |
| `farmmanager.demo@farm.com` | Farm Manager | Web, Mobile |
| `accountant.demo@farm.com` | Account Manager | Web, Mobile |
| `supervisor.demo@farm.com` | Supervisor | Web, Mobile |
| `veterinarian.demo@farm.com` | Veterinarian | Web, Mobile |
| `worker.demo@farm.com` | Farm Worker | Web, Mobile |

---

## License

Private — All rights reserved.
