# Getting Started

Get the Farm Management System running locally in under 10 minutes.

## Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| Node.js | 20.18+ | `node --version` |
| npm | 10.27+ | `npm --version` |
| PostgreSQL | 16+ | `psql --version` |
| Git | 2.x+ | `git --version` |
| Docker | Optional | `docker --version` |

## 1. Clone & Install

```bash
git clone https://github.com/ojowa/farm-management-system.git
cd farm-management-system

# Install all dependencies (two workspace roots)
npm install --workspaces
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
# Create environment file
cat > farm-server/.env << EOF
DATABASE_URL=postgresql://postgres:Aarinola@localhost:5432/FMS
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
MFA_SECRET=your-super-secret-mfa-key-change-in-production
SERVICE_SECRET=your-super-secret-service-key-change-in-production
NODE_ENV=development
EOF

# Push schema to database
cd farm-server && npx prisma db push

# Seed with demo data (7 users + farm data)
npx tsx prisma/seed.ts
```

## 3. Start Development

### Option A: All Services (Root)

```bash
npm run dev
```

This starts all backend services and frontend apps.

### Option B: Frontend Only

```bash
cd farm-client
npm run dev:admin    # Admin dashboard on port 4003
npm run dev:console  # Console on port 4002
```

### Option C: Backend Only

```bash
cd farm-server
npm run start:dev    # All microservices
```

| Service | URL |
|---------|-----|
| API Gateway | http://localhost:4000 |
| Swagger Docs | http://localhost:4000/docs |
| Admin Dashboard | http://localhost:4003 |
| Console | http://localhost:4002 |

## 4. Verify It Works

```bash
# Check gateway health
curl http://localhost:4000/health

# Open admin dashboard in browser
start http://localhost:4003
```

## 5. Mobile App (Optional)

```bash
cd farm-client/mobile
npm start
```

See [mobile/README.md](./mobile/README.md) for Expo Go setup and emulator instructions.

## 6. Test Credentials

All users share the password: `password123`

| Email | Role | App |
|-------|------|-----|
| `Admin@fms.com` | Super Admin | Console |
| `demo@farm.com` | Org Owner | Admin, Mobile |
| `farmmanager.demo@farm.com` | Farm Manager | Admin, Mobile |
| `accountant.demo@farm.com` | Account Manager | Admin, Mobile |
| `supervisor.demo@farm.com` | Supervisor | Admin, Mobile |
| `veterinarian.demo@farm.com` | Veterinarian | Admin, Mobile |
| `worker.demo@farm.com` | Farm Worker | Admin, Mobile |

## Project Structure

```
FMS/
├── farm-client/          # Frontend workspace
│   ├── admin/            # Admin dashboard (Next.js)
│   ├── console/          # Platform console (Next.js)
│   ├── mobile/           # Mobile app (Expo)
│   └── packages/         # Shared client libraries
├── farm-server/          # Backend workspace
│   ├── app-server/       # NestJS microservices
│   └── packages/server/  # Shared server libraries
├── scripts/              # Build/start scripts
├── infra/                # Docker infrastructure
└── docs/                 # Documentation
```

## Troubleshooting

### Prisma engine DLL lock (Windows)
```bash
# Stop all node processes
taskkill /F /IM node.exe

# Regenerate Prisma client
cd farm-server/packages/server/database
npx prisma generate
```

### Port already in use
Check which process is using the port:
```bash
netstat -ano | findstr :4000
taskkill /F /PID <pid>
```

### npm install fails
```bash
# Clear cache and retry
npm cache clean --force
rm -rf node_modules
npm install --workspaces
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

### Build fails with out of memory
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```
