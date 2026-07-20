# Security Framework

> Comprehensive security architecture, controls, and compliance posture
> of the Farm Management System.

**Document Classification:** Internal — Confidential
**Version:** 1.0 | **Date:** July 2026

---

## 1. Security Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Applications                         │
│   Admin (:3000)  Web (:3001)  Console (:3004)  Mobile (:8082)      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTPS + httpOnly cookies
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    API Gateway (:4000)                               │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Security Controls:                                          │   │
│  │  • CORS (configurable origins, credentials: true)            │   │
│  │  • JWT verification (HS256, token extraction: cookie → Bearer)│  │
│  │  • Role-based access control (RBAC)                          │   │
│  │  • Permission-based access control (wildcard support)        │   │
│  │  • Request audit logging [AuthAudit]                         │   │
│  │  • Rate limiting (via downstream services)                   │   │
│  │  • Service token signing (30s TTL, inter-service auth)       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Application Services                              │
│                                                                     │
│  Auth Service (:4001)                                               │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  • bcrypt password hashing (cost factor 12)                  │   │
│  │  • TOTP-based 2FA (otplib)                                   │   │
│  │  • Refresh token rotation with reuse detection               │   │
│  │  • Token hash storage (SHA-256, never plaintext)             │   │
│  │  • Rate limiting: 10 login/60s, 5 MFA/5min, 20 refresh/60s  │   │
│  │  • Email verification & password reset tokens                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Platform Service (:4020)                                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  • PlatformAdminGuard (DB-verified platform admin status)    │   │
│  │  • SuperAdminGuard (DB-verified super admin status)          │   │
│  │  • Rate limiting: 100 req/60s                                │   │
│  │  • Helmet security headers                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PostgreSQL 16                                     │
│                    Organization-scoped queries (application-layer)   │
│                    RefreshToken hash storage                         │
│                    AuditLog table                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication

### 2.1 JWT Token Architecture

| Token Type | Secret | Algorithm | TTL | Storage |
|-----------|--------|-----------|-----|---------|
| Access Token | `JWT_SECRET` (128 chars) | HS256 | 15 minutes | httpOnly cookie |
| Refresh Token | `JWT_REFRESH_SECRET` | HS256 | 7 days | httpOnly cookie + DB hash |
| Service Token | `SERVICE_SECRET` | HS256 | 30 seconds | Header `x-service-token` |
| MFA Token | `MFA_SECRET` | HS256 | 5 minutes | In-memory (browser) |

### 2.2 Access Token Claims

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "FARM_MANAGER",
  "permissions": ["farm.read", "farm.write", "crop.*"],
  "organizationId": "org-uuid",
  "iat": 1721472000,
  "exp": 1721472900,
  "iss": "farm-management-system"
}
```

**Required claims:** `sub` (user ID), `role`
**Optional claims:** `email`, `permissions` (array), `organizationId`

### 2.3 Token Extraction Order

The `JwtAuthGuard` extracts tokens in this priority:

1. `Authorization: Bearer <token>` header (preferred)
2. `accessToken` httpOnly cookie (fallback)

Source: `packages/auth/src/nestjs/index.ts:69-99`

### 2.4 Password Security

- **Hashing:** bcrypt with cost factor 12
- **Policy:** Minimum 8 characters, at least one uppercase letter, one lowercase letter, and one digit
- **Regex:** `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/`

Source: `services/auth-service/src/presentation/dto/auth.dto.ts:7`

### 2.5 Refresh Token Rotation

```
Client                    Auth Service                Database
  │                           │                          │
  │  POST /auth/refresh       │                          │
  │  (refreshToken cookie)    │                          │
  │──────────────────────────>│                          │
  │                           │  Find valid token hash   │
  │                           │─────────────────────────>│
  │                           │<─────────────────────────│
  │                           │  Verify user exists      │
  │                           │  Generate new access +   │
  │                           │  refresh tokens          │
  │                           │  Revoke old token        │
  │                           │  (record replacement)    │
  │                           │─────────────────────────>│
  │  New cookies set          │                          │
  │<──────────────────────────│                          │
