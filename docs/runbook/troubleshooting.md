# Troubleshooting

Common issues and their solutions.

## Prisma Engine DLL Lock (Windows)

**Symptom:** `Error: Unable to load DLL 'query_engine-windows.node'`

**Cause:** Prisma engine process is locked by another Node.js process.

**Solution:**
```bash
# Kill all node processes
taskkill /F /IM node.exe

# Regenerate Prisma client
pnpm db:generate
```

---

## Port Already in Use

**Symptom:** `Error: listen EADDRINUSE: address already in use :::4000`

**Solution:**
```bash
# Find the process using the port
netstat -ano | findstr :4000

# Kill it
taskkill /F /PID <pid>
```

---

## Auth 500 Error on Login

**Symptom:** `POST /auth/login` returns 500 with no clear error message.

**Cause:** `passwordHash` missing from User entity mapping.

**Solution:**
Ensure `services/auth-service/src/domain/entities/user.entity.ts` includes:
```typescript
passwordHash: string;
```

And `toDomain()` maps it:
```typescript
passwordHash: raw.passwordHash,
```

---

## Console App Shows 401 After Login

**Symptom:** Login succeeds but `GET /auth/me` returns 401.

**Cause:** Cookies not being set or sent.

**Solution:**
1. Check auth-service controller sets cookies on login
2. Check `withCredentials: true` on axios client
3. Check gateway CORS has `credentials: true`
4. Check `exposedHeaders: ['Set-Cookie']` in gateway CORS

---

## Expo Go SDK Version Mismatch

**Symptom:** `The installed version of Expo Go is for SDK 54. The project uses SDK 52.`

**Solution:**
```bash
cd apps/mobile
npx expo install expo@^54.0.0 --fix
```

---

## Metro Watcher Error

**Symptom:** `Error: ENOENT: no such file or directory, watch '.../.next/server/app'`

**Cause:** Metro tries to watch build artifacts from other apps.

**Solution:**
Ensure `metro.config.js` excludes build directories:
```javascript
config.resolver.blockList = [
  /\/apps\/admin\/.next\/.*/,
  /\/apps\/console\/.next\/.*/,
  /\/apps\/web\/.next\/.*/,
];
```

Also create the missing directory:
```bash
mkdir -p apps/admin/.next/server/app
mkdir -p apps/console/.next/server/app
mkdir -p apps/web/.next/server/app
```

---

## pnpm Install Fails

**Symptom:** `ERR_PNPM_META_FETCH_FAIL`

**Solution:**
```bash
pnpm store prune
rm -rf node_modules
pnpm install
```

---

## Database Connection Refused

**Symptom:** `Error: Can't reach database server at localhost:5432`

**Solution:**
```bash
# Start PostgreSQL via Docker
docker compose -f infra/docker-compose.yml up -d

# Or check local service
# Windows: services.msc → PostgreSQL
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql
```

---

## Mobile App Can't Reach Backend

**Symptom:** API calls from phone fail with network error.

**Cause:** `localhost` on phone refers to the phone itself, not your PC.

**Solution:**
1. Find your PC's LAN IP: `ipconfig | findstr "IPv4"`
2. Update `apps/mobile/.env.local`:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.x.x:4000
   ```
3. Ensure phone and PC are on the same WiFi
4. Allow ports through Windows Firewall:
   ```powershell
   New-NetFirewallRule -DisplayName "Farm Gateway" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
   ```

---

## Build Fails on Render

**Symptom:** Build fails during `pnpm install` or `nest build`.

**Solution:**
1. Ensure `corepack prepare pnpm@10.27.0 --activate` is in build command
2. Check workspace dependencies are built in correct order
3. Verify `DATABASE_URL` and `JWT_SECRET` env vars are set
