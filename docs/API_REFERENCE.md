# API Reference

All endpoints are accessed through the API Gateway at `http://localhost:4000`.

## Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Login with email/password | No |
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/refresh` | Refresh access token | No (uses refreshToken cookie/body) |
| POST | `/auth/logout` | Logout (clears cookies) | Yes |
| GET | `/auth/me` | Get current user profile | Yes |
| PUT | `/auth/profile` | Update profile | Yes |
| PUT | `/auth/password` | Change password | Yes |
| GET | `/auth/preferences` | Get notification preferences | Yes |
| PUT | `/auth/preferences` | Update notification preferences | Yes |
| GET | `/auth/sessions` | Get active sessions | Yes |
| POST | `/auth/verify-mfa` | Verify MFA code | No |
| POST | `/auth/2fa/generate` | Generate 2FA secret | Yes |
| POST | `/auth/2fa/enable` | Enable 2FA | Yes |
| POST | `/auth/2fa/disable` | Disable 2FA | Yes |

### Login Response

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": { "name": "FARM_MANAGER" },
    "organizationId": "..."
  }
}
```

Also sets httpOnly cookies: `accessToken` (15min), `refreshToken` (7 days).

---

## Roles & Permissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/roles` | List all roles |
| GET | `/roles/:id` | Get role by ID |
| POST | `/roles` | Create role |
| PUT | `/roles/:id` | Update role |
| DELETE | `/roles/:id` | Delete role |
| POST | `/roles/:id/permissions` | Set role permissions |
| GET | `/permissions` | List all permissions |

---

## Farm Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/farms` | List farms |
| GET | `/farms/:id` | Get farm by ID |
| POST | `/farms` | Create farm |
| PUT | `/farms/:id` | Update farm |
| DELETE | `/farms/:id` | Delete farm |
| GET | `/fields` | List fields |
| POST | `/fields` | Create field |
| PUT | `/fields/:id` | Update field |
| DELETE | `/fields/:id` | Delete field |
| GET | `/inventory` | List inventory items |
| POST | `/inventory` | Create inventory item |
| PUT | `/inventory/:id` | Update inventory item |
| DELETE | `/inventory/:id` | Delete inventory item |

---

## Crop Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/crops` | List crop types |
| POST | `/crops` | Create crop type |
| GET | `/crop-cycles` | List crop cycles |
| POST | `/crop-cycles` | Create crop cycle |
| PUT | `/crop-cycles/:id` | Update crop cycle |
| GET | `/crop-stages` | List crop stages |
| POST | `/crop-stages` | Create crop stage |
| GET | `/yield-records` | List yield records |
| POST | `/yield-records` | Create yield record |
| GET | `/pest-disease-records` | List pest/disease records |
| POST | `/pest-disease-records` | Create pest/disease record |
| GET | `/irrigation-schedules` | List irrigation schedules |
| POST | `/irrigation-schedules` | Create irrigation schedule |
| PUT | `/irrigation-schedules/:id` | Update irrigation schedule |

---

## Poultry Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/poultry` | List flocks |
| GET | `/poultry/:id` | Get flock by ID |
| POST | `/poultry` | Create flock |
| PUT | `/poultry/:id` | Update flock |
| GET | `/poultry/houses` | List poultry houses |
| POST | `/poultry/houses` | Create poultry house |
| GET | `/poultry/pens` | List pens |
| POST | `/poultry/pens` | Create pen |
| GET | `/poultry/breeds` | List breeds |
| POST | `/poultry/breeds` | Create breed |
| GET | `/poultry/feeding-records` | List feeding records |
| POST | `/poultry/feeding-records` | Create feeding record |
| GET | `/poultry/vaccination-records` | List vaccination records |
| POST | `/poultry/vaccination-records` | Create vaccination record |
| GET | `/poultry/mortality-records` | List mortality records |
| POST | `/poultry/mortality-records` | Create mortality record |
| GET | `/medications` | List medications |
| POST | `/medications` | Create medication |

---

