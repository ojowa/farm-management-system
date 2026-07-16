# Getting Started

Get the Farm Management System running locally in under 10 minutes.

## Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| Node.js | 20.18+ | `node --version` |
| pnpm | 10.27+ | `pnpm --version` |
| PostgreSQL | 16+ | `psql --version` |
| Git | 2.x+ | `git --version` |
| Docker | Optional | `docker --version` |

## 1. Clone & Install

```bash
git clone <repo-url>
cd "Farm Management System"

# Enable pnpm (required — packageManager is set in package.json)
corepack enable

# Install all dependencies
pnpm install
```

## 2. Database Setup

### Option A: Docker (Recommended)

```bash
docker compose -f infra/docker-compose.yml up -d
```

This starts PostgreSQL on port 5432 and PgBouncer on port 6432.

### Option B: Local PostgreSQL

1. Install PostgreSQL 16
2. Create a database named `FMS`
3. Ensure user `postgres` has password `Aarinola` (or update `.env`)

### Configure & Seed

```bash
# Copy environment template
cp .env.example .env

# Edit .env if your PostgreSQL config differs
# DATABASE_URL=postgresql://postgres:Aarinola@localhost:5432/FMS

# Push schema to database
pnpm db:push

# Seed with demo data (7 users + farm data)
pnpm db:seed
```

## 3. Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://postgres:Aarinola@localhost:5432/FMS

# JWT (required — all services need this)
JWT_SECRET=your-secret-key-min-32-chars

# API Gateway
API_GATEWAY_PORT=4000

# Auth Service
AUTH_SERVICE_PORT=4001

# Optional: Firebase (for push notifications)
# FIREBASE_PROJECT_ID=
# FIREBASE_PRIVATE_KEY=
# FIREBASE_CLIENT_EMAIL=

# Optional: SMTP (for email)
# SMTP_HOST=
# SMTP_PORT=
# SMTP_USER=
# SMTP_PASS=
```

## 4. Start Development

```bash
pnpm dev
```

This starts all 13 backend services and the web frontends via Turborepo.

| Service | URL |
|---------|-----|
| API Gateway | http://localhost:4000 |
| Swagger Docs | http://localhost:4000/docs |
| Web App | http://localhost:3001 |
| Admin Dashboard | http://localhost:3000 |
| Console | http://localhost:3004 |

## 5. Verify It Works

```bash
# Check gateway health
curl http://localhost:4000/health

# Check auth service
curl http://localhost:4001/auth/me

# Open web app in browser
start http://localhost:3001
```

## 6. Mobile App (Optional)

```bash
cd apps/mobile
pnpm start
```

See [MOBILE.md](./MOBILE.md) for Expo Go setup and emulator instructions.

## 7. Test Credentials

All users share the password: `password123`

| Email | Role | App |
|-------|------|-----|
| `Admin@fms.com` | Super Admin | Console |
| `demo@farm.com` | Org Owner | Admin, Web, Mobile |
| `farmmanager.demo@farm.com` | Farm Manager | Web, Mobile |
| `accountant.demo@farm.com` | Account Manager | Web, Mobile |
| `supervisor.demo@farm.com` | Supervisor | Web, Mobile |
| `veterinarian.demo@farm.com` | Veterinarian | Web, Mobile |
| `worker.demo@farm.com` | Farm Worker | Web, Mobile |

## Troubleshooting

### Prisma engine DLL lock (Windows)
```bash
# Stop all node processes
taskkill /F /IM node.exe

# Regenerate Prisma client
pnpm db:generate
```

### Port already in use
Check which process is using the port:
```bash
netstat -ano | findstr :4000
taskkill /F /PID <pid>
```

### Auth 500 error on login
Ensure the `User` entity includes `passwordHash` in the domain mapping. See `services/auth-service/src/domain/entities/user.entity.ts`.

### pnpm install fails
```bash
# Clear cache and retry
pnpm store prune
rm -rf node_modules
pnpm install
```

### Database connection refused
```bash
# Ensure PostgreSQL is running
docker compose -f infra/docker-compose.yml up -d

# Or check local PostgreSQL service
# Windows: services.msc → PostgreSQL
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql
```
