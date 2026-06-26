# Authentication & Authorization

The Farm Management System uses a single JWT issued by the `auth-service`. Every
other service trusts the token, never the client, and applies per-route
authorization via `@farm/auth`.

## Where the auth code lives

- `@farm/auth` (`packages/auth`): shared library with `verifyAccessToken`,
  `extractBearerToken`, the canonical role and permission matrix, and two
  framework-specific adapters:
  - Express: `authMiddleware({ roles?, permission? })` and an `AuthError` that
    downstream error handlers translate to 401/403 responses.
  - NestJS: `JwtAuthGuard`, `AuthorizationGuard`, `@Roles(...)`, `@Permission('...')`,
    and a `@CurrentUser()` parameter decorator.
- `services/auth-service`: the only place that issues and refreshes tokens.
  It signs JWTs with `{ sub, email, role, organizationId, iat, exp }` using
  the shared `JWT_SECRET`.
- `apps/api-gateway`: the proxy verifies the token once, then forwards the
  verified principal as headers (`x-user-id`, `x-user-role`, `x-organization-id`)
  to downstream services. Services can still verify independently for defense
  in depth.
- Per-service `*.module.ts` / `*.controller.ts` files apply the right
  `authMiddleware` / `@Roles` / `@Permission` to each route.

## Roles

`packages/auth/src/roles.ts` defines the canonical role names:

| Role | Intended use |
| ---- | ------------ |
| `SUPER_ADMIN` | Platform-wide superuser. |
| `SUPPORT_ADMIN` | Support staff; read-only plus impersonation. |
| `ORGANIZATION_OWNER` | Owns a tenant; can do anything inside it. |
| `FARM_MANAGER` | Manages a farm and most sub-domains. |
| `ACCOUNTANT` | Finance-focused; reads farm/inventory/reporting. |
| `SUPERVISOR` | Operational lead across crops, livestock, poultry, workers. |
| `VETERINARIAN` | Writes livestock + poultry health records. |
| `WORKER` | Read-only field operator. |

The same file declares a coarse-grained permission matrix
(`farm.read`, `farm.write`, `farm.delete`, `finance.write`, etc.). Both the
in-code matrix and the `RolePermission` rows seeded by `packages/database`
should be kept in sync.

## Authorization model

Each route declares either a role allow-list, a required permission, or both.
A `SUPER_ADMIN` always passes. Other roles pass if either the role
allow-list matches or the role grants the required permission.

```ts
// Express
router.post(
  '/expenses',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'ACCOUNTANT'], permission: 'finance.write' }),
  financeController.createExpense,
);

// NestJS
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Roles('ORGANIZATION_OWNER', 'FARM_MANAGER')
@Permission('farm.write')
@Post('farms')
create() {}
```

## Token lifecycle

- Access tokens are short-lived (default 15 minutes).
- Refresh tokens are random UUIDs stored in `RefreshToken` with rotation on use
  and a 30-day expiry.
- The auth-service issues tokens; every other service only verifies them.

## Adding a new role

1. Add the constant to `ROLES` in `packages/auth/src/roles.ts`.
2. Add grants to `ROLE_PERMISSIONS`.
3. Add the role name to the upsert list in
   `packages/database/prisma/seed.ts` and grant the corresponding permissions.
4. Update role allow-lists on the relevant routes.
