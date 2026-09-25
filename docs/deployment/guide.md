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

Defined as a [Render Blueprint](https://render.com/docs/blueprint-spec) in [`render.yaml`](../../render.yaml) at the repo root — three web services, one repo:

| Service | rootDir | Runtime | URL |
|---------|---------|---------|-----|
| `fms-api` | `farm-server` | NestJS gateway + 13 microservices | `https://fms-api.onrender.com` |
| `fms-admin` | `farm-client/admin` | Next.js admin dashboard | `https://fms-admin.onrender.com` |
| `fms-console` | `farm-client/console` | Next.js platform console | `https://fms-console.onrender.com` |

Database: Neon PostgreSQL (hosted, free tier — Render's free Postgres expires after 30 days).

### Deploy Steps

1. Push the repo to GitHub/GitLab
2. Render Dashboard → **New → Blueprint** → select the repo (Render picks up `render.yaml`)
3. Set `DATABASE_URL` when prompted (or afterwards in each service's Environment tab) to your Neon connection string:
   `postgresql://user:pass@ep-xxx.neon.tech/FMS?sslmode=require`
4. Let the blueprint create all three services (`fms-api` runs `prisma migrate deploy` via `preDeployCommand` on every deploy)
5. Seed once after the first successful deploy:
   ```bash
   # Render Shell on fms-api, or locally against Neon:
   cd farm-server
   npm run seed
   ```
6. Verify the auto-generated domains: if Render assigns different `*.onrender.com` URLs than the
   hardcoded `https://fms-*.onrender.com` values in `render.yaml`, update these env vars and redeploy:
   - `fms-api` → `CORS_ORIGINS`
   - `fms-admin` → `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`
   - `fms-console` → `API_GATEWAY_URL`

### Environment Variables

Set automatically by the blueprint (`render.yaml`):

| Service | Variable | Source |
|---------|----------|--------|
| fms-api | `DATABASE_URL` | `sync: false` — paste Neon string in dashboard |
| fms-api | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MFA_SECRET`, `SERVICE_SECRET` | `generateValue: true` |
| fms-api | `CORS_ORIGINS` | hardcoded (frontend URLs) |
| fms-admin | `NEXT_PUBLIC_API_URL` | hardcoded (`…/v1`) |
| fms-admin | `NEXT_PUBLIC_SOCKET_URL` | hardcoded (gateway, Socket.IO) |
| fms-console | `API_GATEWAY_URL` | hardcoded (`…/v1`) |

Optional for notification-service (set in `fms-api` dashboard if needed):

| Variable | Description |
|----------|-------------|
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_PRIVATE_KEY` | Firebase private key |
| `FIREBASE_CLIENT_EMAIL` | Firebase client email |
| `SMTP_HOST` / `SMTP_PORT` | SMTP server |
| `SMTP_USER` / `SMTP_PASS` | SMTP credentials |

### Build Configuration

**fms-api** (`rootDir: farm-server`):

1. `npm ci && npm run build` — builds workspace packages (domain-core, types-server, env, utils, validation-server, auth-server, database) then `app-server` (13 NestJS projects)
2. `preDeployCommand: npm run migrate` — `prisma migrate deploy` before each deploy
3. `startCommand: npm run start` — runs all microservices via `concurrently`
4. Listens on Render's `$PORT` (`api.main.ts` falls back to `PORT` when `API_SERVICE_PORT` is unset)
5. Health check: `GET /v1/health`

**fms-admin / fms-console** (`rootDir: farm-client/admin` / `farm-client/console` — each app is an independent npm project with its own lockfile):

1. `npm ci && npm run build` — installs the app's own packages (from `packages/`) and builds them, then the Next app
2. `startCommand: npx next start -p $PORT` (Next.js reads Render's `$PORT`; run from `rootDir`)
3. `buildFilter.paths` covers the app directory plus `tsconfig.base.json` (root config referenced by package tsconfigs)

### Free Tier Notes

- Render Hobby plan: **750 free instance hours/month** across all services. Free services spin down
  after 15 min without traffic (~1 min to wake). Three always-on services would exceed 750 h, so
  expect spin-downs with light traffic — fine for demos, upgrade to Starter for production.
- Render's free Postgres **expires after 30 days** — always use Neon (or a paid Render Postgres).
- Socket.IO is served by `fms-api` (gateway). Realtime events emitted inside a microservice process
  reach clients only if the client is connected to that process; cross-process fan-out would need a
  Redis adapter (not currently configured).


---

## Database Production

### Neon (Hosted PostgreSQL)

- Use Neon's connection pooler endpoint (port 5432)
- Connection pooling is built into Neon — no separate PgBouncer needed
- Set `DATABASE_URL` to Neon's pooler endpoint with `sslmode=require`

### Migrations

```bash
# Development: push schema changes
cd farm-server/packages/server/database
npx prisma db push

# Production: apply committed migrations (auto-run pre-deploy on Render)
cd farm-server
npm run migrate

# Generate client after migration
cd farm-server/packages/server/database
npx prisma generate
```

### Seeding Production

```bash
# Only run once on initial setup (run in Render Shell on fms-api, or locally against Neon)
cd farm-server
npm run seed
```

---

## Monitoring

### Health Checks

The API gateway exposes a health endpoint:

```bash
curl http://localhost:4000/v1/health
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
2. Install npm + Node 22 (cached on `farm-client/admin/package-lock.json`)
3. Install dependencies in `farm-client/admin/`
4. Build packages & app (`npm run build`)
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
