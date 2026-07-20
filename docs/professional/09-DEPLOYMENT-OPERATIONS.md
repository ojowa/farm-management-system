# Deployment & Operations

> Infrastructure, deployment procedures, monitoring, and operational
> runbooks for the Farm Management System.

**Document Classification:** Internal — Confidential
**Version:** 2.0 | **Date:** July 2026 | **Status:** Modular Monolith Implemented

---

## 1. Architecture Overview

### 1.1 Current Deployment (Modular Monolith)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DNS: yourdomain.com                          │
│                              │                                       │
│                              ▼                                       │
│                    ┌─────────────────┐                               │
│                    │   Cloudflare    │                               │
│                    │     (CDN)       │                               │
│                    └────────┬────────┘                               │
│                             │                                        │
│                             ▼                                        │
│                    ┌─────────────────┐                               │
│                    │  Render.com     │                               │
│                    │  (Hosting)      │                               │
│                    └────────┬────────┘                               │
│                             │                                        │
│        ┌────────────────────┼────────────────────┐                  │
│        │                    │                    │                   │
│        ▼                    ▼                    ▼                   │
│  ┌──────────┐        ┌──────────┐        ┌──────────┐              │
│  │  Admin   │        │   Web    │        │ Console  │              │
│  │ (:3000)  │        │ (:3001)  │        │ (:3004)  │              │
│  └──────────┘        └──────────┘        └──────────┘              │
│        │                    │                    │                   │
│        └────────────────────┼────────────────────┘                  │
│                             │                                        │
│                             ▼                                        │
│                    ┌─────────────────┐                               │
│                    │   API Gateway   │                               │
│                    │    (:4000)      │                               │
│                    └────────┬────────┘                               │
│                             │                                        │
│                             ▼                                        │
│                    ┌─────────────────┐                               │
│                    │   App Server    │                               │
│                    │    (:4001)      │                               │
│                    │  (Modular       │                               │
│                    │   Monolith)     │                               │
│                    └────────┬────────┘                               │
│                             │                                        │
│                             ▼                                        │
│                    ┌─────────────────┐                               │
│                    │   PostgreSQL    │                               │
│                    │    (:5432)      │                               │
│                    └─────────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Legacy Deployment (9 Separate Services)

The original architecture ran 9 separate NestJS processes. This has been consolidated
into the modular monolith (app-server). The original services are retained for
reference but are no longer the primary deployment target.

```
Original: api-gateway → auth(:4001) + farm(:4002) + crop(:4011) +
          livestock(:4003) + poultry(:4004) + notification(:4005) +
          finance(:4006) + hr(:4012) + reporting(:4008) +
          organization(:4009) + platform(:4020) = 11 processes

Current:  api-gateway(:4000) → app-server(:4001) = 2 processes
```

---

## 2. Environment Configuration

### 2.1 Required Environment Variables

| Variable | Description | Example | Required |
|----------|------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` | Yes |
| `JWT_SECRET` | JWT signing secret (128+ chars) | Random string | Yes |
| `JWT_REFRESH_SECRET` | Refresh token signing secret | Random string | Yes |
| `SERVICE_SECRET` | Inter-service token signing | Random string | Yes |
| `MFA_SECRET` | MFA token signing secret | Random string | Yes |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000` | No |
| `NODE_ENV` | Environment mode | `production` | No |

### 2.2 Optional Environment Variables

| Variable | Description | Default |
|----------|------------|---------|
| `PORT` | Server port | `4001` |
| `LOG_LEVEL` | Logging level | `info` |
| `RATE_LIMIT_TTL` | Rate limit window (ms) | `60000` |
| `RATE_LIMIT_MAX` | Rate limit max requests | `100` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | — |
| `FIREBASE_PRIVATE_KEY` | Firebase private key | — |
| `SMTP_HOST` | Email SMTP host | — |
| `SMTP_PORT` | Email SMTP port | `587` |
| `SMTP_USER` | Email SMTP user | — |
| `SMTP_PASS` | Email SMTP password | — |

---

## 3. Deployment Procedures

### 3.1 Local Development

```bash
# Install dependencies
pnpm install

# Start all services
pnpm dev

# Start specific service
pnpm --filter api-gateway dev
pnpm --filter app-server dev
```

### 3.2 Production Deployment (Render.com)

#### render.yaml Configuration

