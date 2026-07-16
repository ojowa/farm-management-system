# Documentation Index

Complete navigation for all project documentation.

---

## Getting Started

| Document | Description |
|----------|-------------|
| [Project Overview](./README.md) | Tech stack, service ports, quick start |
| [Getting Started](./getting-started.md) | Detailed local setup instructions |
| [Contributing](./contributing.md) | Code style, PR process, commit conventions |

## Architecture

| Document | Description |
|----------|-------------|
| [Architecture Overview](./architecture/overview.md) | System design, service map, patterns, DDD, deployment |
| [Authentication](./architecture/authentication.md) | JWT, roles, refresh tokens, frontend auth flows |
| [Database](./architecture/database.md) | PostgreSQL/Prisma schema, 42 models, 11 domains |

## Architecture Decision Records

| ADR | Decision | Date |
|-----|----------|------|
| [001 — NestJS Migration](./ADR/001-nestjs-migration.md) | Migrate backend to NestJS | 2026-06-15 |
| [002 — httpOnly Cookies](./ADR/002-httpOnly-cookies.md) | Use httpOnly cookies for web auth | 2026-07-13 |
| [003 — DDD Structure](./ADR/003-ddd-structure.md) | Domain-driven design with shared database | 2026-06-01 |
| [004 — API Gateway](./ADR/004-api-gateway.md) | Centralized API gateway pattern | 2026-06-01 |

## API

| Document | Description |
|----------|-------------|
| [API Reference](./api/reference.md) | All endpoints via gateway (localhost:4000) |

## Security

| Document | Description |
|----------|-------------|
| [Security Hardening](./security/hardening.md) | RBAC audit, security fixes |
| [Auth Audit](./security/auth-audit.md) | Full authentication system audit |
| [Admin & Web Audit](./security/audits/admin-web-audit.md) | Admin + web app security audit |
| [Console Audit](./security/audits/console-audit.md) | Platform console security audit |
| [Mobile Audit](./security/audits/mobile-audit.md) | Mobile app security audit |

## Deployment

| Document | Description |
|----------|-------------|
| [Deployment Guide](./deployment/guide.md) | Docker, Render, environment variables |
| [Troubleshooting](./deployment/troubleshooting.md) | Common issues and solutions |
| [Platform Admin Procedures](./runbook/platform-admin-procedures.md) | Admin console operational procedures |

## Apps

| Document | Description |
|----------|-------------|
| [Mobile App](./mobile/overview.md) | Expo SDK 54 + React Native overview |
| [Mobile — Backend Integration](./mobile/README.md) | API setup, endpoints, debugging |
| [Mobile — Screens](./mobile/SCREENS_README.md) | Screen descriptions, architecture |
| [Mobile — Testing](./mobile/TESTING.md) | Integration testing checklist |
| [Mobile — Deployment](./mobile/DEPLOYMENT_TASKS.md) | Production readiness tasks |
| [Mobile — Backend Alignment](./mobile/TODO_ALIGN_MOBILE_BACKEND.md) | Contract alignment audit |

## Planning

| Document | Description |
|----------|-------------|
| [Enhancements](./planning/enhancements.md) | Feature implementation roadmap |
| [Refactoring Plan](./planning/refactoring-plan.md) | Cross-app refactoring plan |
| [DDD Refactoring Plan](./planning/ddd-refactoring-plan.md) | DDD domain refactoring |
| [Roadmap](./planning/roadmap/enhancements.md) | Future features |

## Task Tracking

| Document | Description |
|----------|-------------|
| [Admin Tasks](./todos/admin-tasks.md) | Admin app implementation tasks |
| [Admin TODO](./todos/admin-todo.md) | Admin app TODO checklist |

## Archive

Historical documents preserved for reference.

| Document | Status |
|----------|--------|
| [AUTH_ARCHITECTURE.md](./archive/AUTH_ARCHITECTURE.md) | Superseded — merged into authentication.md |
| [BACKEND_NESTJS_MIGRATION.md](./archive/BACKEND_NESTJS_MIGRATION.md) | Superseded — merged into architecture.md |
| [DDD_DOMAIN_ANALYSIS.md](./archive/DDD_DOMAIN_ANALYSIS.md) | Superseded — merged into architecture.md |
| [PLATFORM_CONSOLE_ARCHITECTURE.md](./archive/PLATFORM_CONSOLE_ARCHITECTURE.md) | Superseded — merged into architecture.md |
