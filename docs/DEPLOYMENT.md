# Deployment

## Local Development

### Docker Compose

Starts PostgreSQL and PgBouncer:

```bash
docker-compose up -d
```

| Service | Port | Purpose |
|---------|------|---------|
| farm-postgres | 5432 | PostgreSQL 16 |
| farm-pgbouncer | 6432 | Connection pooling (transaction mode) |

Configuration:
- Max client connections: 200
- Default pool size: 20
- Auth: SCRAM-SHA-256
- Persistent volume: `postgres_data`

### Start All Services

```bash
pnpm dev
```

Uses Turborepo to start all 13 backend services and frontend apps concurrently.

---

## Production (Render.com)

### Architecture

15 services deployed via Render Blueprint (`render.yaml`):

| Service | Type | Port | Notes |
|---------|------|------|-------|
| api-gateway | web | 4000 | Routes to all services |
| auth-service | web | 4001 | Builds auth, types, utils, validation, database first |
| farm-service | web | 4002 | |
| livestock-service | web | 4003 | |
| poultry-service | web | 4004 | |
| notification-service | web | 4005 | Firebase + Nodemailer |
| finance-service | web | 4006 | |
| worker-service | web | 4007 | |
| reporting-service | web | 4008 | |
| organization-service | web | 4009 | |
| crop-service | web | 4011 | |
| hr-service | web | 4012 | |
| platform-service | web | 4020 | Also builds @farm/auth |
| admin | web | — | Frontend admin dashboard |
| web | web | — | Frontend worker web app |
| console | web | — | Platform console frontend |

**Database:** Neon (hosted PostgreSQL) with connection pooler endpoint.

### Deploy Steps

1. Push to GitHub
2. Connect Render to the repository
3. Apply the Render Blueprint (`render.yaml`)
4. Set environment variables in Render dashboard
5. Deploy

### Environment Variables

Required for all services:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/FMS` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | `your-secret-key` |
| `API_GATEWAY_PORT` | Gateway port | `4000` |
| `AUTH_SERVICE_PORT` | Auth service port | `4001` |

Optional for notification-service:

| Variable | Description |
|----------|-------------|
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_PRIVATE_KEY` | Firebase private key |
| `FIREBASE_CLIENT_EMAIL` | Firebase client email |

Optional for email:

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP server port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |

Optional for platform-service:

| Variable | Description |
|----------|-------------|
| `PLATFORM_JWT_SECRET` | Separate JWT secret for platform admin |

### Build Configuration

Each service builds workspace dependencies before its own build:

```yaml
buildCommand: |
  cd ../.. && pnpm install
  pnpm --filter @farm/database build
  pnpm --filter @farm/types build
  pnpm --filter @farm/utils build
  pnpm --filter @farm/validation build
  pnpm --filter @farm/auth build
  pnpm --filter @farm/<service-domain> build
  pnpm --filter @farm/<service> build
```

### Corepack Setup

Render uses corepack for pnpm:

```yaml
buildCommand: |
  corepack prepare pnpm@10.27.0 --activate
  # ... rest of build
```

---

## Database Production

### Neon (Hosted PostgreSQL)

- Use Neon's connection pooler endpoint (port 5432)
- Connection pooling is built into Neon — no separate PgBouncer needed
- Set `DATABASE_URL` to Neon's pooler endpoint

### Migrations

```bash
# Development: push schema changes
pnpm db:push

# Production: use migrations
npx prisma migrate deploy

# Generate client after migration
pnpm db:generate
```

### Seeding Production

```bash
# Only run once on initial setup
pnpm db:seed
```

---

## Monitoring

### Health Checks

Each service exposes a health endpoint:

```bash
curl http://localhost:4000/health  # Gateway
curl http://localhost:4001/health  # Auth
curl http://localhost:4002/health  # Farm
# ... etc
```

### SystemHealth Model

The platform-service tracks health status for all services:

| Field | Description |
|-------|-------------|
| serviceName | Service identifier |
| status | healthy, degraded, down |
| uptime | Seconds since last restart |
| memoryUsage | JSON with heap/ RSS stats |
| lastCheck | Timestamp of last health check |

### Platform Health Dashboard

Access via console app or API:

```bash
GET /platform/health          # List all service health
POST /platform/health/check   # Trigger health check
```

---

## CI/CD

### GitHub Actions

| Workflow | Status | Trigger |
|----------|--------|---------|
| admin-ci.yml | Active | Push to main/develop, PRs to main |
| api.yml | Placeholder | — |
| deploy.yml | Placeholder | — |
| mobile.yml | Placeholder | — |
| test.yml | Placeholder | — |
| web.yml | Placeholder | — |

### admin-ci.yml

Builds and tests the admin app:

1. Checkout code
2. Install pnpm 10.27.0 + Node 22
3. Install dependencies
4. Build workspace dependencies
5. Typecheck
6. Run tests
7. Upload `.next` build artifact (7-day retention)

---

## Troubleshooting

### Service won't start

```bash
# Check if port is in use
netstat -ano | findstr :4000

# Kill the process
taskkill /F /PID <pid>
```

### Database connection refused

```bash
# Ensure PostgreSQL is running
docker-compose up -d

# Check connection
psql "postgresql://postgres:Aarinola@localhost:5432/FMS"
```

### Prisma client outdated

```bash
# Regenerate after schema changes
pnpm db:generate
```

### Build fails on Render

- Ensure corepack is configured: `corepack prepare pnpm@10.27.0 --activate`
- Check build logs for missing workspace dependencies
- Verify `DATABASE_URL` is set correctly
