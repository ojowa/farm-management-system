# Contributing

Guidelines for contributing to the Farm Management System.

## Prerequisites

- Node.js 20.18+
- pnpm 10.27+ (via corepack)
- PostgreSQL 16+
- Git

## Getting Started

```bash
git clone <repo-url>
cd "Farm Management System"
corepack enable
pnpm install
docker compose -f infra/docker-compose.yml up -d
pnpm db:push
pnpm db:seed
pnpm dev
```

See [GETTING_STARTED.md](./GETTING_STARTED.md) for details.

## Code Style

### TypeScript

- **Strict mode** is enabled
- Target: ES2022, Module: CommonJS
- Use explicit return types on public functions
- Avoid `any` — use `unknown` or proper types
- No comments unless explicitly requested

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `user.controller.ts` |
| Classes | PascalCase | `UserController` |
| Variables/functions | camelCase | `getUserById` |
| Constants | UPPER_SNAKE_CASE | `JWT_SECRET` |
| Database tables | PascalCase | `User`, `FarmCycle` |
| Database columns | camelCase | `createdAt`, `organizationId` |

### File Organization

Each NestJS service follows DDD layers:

```
service/
├── domain/
│   ├── entities/        # Domain entities
│   ├── value-objects/   # Value objects
│   ├── events/          # Domain events
│   └── repositories/    # Repository interfaces
├── application/
│   ├── services/        # Application services (use cases)
│   └── dto/             # Data transfer objects
├── infrastructure/
│   └── persistence/     # Prisma repository implementations
├── presentation/
│   ├── controllers/     # HTTP controllers
│   ├── filters/         # Exception filters
│   └── guards/          # Auth guards
└── main.ts
```

## Architecture Rules

### Dependency Injection

**Repository providers** (string tokens):
```typescript
// Provider
{ provide: 'UserRepository', useClass: PrismaUserRepository }

// Consumer — MUST use @Inject
constructor(@Inject('UserRepository') private userRepo: UserRepository) {}
```

**Module-level services** (class-based DI):
```typescript
// No @Inject needed
constructor(private cropService: CropService) {}
```

### Multi-Tenancy

Every data query must filter by `organizationId`:

```typescript
// CORRECT
const farms = await this.prisma.farm.findMany({
  where: { organizationId: user.organizationId }
});

// WRONG — exposes all organizations' data
const farms = await this.prisma.farm.findMany();
```

### Security

- Never log secrets, keys, or passwords
- Never commit `.env` files
- Hash passwords with bcrypt (12 rounds)
- Use parameterized queries (Prisma handles this)
- Validate all input with Zod schemas

### API Gateway

- All external requests go through the gateway (port 4000)
- Gateway injects tenant context headers
- Backend services read `x-user-id`, `x-user-role`, `x-organization-id` from headers

## Testing

### Running Tests

```bash
# All tests
pnpm test

# Specific service
pnpm --filter @farm/auth-service test

# Specific app
pnpm --filter @farm/admin test
pnpm --filter @farm/web test
pnpm --filter @farm/mobile test
```

### Test Frameworks

| Context | Framework | Config |
|---------|-----------|--------|
| Backend services | Jest | `jest.config.ts` per service |
| Admin app | Vitest | `vitest.config.ts` |
| Web app | Vitest | `vitest.config.ts` |
| Mobile app | Jest | `jest.config.js` |

### Writing Tests

- Place tests in `__tests__/` directories
- Name test files as `*.spec.ts` or `*.test.ts`
- Mock external dependencies (Prisma, HTTP calls)
- Test both success and error paths

## Git Workflow

### Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/description` | `feature/crop-calendar` |
| Fix | `fix/description` | `fix/auth-500-error` |
| Refactor | `refactor/description` | `refactor/prisma-schema` |

### Commit Messages

Use descriptive messages:

```
Add crop cycle stage tracking

- Add CropStage model to Prisma schema
- Create crop-stage controller and service
- Add Zod validation for stage data
- Write unit tests for stage transitions
```

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run `pnpm build` and `pnpm test`
4. Commit with descriptive messages
5. Open a PR with a clear description
6. Wait for CI checks to pass
7. Request review

## Adding a New Service

1. Create the service directory:
   ```bash
   mkdir services/my-service
   ```

2. Create `package.json`:
   ```json
   {
     "name": "@farm/my-service",
     "version": "1.0.0",
     "scripts": {
       "build": "nest build",
       "start": "nest start",
       "dev": "nest start --watch"
     }
   }
   ```

3. Register in `pnpm-workspace.yaml` (already covered by `services/*`)

4. If new bounded context, create domain package in `packages/domains/`

5. Add route in gateway: `services/api-gateway/src/domain/routes/index.ts`

6. Add to `render.yaml` for deployment

7. Add health check endpoint

## Adding a New Frontend Page

1. Create page in appropriate `apps/*/app/` directory (Next.js) or `apps/mobile/app/` (Expo)

2. Use existing API client:
   ```typescript
   import { apiClient } from '@/lib/api';
   
   const data = await apiClient.get('/farms');
   ```

3. Follow existing component patterns

4. Add tests if applicable

## Documentation

- Update relevant docs when changing architecture
- Keep API_REFERENCE.md in sync with new endpoints
- Add ADRs for significant technical decisions
- Document breaking changes

## Questions?

Open an issue or reach out to the team.
