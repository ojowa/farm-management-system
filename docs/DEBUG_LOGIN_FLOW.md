# Login Flow Debugging Guide

## Current Issue
Multiple 401 errors appear when console app tries to authenticate:
```
[Nest] WARN [ProxyMiddleware] [Auth] No valid token found for /auth/me (cookies: ["refreshToken"])
[Nest] WARN [ProxyMiddleware] [Auth] 401 for /auth/me - no x-user-id header
```

## Architecture Overview
```
Console App (Next.js)
    ↓ POST /auth/login
API Gateway (NestJS)
    ↓ proxy to
Auth Service (NestJS)
    ↓ returns accessToken + refreshToken
API Gateway
    ↓ sets cookies
Console App
    ↓ GET /auth/me (with cookie)
API Gateway (proxy middleware)
    ↓ verify token
Auth Service or Direct JWT Verification
```

## Enhanced Logging Locations

### 1. Auth Service Logs
**File:** `services/auth-service/src/application/services/auth.service.ts`

Expected logs during login:
```
[Auth Service] Login successful for user@example.com
[Auth Service] Generated access token for user 123 (role: SUPER_ADMIN)
[Auth Service] Returning tokens for user@example.com
```

**What to look for:**
- ❌ If you don't see "Login successful" → invalid credentials
- ❌ If you see "JWT_SECRET environment variable is required" → env not loaded
- ✅ If you see token generation → tokens created successfully

### 2. API Gateway Proxy Middleware Logs
**File:** `services/api-gateway/src/infrastructure/routing/proxy.middleware.ts`

Expected logs on startup:
```
[Auth] JWT_SECRET loaded (length: 128)
[Auth] SERVICE_SECRET loaded (length: 128)
ProxyMiddleware initialized
```

Expected logs during /auth/me request:
```
[Auth] Token found in accessToken cookie for /auth/me (length: 234)
[Auth] Token verified for user 123 (user@example.com) role=SUPER_ADMIN
```

**What to look for:**
- ❌ "JWT_SECRET environment variable is NOT set!" → critical issue
- ❌ "No token found for /auth/me" → cookie not being passed
- ❌ "Token verification failed for /auth/me: ..." → token is invalid or corrupted
- ✅ "Token verified for user..." → authentication successful

### 3. Console App Auth Logs
**File:** `apps/console/src/lib/auth.tsx`

Expected logs during login:
```
[Console Auth] login: POST /auth/login { email: '...' }
[Console Auth] login: response received { 
  requiresMFA: false, 
  hasUser: true,
  hasAccessToken: true,
  refreshTokenLength: 234,
}
[Console Auth] login: attempting to fetch profile
[Console Auth] login: got user { id: '...', email: '...', roleName: 'SUPER_ADMIN' }
[Console Auth] login: authenticated
```

**What to look for:**
- ❌ "response received" with `hasAccessToken: false` → server not returning token
- ❌ "login error:" with 401 → token verification failed at gateway
- ✅ "authenticated" → successful login

## Debugging Checklist

### Step 1: Verify Environment Variables
```bash
# Check if .env has JWT_SECRET
grep JWT_SECRET .env

# Expected output:
# JWT_SECRET=d7e56963a5655b27c65e50abb7aeadc8bb4e3346af821e4fd4c49866fb25bdb...
```

### Step 2: Restart Services
The most common issue is services not picking up the .env file:
```bash
# Kill all services
pnpm dev  # or Ctrl+C to stop current dev session

# Wait 2 seconds
# Restart
pnpm turbo dev

# Watch for the initialization logs
```

### Step 3: Monitor Real-Time Logs
Open terminals for each service to see logs:

**Terminal 1 - Auth Service:**
```bash
# Extract auth-service logs in real-time
pnpm -C services/auth-service dev 2>&1 | grep -E "\[Auth|generated|Login"
```

**Terminal 2 - API Gateway:**
```bash
pnpm -C services/api-gateway dev 2>&1 | grep -E "\[Auth|ProxyMiddleware"
```