```yaml
services:
  - name: api-gateway
    env: production
    buildCommand: cd services/api-gateway && pnpm install && pnpm build
    startCommand: node dist/main.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: fms-db
          property: connectionString

  - name: app-server
    env: production
    buildCommand: cd services/app-server && pnpm install && pnpm build
    startCommand: node dist/main.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: fms-db
          property: connectionString

  - name: admin
    env: production
    buildCommand: cd apps/admin && pnpm install && pnpm build
    startCommand: pnpm start
    envVars:
      - key: NEXT_PUBLIC_API_URL
        value: https://api.yourdomain.com

  - name: web
    env: production
    buildCommand: cd apps/web && pnpm install && pnpm build
    startCommand: pnpm start
    envVars:
      - key: NEXT_PUBLIC_API_URL
        value: https://api.yourdomain.com

  - name: console
    env: production
    buildCommand: cd apps/console && pnpm install && pnpm build
    startCommand: pnpm start
    envVars:
      - key: NEXT_PUBLIC_API_URL
        value: https://api.yourdomain.com

databases:
  - name: fms-db
    plan: starter
    databaseName: fms
    user: fms_user
```

### 3.3 Manual Deployment

```bash
# 1. Build all packages
pnpm build

# 2. Run database migrations
cd packages/database
npx prisma migrate deploy

# 3. Seed database (if needed)
npx prisma db seed

# 4. Start services
cd services/api-gateway && node dist/main.js &
cd services/app-server && node dist/main.js &
```

---

## 4. Database Operations

### 4.1 Migration Procedures

```bash
# Create new migration
cd packages/database
npx prisma migrate dev --name add_new_feature

# Apply migrations to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Generate Prisma client
npx prisma generate
```

### 4.2 Backup Procedures

```bash
# Manual backup
pg_dump -h host -U user -d fms > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -h host -U user -d fms < backup_20260720.sql
```

### 4.3 Monitoring Queries

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

---

## 5. Monitoring & Alerting

### 5.1 Health Checks

```bash
# Gateway health
curl https://api.yourdomain.com/health

# App server health
curl https://api.yourdomain.com/health/ready

# Check specific service
curl https://api.yourdomain.com/health/live
```

### 5.2 Log Monitoring

```bash
# View gateway logs
render logs api-gateway --tail 100

# View app server logs
render logs app-server --tail 100

# Search for errors
render logs app-server --grep "ERROR"
```

### 5.3 Key Metrics to Monitor

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Response time (p95) | > 500ms | Warning |
| Response time (p99) | > 1000ms | Critical |
| Error rate | > 1% | Warning |
| Error rate | > 5% | Critical |
| CPU usage | > 80% | Warning |
| Memory usage | > 80% | Warning |
| Database connections | > 80% of max | Warning |
| Disk usage | > 80% | Warning |

---

## 6. Incident Response

### 6.1 Service Down

1. Check Render.com dashboard for service status
2. Review recent deployments
3. Check logs for errors
4. Restart service if needed
5. Escalate if not resolved in 15 minutes

### 6.2 Database Issues

1. Check database connection pool
2. Review slow query logs
3. Check for lock contention
4. Restart database if needed
5. Restore from backup if data corruption

### 6.3 Security Incident

1. Revoke all active sessions
2. Rotate JWT secrets
3. Review audit logs
4. Notify affected users
5. Document incident

---

## 7. Runbooks

### 7.1 Service Restart

```bash
# Render.com
render service restart api-gateway
render service restart app-server

# Manual
kill -9 $(pgrep -f "api-gateway") && cd services/api-gateway && node dist/main.js &
kill -9 $(pgrep -f "app-server") && cd services/app-server && node dist/main.js &
```

### 7.2 Database Rollback

```bash
# Rollback last migration
cd packages/database
npx prisma migrate resolve --rolled-back <migration_name>

# Restore from backup
psql -h host -U user -d fms < backup.sql
```

### 7.3 Secret Rotation

```bash
# Generate new secrets
JWT_SECRET=$(openssl rand -base64 96)
JWT_REFRESH_SECRET=$(openssl rand -base64 96)
SERVICE_SECRET=$(openssl rand -base64 96)
MFA_SECRET=$(openssl rand -base64 96)

# Update Render.com environment variables
render env set api-gateway JWT_SECRET=$JWT_SECRET
render env set api-gateway JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
render env set api-gateway SERVICE_SECRET=$SERVICE_SECRET
render env set api-gateway MFA_SECRET=$MFA_SECRET

# Restart services
render service restart api-gateway
render service restart app-server
```

---

*This document should be reviewed monthly and updated as infrastructure
changes are made.*