## Livestock Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/livestock` | List livestock |
| GET | `/livestock/:id` | Get livestock by ID |
| POST | `/livestock` | Create livestock record |
| PUT | `/livestock/:id` | Update livestock record |
| GET | `/livestock/health-records` | List health records |
| POST | `/livestock/health-records` | Create health record |
| GET | `/livestock/vaccination-schedules` | List vaccination schedules |
| POST | `/livestock/vaccination-schedules` | Create vaccination schedule |
| GET | `/livestock/breeding-records` | List breeding records |
| POST | `/livestock/breeding-records` | Create breeding record |
| GET | `/livestock/weight-records` | List weight records |
| POST | `/livestock/weight-records` | Create weight record |

---

## Finance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/finance/expenses` | List expenses |
| POST | `/finance/expenses` | Create expense |
| PUT | `/finance/expenses/:id` | Update expense |
| DELETE | `/finance/expenses/:id` | Delete expense |
| GET | `/finance/sales` | List sales |
| POST | `/finance/sales` | Create sale |
| PUT | `/finance/sales/:id` | Update sale |
| GET | `/finance/budgets` | List budgets |
| POST | `/finance/budgets` | Create budget |
| PUT | `/finance/budgets/:id` | Update budget |
| GET | `/finance/contracts` | List contracts |
| POST | `/finance/contracts` | Create contract |
| PUT | `/finance/contracts/:id` | Update contract |
| GET | `/finance/profitability` | Get profitability summary |
| GET | `/finance/marketplace` | List marketplace listings |
| POST | `/finance/marketplace` | Create marketplace listing |

---

## HR & Workforce

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workers` | List workers |
| POST | `/workers` | Create worker |
| PUT | `/workers/:id` | Update worker |
| DELETE | `/workers/:id` | Delete worker |
| GET | `/tasks` | List tasks |
| POST | `/tasks` | Create task |
| PUT | `/tasks/:id` | Update task |
| GET | `/attendance` | List attendance records |
| POST | `/attendance` | Clock in/out |
| PUT | `/attendance/:id` | Update attendance |
| GET | `/leave/types` | List leave types |
| POST | `/leave/types` | Create leave type |
| GET | `/leave/requests` | List leave requests |
| POST | `/leave/requests` | Submit leave request |
| PUT | `/leave/requests/:id` | Approve/reject leave |
| GET | `/leave/balances` | Get leave balances |
| GET | `/shifts` | List shifts |
| POST | `/shifts` | Create shift |
| GET | `/shift-assignments` | List shift assignments |
| POST | `/shift-assignments` | Assign shift |
| GET | `/messages` | List messages |
| POST | `/messages` | Send message |
| GET | `/correspondence` | List correspondence |
| POST | `/correspondence` | Create correspondence |

---

## Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | List notifications |
| POST | `/notifications/register` | Register push token |
| POST | `/notifications/unregister` | Unregister push token |
| PUT | `/notifications/:id/read` | Mark as read |
| PUT | `/notifications/read-all` | Mark all as read |

---

## Reporting

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reporting/reports` | List reports |
| POST | `/reporting/reports` | Generate report |
| GET | `/reporting/scheduled` | List scheduled reports |
| POST | `/reporting/scheduled` | Create scheduled report |
| PUT | `/reporting/scheduled/:id` | Update scheduled report |

---

## Platform Administration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/platform-features` | List feature flags |
| POST | `/api/platform-features` | Create feature flag |
| PUT | `/api/platform-features/:id` | Update feature flag |
| GET | `/api/platform-features/:id/overrides` | Get org overrides |
| POST | `/api/platform-features/:id/overrides` | Set org override |
| GET | `/api/platform-subscriptions/plans` | List subscription plans |
| POST | `/api/platform-subscriptions/plans` | Create plan |
| PUT | `/api/platform-subscriptions/plans/:id` | Update plan |
| GET | `/api/platform-audit` | List audit logs |
| GET | `/api/platform-health` | Get system health |
| POST | `/api/platform-health/check` | Trigger health check |
| GET | `/api/platform-broadcasts` | List broadcasts |
| POST | `/api/platform-broadcasts` | Create broadcast |
| GET | `/api/platform-config` | List platform config |
| PUT | `/api/platform-config` | Update platform config |

---

## Request Format

- **Content-Type:** `application/json`
- **Authentication:** httpOnly cookies (web) or `Authorization: Bearer <token>` (mobile)
- **Tenant context:** Injected by gateway (`x-user-id`, `x-user-role`, `x-organization-id`)

## Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized (no token or invalid) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 500 | Internal Server Error |
| 502 | Service Unavailable (backend down) |
