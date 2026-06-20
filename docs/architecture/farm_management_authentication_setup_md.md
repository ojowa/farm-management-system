# Authentication Setup — Farm Management System

## Overview

This document defines the complete authentication architecture for the Farm Management System.

Recommended stack:

- NestJS
- PostgreSQL
- Prisma
- Passport.js
- JWT Authentication

The authentication system is designed for:

- Multi-tenant organizations
- Mobile + web applications
- Role-based access control (RBAC)
- Offline-capable mobile apps
- Enterprise scalability

---

# 1. Authentication Architecture

```text
Client (Mobile/Web)
        ↓
API Gateway
        ↓
Auth Module
        ↓
JWT Generation
        ↓
Protected APIs
```

---

# 2. Authentication Features

## Core Features

- User registration
- Organization registration
- Login
- Logout
- Refresh tokens
- Password reset
- Session management
- Role-based access control
- Tenant-aware authentication

---

# 3. Recommended Folder Structure

```text
apps/api-gateway/src/modules/auth/
│
├── controllers/
│   └── auth.controller.ts
│
├── services/
│   └── auth.service.ts
│
├── dto/
│   ├── login.dto.ts
│   ├── register.dto.ts
│   └── refresh-token.dto.ts
│
├── guards/
│   ├── jwt-auth.guard.ts
│   ├── roles.guard.ts
│   └── tenant.guard.ts
│
├── strategies/
│   └── jwt.strategy.ts
│
├── decorators/
│   ├── roles.decorator.ts
│   └── current-user.decorator.ts
│
├── interfaces/
├── constants/
├── auth.module.ts
└── auth.types.ts
```

---

# 4. Required Dependencies

Install required packages:

```bash
pnpm add \
@nestjs/jwt \
@nestjs/passport \
passport \
passport-jwt \
bcrypt \
class-validator \
class-transformer
```

---

# 5. User Model

```prisma
model User {
  id              String   @id @default(cuid())

  organizationId  String

  firstName       String
  lastName        String

  email           String?  @unique
  phone           String?  @unique

  passwordHash    String

  roleId          String

  isActive        Boolean  @default(true)

  lastLoginAt     DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organization    Organization @relation(fields: [organizationId], references: [id])

  role            Role @relation(fields: [roleId], references: [id])

  refreshTokens   RefreshToken[]

  @@index([organizationId])
}
```

---

# 6. Refresh Token Model

```prisma
model RefreshToken {
  id          String   @id @default(cuid())

  userId      String

  token       String

  expiresAt   DateTime

  revoked     Boolean  @default(false)

  createdAt   DateTime @default(now())

  user        User @relation(fields: [userId], references: [id])

  @@index([userId])
}
```

---

# 7. RBAC Models

## Role Model

```prisma
model Role {
  id          String @id @default(cuid())

  name        String @unique

  permissions RolePermission[]

  users       User[]
}
```

---

## Permission Model

```prisma
model Permission {
  id          String @id @default(cuid())

  name        String @unique

  roles       RolePermission[]
}
```

---

## RolePermission Model

```prisma
model RolePermission {
  roleId        String
  permissionId  String

  role          Role @relation(fields: [roleId], references: [id])

  permission    Permission @relation(fields: [permissionId], references: [id])

  @@id([roleId, permissionId])
}
```

---

# 8. JWT Payload Structure

```json
{
  "sub": "user_id",
  "organizationId": "organization_id",
  "role": "FARM_MANAGER",
  "email": "user@example.com"
}
```

---

# 9. JWT Strategy

## jwt.strategy.ts

```ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET'),
    })
  }

  async validate(payload: any) {
    return payload
  }
}
```

---

# 10. Register DTO

```ts
export class RegisterDto {
  @IsString()
  firstName: string

  @IsString()
  lastName: string

  @IsEmail()
  email: string

  @MinLength(6)
  password: string

  @IsString()
  organizationName: string
}
```

---

# 11. Login DTO

```ts
export class LoginDto {
  @IsEmail()
  email: string

  @IsString()
  password: string
}
```

---

# 12. Password Hashing

## Hash Password

```ts
const hashedPassword = await bcrypt.hash(password, 12)
```

---

## Verify Password

```ts
await bcrypt.compare(password, user.passwordHash)
```

---

# 13. Generate JWT Token