```

**Reuse Detection:** If a revoked refresh token is reused, ALL sessions for that user are revoked immediately. This detects token theft.

Source: `services/auth-service/src/presentation/controllers/auth.controller.ts:75-89`

---

## 3. Authorization

### 3.1 Role-Based Access Control (RBAC)

**System Roles:**

| Role | Description | Platform Admin |
|------|-------------|----------------|
| `SUPER_ADMIN` | Full system access | Yes |
| `SUPPORT_ADMIN` | Support staff access | Yes |
| `ORGANIZATION_OWNER` | Organization-level admin | No |
| `FARM_MANAGER` | Farm operations manager | No |
| `ACCOUNTANT` | Financial operations | No |
| `SUPERVISOR` | Worker supervision | No |
| `VETERINARIAN` | Livestock health management | No |
| `WORKER` | Basic field operations | No |

Source: `packages/auth/src/roles.ts:1-17`

### 3.2 Permission System

Permissions are database-driven and embedded in the JWT at login time.

**Wildcard Support:**

| Pattern | Matches |
|---------|---------|
| `*` | All permissions |
| `farm.*` | `farm.read`, `farm.write`, `farm.delete`, etc. |
| `farm.read` | Only `farm.read` (exact match) |

Source: `packages/auth/src/roles.ts:28-44`

### 3.3 Dual-Axis Authorization

The `AuthorizationGuard` supports two independent axes:

1. **Role-based:** `@Roles('FARM_MANAGER', 'SUPER_ADMIN')` — checks if user's role is in the allowed list
2. **Permission-based:** `@Permission('farm.write')` — checks if user has the specific permission

Both axes can be used independently or combined. If neither decorator is present, the endpoint is accessible to any authenticated user.

Source: `packages/auth/src/nestjs/index.ts:109-146`

### 3.4 Platform Admin Guard

The Platform Service uses a separate guard that performs **DB-level verification**:

1. Extracts Bearer token from Authorization header
2. Verifies JWT with `JWT_SECRET`
3. Looks up user in database
4. Checks `user.isActive` — rejects inactive users
5. Checks `user.role.isPlatformAdmin` — must be `true`

This prevents stale JWTs from granting platform access after role changes.

Source: `services/platform-service/src/guards/platform-admin.guard.ts:7-85`

---

## 4. Cookie Security

### 4.1 Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| `httpOnly` | `true` | Inaccessible to JavaScript (XSS protection) |
| `secure` | `true` (production) | HTTPS only |
| `sameSite` | `lax` | CSRF protection while allowing top-level navigation |
| `path` | `/` | Available on all routes |

### 4.2 Cookie Lifetimes

| Cookie | Max Age | Purpose |
|--------|---------|---------|
| `accessToken` | 15 minutes | Short-lived session |
| `refreshToken` | 7 days | Session renewal |

### 4.3 Token Storage Security

- Refresh tokens are stored as **SHA-256 hashes** in the database
- Raw refresh tokens are only ever in httpOnly cookies
- Never stored in localStorage, sessionStorage, or JavaScript variables
- Token hash enables revocation without storing plaintext

Source: `services/auth-service/src/application/services/auth.service.ts:11`

---

## 5. Rate Limiting

### 5.1 Auth Service Limits

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| `POST /auth/login` | 10 requests | 60 seconds | Brute force protection |
| `POST /auth/verify-mfa` | 5 requests | 300 seconds | 2FA brute force protection |
| `POST /auth/register` | 5 requests | 60 seconds | Spam prevention |
| `POST /auth/register-console` | 5 requests | 60 seconds | Spam prevention |
| `POST /auth/refresh` | 20 requests | 60 seconds | Token refresh abuse |
| `GET /auth/me` | Unlimited | — | Session validation (no limit) |

Source: `services/auth-service/src/presentation/controllers/auth.controller.ts`

### 5.2 Platform Service Limits

| Scope | Limit | Window |
|-------|-------|--------|
| Global | 100 requests | 60 seconds |

Source: `services/platform-service/src/app.module.ts:40-43`

### 5.3 Gateway

The API gateway currently has **no rate limiting**. Rate limiting is enforced at the service level. This is recommended to be added at the gateway level for DDoS protection.

---

## 6. CORS Configuration

### 6.1 Configuration

```typescript
{
  origin: corsOrigins,          // From CORS_ORIGINS env var
  credentials: true,            // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Requested-With', 'Authorization'],
  exposedHeaders: ['Set-Cookie'],
}
```

### 6.2 Allowed Origins (Development)

```
http://localhost:3000    (Admin)
http://localhost:3001    (Web)
http://localhost:3004    (Console)
http://localhost:8082    (Mobile)
```

### 6.3 Production

Set `CORS_ORIGINS` to your production domain(s):

```
CORS_ORIGINS=https://admin.yourdomain.com,https://console.yourdomain.com
```

---

## 7. Security Headers

### 7.1 Platform Service

The Platform Service uses `helmet` for security headers:

```typescript
app.use(helmet());
```

This adds:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 0` (modern browsers)
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy` (default)
- And others

### 7.2 API Gateway

The API gateway does **not** use helmet. This is a recommended addition.

---

## 8. Data Security

### 8.1 Sensitive Data Handling

| Data Type | Storage | Access |
|-----------|---------|--------|
| Passwords | bcrypt hash (cost 12) | Never plaintext |
| Refresh tokens | SHA-256 hash in DB | Raw token only in httpOnly cookie |
| JWT secrets | Environment variables | Never in code or DB |
| API keys | Key hash with prefix | Never stored plaintext |
| MFA secrets | Encrypted in DB | Only during setup/verification |

### 8.2 Audit Logging

**Server-side:** `[AuthAudit]` structured JSON logs with:
- Decision (public/allowed/denied)
- Token source (cookie/bearer/none)
- User ID and role
- Cookie presence (no token values)
- Timestamp (ISO 8601)

**Client-side:** `[AuthAudit]` structured JSON logs with 21 event types:
- BOOT, REQ_START, REQ_SUCCESS, REQ_FAIL
- TOKEN_REFRESH_START, TOKEN_REFRESH_OK, TOKEN_REFRESH_FAIL
- FETCH_USER_START, FETCH_USER_OK, FETCH_USER_DENIED
- LOGIN_START, LOGIN_RESPONSE, LOGIN_OK, LOGIN_DENIED
- MFA_START, MFA_OK, MFA_FAIL
- LOGOUT_START, LOGOUT_OK, IDLE_TIMEOUT

**Cookie snapshot:** Reports presence and length only (never token values).

### 8.3 Database Models for Security

| Model | Purpose |
|-------|---------|
| `RefreshToken` | Token hash, revocation, replacement tracking, IP/device logging |
| `UserSession` | Active session tracking with IP, device, login/logout timestamps |
| `ApiKey` | Hashed API keys with prefix, user association, lastUsedAt tracking |
| `AuditLog` | userId, action, entity, entityId, metadata, ipAddress, userAgent |
| `EmailVerification` | Token-based email verification and password reset with expiry |

---

## 9. Session Management

### 9.1 Idle Timeout

- **Timeout:** 10 minutes
- **Events tracked:** mousemove, mousedown, keydown, touchstart, scroll, click, wheel
- **Action:** Automatic logout (clears cookies, redirects to /login)

Source: `apps/console/src/lib/inactivity.ts:7`

### 9.2 Session Revocation

- **Single session:** Logout clears both cookies and revokes refresh token
- **All sessions:** `logoutAllSessions(userId)` revokes all refresh tokens for a user
- **Reuse detection:** If a revoked refresh token is reused, all sessions are revoked

### 9.3 Session Tracking

The `UserSession` model tracks:
- User agent and IP address
- Login timestamp
- Last activity timestamp
- Logout timestamp (null if active)

---

## 10. Input Validation

### 10.1 Backend (NestJS)

- **Library:** class-validator with `ValidationPipe`
- **Configuration:** `whitelist: true` (strips unknown properties), `forbidNonWhitelisted: true` (throws on unknown properties)
- **DTOs:** All endpoints use typed DTOs with validation decorators

### 10.2 Shared Validation

- **Library:** Zod (via `@farm/validation` package)
- **Usage:** Client-side and shared validation schemas

### 10.3 Password Policy

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit

---

## 11. Security Recommendations

### 11.1 High Priority

| Issue | Recommendation | Status |
|-------|---------------|--------|
| No gateway rate limiting | Add `@nestjs/throttler` to gateway | Not implemented |
| No gateway helmet | Add `helmet` to gateway middleware | Not implemented |
| No CSRF protection | Consider SameSite=strict or CSRF tokens | Not implemented |
| Service tokens unused | Gateway should sign and forward service tokens | Partial |

### 11.2 Medium Priority

| Issue | Recommendation | Status |
|-------|---------------|--------|
| No request size limiting | Add body size limits to gateway | Not implemented |
| No IP blocking | Consider fail2ban or similar | Not implemented |
| No security audit logging | Add structured security event logging | Partial (AuthAudit) |

### 11.3 Low Priority

| Issue | Recommendation | Status |
|-------|---------------|--------|
| No Content-Security-Policy | Add CSP headers to gateway | Not implemented |
| No X-Permitted-Cross-Domain | Configure cross-domain policy | Not implemented |

---

*This document describes the current security posture and recommendations
for improvement. All security controls should be regularly reviewed and
updated as the system evolves.*