**Terminal 3 - Console App:**
```bash
pnpm -C apps/console dev 2>&1 | grep -E "\[Console Auth"
```

### Step 4: Manual Login Test
Use curl to test the flow directly:

```bash
# Step 1: Login and capture cookies
curl -v -X POST http://localhost:4001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  -c cookies.txt

# Expected response should include:
# - accessToken (in body and Set-Cookie header)
# - refreshToken (in body and Set-Cookie header)

# Step 2: Use cookies to call /auth/me through gateway
curl -X GET http://localhost:4000/auth/me \
  -b cookies.txt -v

# Should return user object, NOT 401
```

## Common Issues & Solutions

### Issue 1: "Token verification failed: JsonWebTokenError: invalid signature"
**Cause:** JWT_SECRET is different in API Gateway vs Auth Service

**Solution:**
1. Check that both services are reading the same `.env` file
2. Verify `.env` JWT_SECRET value is consistent
3. Restart both services

### Issue 2: "No x-user-id header" + cookie present
**Cause:** Token verification is failing silently

**Solution:**
1. Check the detailed error in logs: "Token verification failed: ..."
2. Look at error type (invalid signature, expired, payload mismatch)
3. May need to regenerate JWT_SECRET if it's corrupted

### Issue 3: "No valid token found for /auth/me (cookies: [])"
**Cause:** Cookie is not being sent from client to gateway

**Solution:**
1. Check CORS configuration allows credentials:
   ```
   credentials: true  // should be true in NestJS app
   ```
2. Check client is using credentials: 'include' in fetch/axios
3. Verify proxy middleware extracts cookies from request

### Issue 4: Token found but verification fails
**Cause:** Could be:
- Token expired
- Token format invalid
- Secret mismatch
- Algorithm mismatch

**Solution:**
1. Add more logging to see exact error message
2. Decode token at [jwt.io](https://jwt.io) to check payload
3. Verify payload matches expected schema: `{ sub, email, role, permissions, organizationId }`

## Log Output Interpretation

### Good Flow (successful login):
```
// Auth Service
[Auth Service] Login successful for admin@farm.local
[Auth Service] Generated access token for user:abc123 (role: SUPER_ADMIN)

// API Gateway
[Auth] JWT_SECRET loaded (length: 128)
[Auth] Token found in accessToken cookie for /auth/me (length: 425)
[Auth] Token verified for user abc123 (admin@farm.local) role=SUPER_ADMIN

// Console App
[Console Auth] login: authenticated
```

### Failed Flow (401 error):
```
// Auth Service
[Auth Service] Login successful for admin@farm.local  ✓
[Auth Service] Generated access token for user:abc123 (role: SUPER_ADMIN)  ✓

// API Gateway
[Auth] Token found in accessToken cookie for /auth/me (length: 425)  ✓
[Auth] Token verification failed for /auth/me: JsonWebTokenError: invalid signature  ✗

// Console App
[Console Auth] login error: AxiosError: 401 Unauthorized  ✗
```

## Quick Fixes

1. **Restart all services:**
   ```bash
   Ctrl+C  # stop current dev
   sleep 2
   pnpm turbo dev
   ```

2. **Regenerate JWT_SECRET (if corrupted):**
   ```bash
   # Generate new secrets
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   # Copy result to .env as JWT_SECRET
   ```

3. **Clear cookies and try again:**
   - Console DevTools → Application → Cookies → Delete all localhost:3000 cookies
   - Try login again

4. **Check service connectivity:**
   ```bash
   curl http://localhost:4001/health  # Auth service
   curl http://localhost:4000/health  # API Gateway
   ```

## Files Modified for Debugging
- ✅ `services/api-gateway/src/infrastructure/routing/proxy.middleware.ts` - Enhanced logging
- ✅ `services/auth-service/src/application/services/auth.service.ts` - Enhanced logging
- ✅ `apps/console/src/lib/auth.tsx` - Enhanced logging
