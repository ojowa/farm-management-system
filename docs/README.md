# Farm Management System

A multi-tenant SaaS platform for managing farm operations — crops, livestock, poultry, finance, HR, and equipment — built with a microservices architecture.

## Features

- **Authentication & Authorization** — JWT, httpOnly cookies, 2FA/TOTP, RBAC with 60+ permissions
- **Multi-Tenancy** — Organization-scoped data isolation with subscription plans and feature flags
- **Farm Management** — Multiple farm types (crop, livestock, poultry, dairy, aquaculture), geolocation, field management
- **Crop Lifecycle** — Crop cycles, growth stages, irrigation scheduling, pest/disease tracking, yield records
- **Poultry Management** — Flock tracking, houses/pens, feeding, vaccination, mortality, medications, breeds
- **Livestock Management** — Individual animal tracking, health records, vaccination schedules, breeding, weight tracking
- **Finance** — Expenses, sales, budgets with categories, contracts, marketplace with buyers and listings
- **HR & Workforce** — Workers, tasks, attendance (clock-in/out), leave management, duty rosters, internal messaging
- **Notifications** — In-app notifications, push notifications (Firebase), email (Nodemailer), WebSocket real-time
- **Equipment Tracking** — Equipment inventory, maintenance records
- **Document Management** — File uploads linked to entities
- **Platform Administration** — System health monitoring, broadcasts, platform config, feature flags per organization
- **Offline Sync** — SyncQueue model for offline data synchronization (mobile)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Monorepo** | Turborepo + pnpm 10.27.0 workspaces |
| **Backend** | NestJS 11 (13 microservices) |
| **Frontend (Web)** | Next.js 15.1.7 + React 19 + TailwindCSS 4 |
| **Frontend (Mobile)** | Expo SDK 54 + React Native 0.81.5 + Redux Toolkit |
| **Database** | PostgreSQL 16 + Prisma 6.4.1 |
| **Connection Pooling** | PgBouncer 1.23.1 (transaction mode) |
| **Auth** | JWT (jsonwebtoken) + bcryptjs + TOTP (otplib) |
| **Validation** | Zod |
| **Real-time** | Socket.IO (NestJS WebSockets) |
| **Push Notifications** | Firebase Admin SDK |
| **Email** | Nodemailer |
| **Testing** | Vitest (admin, web), Jest (services, mobile) |
| **Deployment** | Render.com (production), Docker Compose (local) |

## Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd "Farm Management System"

# Enable pnpm via corepack
corepack enable

# Install dependencies
pnpm install

# Start PostgreSQL (Docker)
docker-compose up -d

# Set up the database
cp .env.example .env  # edit DATABASE_URL if needed
pnpm db:push
pnpm db:seed

# Start all services
pnpm dev
```

See [GETTING_STARTED.md](./GETTING_STARTED.md) for detailed setup instructions.

## Project Structure

```
Farm Management System/
├── apps/
│   ├── web/              # Worker-facing web app (port 3001)
│   ├── admin/            # Farm owner/manager dashboard (port 3000)
│   ├── console/          # Platform admin console (port 3004)
│   └── mobile/           # Expo mobile app (port 8082)
├── services/
│   ├── api-gateway/      # Central gateway (port 4000)
│   ├── auth-service/     # Authentication (port 4001)
│   ├── farm-service/     # Farm management (port 4002)
│   ├── livestock-service/# Livestock management (port 4003)
│   ├── poultry-service/  # Poultry management (port 4004)
│   ├── notification-service/ # Notifications (port 4005)
│   ├── finance-service/  # Finance tracking (port 4006)
│   ├── worker-service/   # Worker management (port 4007)
│   ├── reporting-service/# Report generation (port 4008)
│   ├── organization-service/ # Multi-tenant orgs (port 4009)
│   ├── crop-service/     # Crop lifecycle (port 4011)
│   ├── hr-service/       # HR operations (port 4012)
│   └── platform-service/ # Platform admin (port 4020)
├── packages/
│   ├── database/         # Prisma schema + client
│   ├── auth/             # Shared auth utilities
│   ├── types/            # Shared TypeScript types
│   ├── validation/       # Zod schemas
│   ├── utils/            # Utility functions
│   ├── domain-core/      # DDD building blocks
│   ├── api-client/       # Axios API client
│   ├── ui/               # Shared React components
│   └── domains/          # 10 bounded context packages
├── docs/                 # Documentation
└── scripts/              # Utility scripts
```

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

## Frontend Apps

| App | Port | Audience | Auth Method |
|-----|------|----------|------------|
| Web | 3001 | Workers / farm staff | httpOnly cookies |
| Admin | 3000 | Farm owners / managers | httpOnly cookies |
| Console | 3004 | Platform administrators | httpOnly cookies |
| Mobile | 8082 | All users (iOS/Android) | AsyncStorage + Bearer header |

## Test Credentials

All users share the password: `password123`

| Email | Role | Access |
|-------|------|--------|
| `Admin@fms.com` | Super Admin | Console |
| `demo@farm.com` | Org Owner | Admin, Web, Mobile |
| `farmmanager.demo@farm.com` | Farm Manager | Web, Mobile |
| `accountant.demo@farm.com` | Account Manager | Web, Mobile |
| `supervisor.demo@farm.com` | Supervisor | Web, Mobile |
| `veterinarian.demo@farm.com` | Veterinarian | Web, Mobile |
| `worker.demo@farm.com` | Farm Worker | Web, Mobile |

## Documentation

- [Getting Started](./GETTING_STARTED.md) — Setup and first run
- [Architecture](./ARCHITECTURE.md) — System design and patterns
- [API Reference](./API_REFERENCE.md) — Endpoint documentation
- [Database](./DATABASE.md) — Schema and models
- [Deployment](./DEPLOYMENT.md) — Docker and Render deployment
- [Mobile](./MOBILE.md) — Expo setup and mobile development
- [Contributing](./CONTRIBUTING.md) — Code style and PR process

## License

Private — All rights reserved.