```ts
const payload = {
  sub: user.id,
  organizationId: user.organizationId,
  role: user.role.name,
}

const accessToken = this.jwtService.sign(payload)
```

---

# 14. Generate Refresh Token

```ts
const refreshToken = crypto.randomUUID()
```

Store hashed refresh tokens in the database.

---

# 15. Multi-Tenant Authentication

Every authenticated request must include:

```text
organizationId
```

Injected from the JWT token.

---

# 16. Tenant Guard

## Responsibilities

- Validate organization access
- Prevent cross-tenant access
- Validate farm ownership
- Protect organization data isolation

---

# 17. Roles Decorator

```ts
export const Roles = (...roles: string[]) =>
  SetMetadata('roles', roles)
```

Usage:

```ts
@Roles('SUPER_ADMIN')
@Get()
findAllUsers() {}
```

---

# 18. Roles Guard

## Responsibilities

- Validate user roles
- Validate permissions
- Restrict protected APIs

---

# 19. Protected Route Example

```ts
@UseGuards(JwtAuthGuard, RolesGuard)

@Roles('FARM_MANAGER')

@Get('dashboard')
getDashboard() {}
```

---

# 20. Authentication Endpoints

## Public Endpoints

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/forgot-password
POST /auth/reset-password
```

---

## Protected Endpoints

```text
GET /auth/profile
POST /auth/logout
GET /users
GET /organizations
```

---

# 21. Organization Registration Flow

```text
Register Organization
        ↓
Create Organization
        ↓
Create Default Roles
        ↓
Create Owner Account
        ↓
Generate JWT
```

---

# 22. Recommended Default Roles

## Platform Roles

- SUPER_ADMIN
- SUPPORT_ADMIN

---

## Organization Roles

- ORGANIZATION_OWNER
- FARM_MANAGER
- ACCOUNTANT
- SUPERVISOR
- WORKER
- VETERINARIAN

---

# 23. Session Management

Recommended:

- Short-lived access tokens
- Long-lived refresh tokens
- Device tracking
- Token revocation

---

# 24. Security Best Practices

## Required

- HTTPS only
- Hash passwords
- Rotate refresh tokens
- Rate limit login endpoints
- Store secrets in environment variables
- Audit authentication events
- Validate JWT expiration

---

# 25. Rate Limiting

Install:

```bash
pnpm add @nestjs/throttler
```

Example:

```ts
@Throttle(5, 60)
@Post('login')
login() {}
```

---

# 26. Mobile Authentication Flow

```text
User Login
    ↓
Access Token
    ↓
Store Securely
    ↓
Use API
    ↓
Refresh Token When Expired
```

---

# 27. Secure Mobile Storage

Recommended:

- Expo SecureStore
- iOS Keychain
- Android EncryptedSharedPreferences

---

# 28. Recommended Auth Response

```json
{
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "user": {
    "id": "user_id",
    "organizationId": "organization_id",
    "role": "FARM_MANAGER"
  }
}
```

---

# 29. Offline Authentication Strategy

Recommended:

- Allow cached session validation
- Queue failed requests
- Re-authenticate when online

Do NOT:

- Store plain passwords locally

---

# 30. Password Reset Flow

```text
Request Reset
    ↓
Generate Reset Token
    ↓
Send Email/SMS
    ↓
Validate Token
    ↓
Reset Password
```

---

# 31. Recommended Environment Variables

```env
JWT_SECRET=super-secret
JWT_EXPIRES_IN=15m

REFRESH_SECRET=refresh-secret
REFRESH_EXPIRES_IN=30d

BCRYPT_ROUNDS=12
```

---

# 32. Suggested Future Enhancements

Future additions:

- Multi-factor authentication (MFA)
- Biometric login
- OAuth (Google/Microsoft)
- Device management
- Session dashboard
- Single Sign-On (SSO)

---

# 33. Authentication Flow Summary

```text
Login
   ↓
Validate Credentials
   ↓
Generate Access Token
   ↓
Generate Refresh Token
   ↓
Return Tokens
   ↓
Authenticated API Access
```

---

# 34. Final Recommendations

Use:

- JWT access tokens
- Refresh token rotation
- RBAC
- Tenant guards
- Secure mobile storage
- Audit logging
- Rate limiting

This authentication architecture is scalable for:

- Multi-organization SaaS
- Enterprise agricultural systems
- Offline-first mobile operations
- Government-scale deployments

---

# End of Document

