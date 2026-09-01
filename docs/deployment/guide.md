# Deployment

## Local Development

### Docker Compose

Starts PostgreSQL and PgBouncer:

```bash
docker compose -f infra/docker-compose.yml up -d
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
npm run dev
```

Uses npm scripts to start all backend services and frontend apps.

---

## Production (Render.com)

### Architecture

Deployed as a single Render web service:

| Component | Details |
|-----------|---------|
| Backend | NestJS microservices running via `concurrently` |
| Frontend | Next.js apps (admin, console) |
| Database | Neon PostgreSQL (hosted) |
| Build | `npm run build` with increased memory |

### Deploy Steps

1. Push to GitHub
2. Connect Render to the repository
3. Set environment variables in Render dashboard
4. Deploy

### Environment Variables

Required:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://neondb_owner:xxx@ep-xxx.neon.tech/FMS?sslmode=require` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | `your-secret-key` |
| `JWT_REFRESH_SECRET` | Refresh token secret | `your-refresh-secret` |
| `MFA_SECRET` | MFA secret | `your-mfa-secret` |
| `SERVICE_SECRET` | Service-to-service secret | `your-service-secret` |

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

### Build Configuration

The build process:

1. Run Prisma migrations
2. Build server workspace packages (domain-core, types-server, env, utils, validation-server, auth-server, database)
3. Build app-server (NestJS) with increased memory (`--max-old-space-size=4096`)
4. Build client workspace packages
5. Build admin and console apps

```yaml
buildCommand: |
  npm install --workspaces
  npm run build --workspace=farm-server
  npm run build --workspace=farm-client
startCommand: |
  npm run start
```

---

## Database Production

### Neon (Hosted PostgreSQL)

- Use Neon's connection pooler endpoint (port 5432)
- Connection pooling is built into Neon — no separate PgBouncer needed
- Set `DATABASE_URL` to Neon's pooler endpoint with `sslmode=require`

### Migrations

```bash
# Development: push schema changes
cd farm-server
npx prisma db push

# Production: use migrations
npx prisma migrate deploy

# Generate client after migration
npx prisma generate
```

### Seeding Production

```bash
# Only run once on initial setup
cd farm-server
npx tsx prisma/seed.ts
```

---

## Monitoring

### Health Checks

The API gateway exposes a health endpoint:

```bash
curl http://localhost:4000/health
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

---

## CI/CD

### GitHub Actions

| Workflow | Status | Trigger |
|----------|--------|---------|
| admin-ci.yml | Active | Push to main/develop, PRs to main |

### admin-ci.yml

Builds and tests the admin app:

1. Checkout code
2. Install npm + Node 22
3. Install dependencies in `farm-client/`
4. Build workspace dependencies (types, validation, auth)
5. Typecheck admin
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
docker compose -f infra/docker-compose.yml up -d

# Check connection
psql "postgresql://postgres:Aarinola@localhost:5432/FMS"
```

### Prisma client outdated

```bash
# Regenerate after schema changes
cd farm-server/packages/server/database
npx prisma generate
```

### Build fails on Render

- Ensure npm is installed and available
- Check build logs for missing workspace dependencies
- Verify `DATABASE_URL` is set correctly
- Check that Node memory limit is sufficient (4GB recommended)

### Migration baseline error (P3005)

If the database already has tables but Prisma doesn't recognize them:

```bash
cd farm-server/packages/server/database
npx prisma migrate resolve --applied 0_init
npx prisma migrate resolve --applied 20260722070000_add_report_model
```
