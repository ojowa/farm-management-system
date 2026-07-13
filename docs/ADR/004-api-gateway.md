# ADR-004: Centralized API Gateway

**Date:** 2026-06-01  
**Status:** Accepted  
**Deciders:** Development Team

## Context

The system has 13 backend microservices. Frontend apps need a single entry point rather than managing connections to multiple services directly.

## Decision

Implement a **centralized API Gateway** (port 4000) that:

1. Routes HTTP requests to the appropriate backend service
2. Handles JWT authentication and token verification
3. Injects tenant context headers (`x-user-id`, `x-user-role`, `x-organization-id`)
4. Manages CORS for all frontend origins
5. Proxies WebSocket connections

### Route Table

| Path | Target Service |
|------|---------------|
| `/auth` | auth-service:4001 |
| `/roles`, `/permissions` | auth-service:4001 |
| `/farms`, `/fields` | farm-service:4002 |
| `/livestock` | livestock-service:4003 |
| `/poultry`, `/medications` | poultry-service:4004 |
| `/notifications` | notification-service:4005 |
| `/finance` | finance-service:4006 |
| `/workers` | worker-service:4007 |
| `/reporting` | reporting-service:4008 |
| `/organizations` | organization-service:4009 |
| `/crops` | crop-service:4011 |
| `/tasks`, `/attendance`, `/leave`, `/shifts`, `/messages` | hr-service:4012 |
| `/platform` | platform-service:4020 |

### Token Extraction

The proxy middleware extracts tokens from (in order):
1. `req.cookies.accessToken` (httpOnly cookie)
2. `Authorization: Bearer <token>` header

### Header Injection

After JWT verification, the gateway injects:
- `x-user-id` — authenticated user's ID
- `x-user-role` — user's role name
- `x-organization-id` — user's organization ID
- `x-user-email` — user's email

## Consequences

### Positive
- Single entry point for all frontend apps
- Centralized auth logic (JWT verification, tenant context)
- CORS managed in one place
- Backend services remain unaware of frontend concerns
- Easy to add rate limiting, logging, monitoring

### Negative
- Single point of failure (gateway down = all APIs unavailable)
- Additional network hop for every request
- Gateway must be scaled independently

### Neutral
- Backend services still read `x-*` headers directly
- No service mesh or gRPC — simple HTTP proxying
- WebSocket proxying handled separately via Socket.IO
