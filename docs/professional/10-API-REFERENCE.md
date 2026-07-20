# API Reference

> Complete REST API documentation for all services in the Farm Management System.

**Document Classification:** Internal — Confidential
**Version:** 1.0 | **Date:** July 2026

---

## 1. API Overview

### 1.1 Base URL

```
Development:  http://localhost:4000
Production:   https://api.yourdomain.com
```

### 1.2 Authentication

All protected endpoints require a valid JWT token via:
- **Cookie:** `accessToken` (httpOnly, sameSite: lax)
- **Header:** `Authorization: Bearer <token>`

### 1.3 Response Format

```json
{
  "data": { ... },
  "message": "Success",
  "statusCode": 200
}
```

### 1.4 Error Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### 1.5 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /auth/login` | 10 | 60s |
| `POST /auth/verify-mfa` | 5 | 300s |
| `POST /auth/register` | 5 | 60s |
| `POST /auth/refresh` | 20 | 60s |
| `GET /auth/me` | Unlimited | — |

---

## 2. Authentication API

### 2.1 Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "FARM_MANAGER",
      "organizationId": "uuid"
    },
    "accessToken": "jwt_token"
  }
}
```

**Response (200 MFA required):**
```json
{
  "data": {
    "requiresMFA": true,
    "mFAtoken": "mfa_token"
  }
}
```

### 2.2 Verify MFA

```http
POST /auth/verify-mfa
Content-Type: application/json

{
  "token": "mfa_token",
  "code": "123456"
}
```

### 2.3 Register

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123",
  "firstName": "John",
  "lastName": "Doe",
  "organizationName": "My Farm"
}
```

### 2.4 Register Console User

```http
POST /auth/register-console
Content-Type: application/json

{
  "email": "admin@fms.org",
  "password": "password123",
  "firstName": "Admin",
  "lastName": "User"
}
```

### 2.5 Refresh Token

```http
POST /auth/refresh
Cookie: refreshToken=refresh_token
```

### 2.6 Get Current User

```http
GET /auth/me
Cookie: accessToken=access_token
```

### 2.7 Update Profile

```http
PUT /auth/profile
Cookie: accessToken=access_token
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

### 2.8 Change Password

```http
PUT /auth/password
Cookie: accessToken=access_token
Content-Type: application/json

{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

### 2.9 Logout

```http
POST /auth/logout
Cookie: accessToken=access_token
```

### 2.10 Get Sessions

```http
GET /auth/sessions
Cookie: accessToken=access_token
```

### 2.11 Revoke Session

```http
DELETE /auth/sessions/:tokenId
Cookie: accessToken=access_token
```

### 2.12 Revoke All Sessions

```http
DELETE /auth/sessions
Cookie: accessToken=access_token
```

### 2.13 Generate 2FA

```http
POST /auth/2fa/generate
Cookie: accessToken=access_token
```

### 2.14 Enable 2FA

```http
POST /auth/2fa/enable
Cookie: accessToken=access_token
Content-Type: application/json

{
  "code": "123456"
}
```

### 2.15 Disable 2FA

```http
POST /auth/2fa/disable
Cookie: accessToken=access_token
Content-Type: application/json

{
  "code": "123456"
}
```

---

## 3. Organization API

### 3.1 Create Organization

```http
POST /organizations
Cookie: accessToken=access_token
Content-Type: application/json

{
  "name": "My Farm",
  "slug": "my-farm",
  "subscriptionPlan": "basic"
}
```

### 3.2 Get Organization

```http
GET /organizations/:id
Cookie: accessToken=access_token
```

### 3.3 Get Organization by Slug

```http
GET /organizations/slug/:slug
Cookie: accessToken=access_token
```

### 3.4 List Organizations

```http
GET /organizations
Cookie: accessToken=access_token
```

### 3.5 Update Organization

```http
PUT /organizations/:id
Cookie: accessToken=access_token
Content-Type: application/json

{
  "name": "Updated Farm Name"
}
```

### 3.6 Delete Organization

```http
DELETE /organizations/:id
Cookie: accessToken=access_token
```

### 3.7 Get Subscription Plans

```http
GET /organizations/subscription-plans
Cookie: accessToken=access_token
```

---

## 4. Farm API

### 4.1 Create Farm

```http
POST /farms
Cookie: accessToken=access_token
Content-Type: application/json

{
  "organizationId": "uuid",
  "name": "North Farm",
  "farmType": "crop",
  "location": "Lagos, Nigeria",
  "latitude": 6.5244,
  "longitude": 3.3792,
  "size": 100.5
}
```

### 4.2 List Farms

```http
GET /farms?organizationId=uuid
Cookie: accessToken=access_token
```

### 4.3 Get Farm

```http
GET /farms/:id
Cookie: accessToken=access_token
```

### 4.4 Update Farm

```http
PUT /farms/:id
Cookie: accessToken=access_token
Content-Type: application/json

{
  "name": "Updated Farm Name",
  "status": "active"
}
```

### 4.5 Delete Farm

```http
DELETE /farms/:id
Cookie: accessToken=access_token
```

### 4.6 Create Field

```http
POST /fields
Cookie: accessToken=access_token
Content-Type: application/json

{
  "farmId": "uuid",
  "name": "Field A",
  "size": 50.0
}
```

### 4.7 List Fields

```http
GET /fields?farmId=uuid
Cookie: accessToken=access_token
```

### 4.8 Get Field

```http
GET /fields/:id
Cookie: accessToken=access_token
```

### 4.9 Update Field

```http
PUT /fields/:id
Cookie: accessToken=access_token
Content-Type: application/json

{
  "name": "Updated Field",
  "size": 60.0
}
```

### 4.10 Delete Field

```http
DELETE /fields/:id
Cookie: accessToken=access_token
```

---

## 5. Crop API

### 5.1 Create Crop

```http
POST /crops
Cookie: accessToken=access_token
Content-Type: application/json

{
  "name": "Maize"
}
```

### 5.2 List Crops

```http
GET /crops
Cookie: accessToken=access_token
```

### 5.3 Get Crop

```http
GET /crops/:id
Cookie: accessToken=access_token
```

### 5.4 Update Crop

```http
PUT /crops/:id
Cookie: accessToken=access_token
Content-Type: application/json

{
  "name": "Updated Crop"
}
```

### 5.5 Delete Crop

```http
DELETE /crops/:id
Cookie: accessToken=access_token
```

### 5.6 Create Crop Cycle

```http
POST /crop-cycles
Cookie: accessToken=access_token
Content-Type: application/json

{
  "fieldId": "uuid",
  "cropId": "uuid",
  "plantingDate": "2026-07-20",
  "harvestDate": "2026-10-20",
  "status": "active"
}
```

### 5.7 List Crop Cycles

```http
GET /crop-cycles?fieldId=uuid
Cookie: accessToken=access_token
```

### 5.8 Get Crop Cycle

```http
GET /crop-cycles/:id
Cookie: accessToken=access_token
```

### 5.9 Update Crop Cycle

```http
PUT /crop-cycles/:id
Cookie: accessToken=access_token
Content-Type: application/json

{
  "status": "harvested",
  "harvestDate": "2026-10-15"
}
```

### 5.10 Delete Crop Cycle

```http
DELETE /crop-cycles/:id
Cookie: accessToken=access_token
```

---

## 6. Livestock API

### 6.1 Create Livestock

```http
POST /livestock
Cookie: accessToken=access_token
Content-Type: application/json

{
  "farmId": "uuid",
  "name": "Cow 001",
  "species": "cattle",
  "breed": "Holstein",
  "dateOfBirth": "2024-01-15",
  "gender": "female"
}
```

### 6.2 List Livestock

```http
GET /livestock?farmId=uuid
Cookie: accessToken=access_token
```

### 6.3 Get Livestock

```http
GET /livestock/:id
Cookie: accessToken=access_token
```

### 6.4 Update Livestock

```http
PUT /livestock/:id
Cookie: accessToken=access_token
Content-Type: application/json

{
  "status": "active",
  "weight": 450.5
}
```

### 6.5 Delete Livestock

```http
DELETE /livestock/:id
Cookie: accessToken=access_token
```

### 6.6 Get Health Records

```http
GET /health/livestock/:livestockId
Cookie: accessToken=access_token
```

### 6.7 Create Health Record

```http
POST /health/livestock/:livestockId
Cookie: accessToken=access_token
Content-Type: application/json

{
  "type": "checkup",
  "description": "Routine health check",
  "date": "2026-07-20",
  "veterinarian": "Dr. Smith"
}
```

### 6.8 Get Vaccinations

```http
GET /health/vaccinations/:livestockId
Cookie: accessToken=access_token
```

### 6.9 Create Vaccination

```http
POST /health/vaccinations/:livestockId
Cookie: accessToken=access_token
Content-Type: application/json

{
  "vaccineName": "FMD Vaccine",
  "dateAdministered": "2026-07-20",
  "nextDueDate": "2027-01-20",
  "dosage": "5ml"
}
```

### 6.10 Administer Vaccination

```http
PUT /health/vaccinations/:id/administer
Cookie: accessToken=access_token
```

### 6.11 Get Overdue Vaccinations

```http
GET /health/overdue
Cookie: accessToken=access_token
```

### 6.12 Get Breeding Records

```http
GET /breeding?farmId=uuid
Cookie: accessToken=access_token
```

### 6.13 Create Breeding Record

```http
POST /breeding
Cookie: accessToken=access_token
Content-Type: application/json

{
  "maleId": "uuid",
  "femaleId": "uuid",
  "breedingDate": "2026-07-20",
  "expectedDueDate": "2027-04-20"
}
```

### 6.14 Update Breeding Record

```http
PUT /breeding/:id
Cookie: accessToken=access_token
Content-Type: application/json

{
  "status": "completed",
  "actualDueDate": "2027-04-18"
}
```

### 6.15 Get Upcoming Breedings

```http
GET /breeding/upcoming
Cookie: accessToken=access_token
```

### 6.16 Get Weight Records

```http
GET /weight/livestock/:livestockId
Cookie: accessToken=access_token
```

### 6.17 Create Weight Record

```http
POST /weight/livestock/:livestockId
Cookie: accessToken=access_token
Content-Type: application/json

{
  "weight": 450.5,
  "date": "2026-07-20",
  "notes": "Monthly weigh-in"
}
```

---

## 7. Poultry API

### 7.1 Poultry Houses

```http
POST   /api/poultry-houses          # Create
GET    /api/poultry-houses          # List
GET    /api/poultry-houses/:id      # Get
PUT    /api/poultry-houses/:id      # Update
DELETE /api/poultry-houses/:id      # Delete
```

### 7.2 Pens

```http
POST   /api/pens                    # Create
GET    /api/pens                    # List
GET    /api/pens/:id                # Get
PUT    /api/pens/:id                # Update
DELETE /api/pens/:id                # Delete
```

### 7.3 Breeds

```http
POST   /api/breeds                  # Create
GET    /api/breeds                  # List
GET    /api/breeds/:id              # Get
PUT    /api/breeds/:id              # Update
DELETE /api/breeds/:id              # Delete
```

### 7.4 Flocks

```http
POST   /api/flocks                  # Create
GET    /api/flocks                  # List
GET    /api/flocks/:id              # Get
PUT    /api/flocks/:id              # Update
DELETE /api/flocks/:id              # Delete
```

### 7.5 Feeding Records

```http
POST   /api/feeding-records         # Create
GET    /api/feeding-records         # List
GET    /api/feeding-records/:id     # Get
PUT    /api/feeding-records/:id     # Update
DELETE /api/feeding-records/:id     # Delete
```

### 7.6 Vaccination Records

```http
POST   /api/vaccination-records     # Create
GET    /api/vaccination-records     # List
GET    /api/vaccination-records/:id # Get
PUT    /api/vaccination-records/:id # Update
DELETE /api/vaccination-records/:id # Delete
```

### 7.7 Mortality Records

```http
POST   /api/mortality-records       # Create
GET    /api/mortality-records       # List
GET    /api/mortality-records/:id   # Get
PUT    /api/mortality-records/:id   # Update
DELETE /api/mortality-records/:id   # Delete
```

### 7.8 Medications

```http
POST   /api/medications             # Create
GET    /api/medications             # List
GET    /api/medications/:id         # Get
PUT    /api/medications/:id         # Update
DELETE /api/medications/:id         # Delete
```

---

## 8. Finance API

### 8.1 Expenses

```http
POST   /expenses                    # Create
GET    /expenses                    # List
GET    /expenses/:id                # Get
PUT    /expenses/:id                # Update
DELETE /expenses/:id                # Delete
```

### 8.2 Sales

```http
POST   /sales                       # Create
GET    /sales                       # List
GET    /sales/:id                   # Get
PUT    /sales/:id                   # Update
DELETE /sales/:id                   # Delete
```

### 8.3 Contracts

```http
POST   /contracts                   # Create
GET    /contracts                   # List
PUT    /contracts/:id               # Update
DELETE /contracts/:id               # Delete
```

### 8.4 Marketplace

```http
# Buyers
POST   /marketplace/buyers          # Create
GET    /marketplace/buyers          # List
PUT    /marketplace/buyers/:id      # Update
DELETE /marketplace/buyers/:id      # Delete

# Listings
POST   /marketplace/listings        # Create
GET    /marketplace/listings        # List
PUT    /marketplace/listings/:id    # Update
DELETE /marketplace/listings/:id    # Delete
```

### 8.5 Profitability

```http
GET    /profitability/farm          # Farm profitability
GET    /profitability/summary       # Overall summary
```

---

## 9. HR API

### 9.1 Workers

```http
POST   /workers                     # Create
GET    /workers                     # List
GET    /workers/:id                 # Get
PUT    /workers/:id                 # Update
DELETE /workers/:id                 # Delete
```

### 9.2 Attendance

```http
POST   /attendance                  # Create
GET    /attendance                  # List
GET    /attendance/today            # Today's attendance
GET    /attendance/summary          # Summary
POST   /attendance/clock-in         # Clock in
POST   /attendance/clock-out        # Clock out
PUT    /attendance/:id              # Update
POST   /attendance/bulk             # Bulk create
```

### 9.3 Tasks

```http
POST   /tasks                       # Create
GET    /tasks                       # List
GET    /tasks/:id                   # Get
PUT    /tasks/:id                   # Update
DELETE /tasks/:id                   # Delete
PUT    /tasks/:id/status            # Update status
```

### 9.4 Shifts

```http
POST   /shifts                      # Create
GET    /shifts                      # List
PUT    /shifts/:id                  # Update
DELETE /shifts/:id                  # Delete
```

### 9.5 Shift Assignments

```http
POST   /shift-assignments           # Create
GET    /shift-assignments           # List
POST   /shift-assignments/bulk      # Bulk create
DELETE /shift-assignments/:id       # Delete
```

### 9.6 Leave Management

```http
# Leave Types
POST   /leave/types                 # Create
GET    /leave/types                 # List
PUT    /leave/types/:id             # Update
DELETE /leave/types/:id             # Delete

# Leave Requests
POST   /leave/requests              # Create
GET    /leave/requests              # List
PUT    /leave/requests/:id/approve  # Approve
PUT    /leave/requests/:id/reject   # Reject
PUT    /leave/requests/:id/cancel   # Cancel

# Leave Balance
GET    /leave/balance               # Get
PUT    /leave/balance               # Update
```

### 9.7 Messages

```http
POST   /messages                    # Create
GET    /messages/inbox              # Inbox
GET    /messages/sent               # Sent
GET    /messages/unread-count       # Unread count
GET    /messages/:id                # Get
DELETE /messages/:id                # Delete
```

### 9.8 Correspondence

```http
POST   /correspondence              # Create
GET    /correspondence              # List
GET    /correspondence/stats        # Stats
GET    /correspondence/:id          # Get
PUT    /correspondence/:id          # Update
PUT    /correspondence/:id/archive  # Archive
PUT    /correspondence/:id/unarchive # Unarchive
DELETE /correspondence/:id          # Delete
POST   /correspondence/:id/attachments # Add attachment
DELETE /correspondence/attachments/:id # Delete attachment
GET    /correspondence/attachments/:id # Get attachment
```

---

## 10. Notifications API

### 10.1 Notifications

```http
POST   /notifications                    # Create
POST   /notifications/bulk               # Bulk create
GET    /notifications                    # List
GET    /notifications/:id                # Get
GET    /notifications/user/:userId       # Get by user
GET    /notifications/user/:userId/unread-count # Unread count
PUT    /notifications/:id                # Update
PUT    /notifications/:id/read           # Mark as read
PUT    /notifications/user/:userId/read-all # Mark all as read
DELETE /notifications/:id                # Delete
```

### 10.2 Device Tokens

```http
POST   /devices/tokens               # Register token
DELETE /devices/tokens               # Unregister token
```

---

## 11. Platform API (Admin Only)

### 11.1 Platform Users

```http
GET    /platform-users               # List
GET    /platform-users/:id           # Get
PATCH  /platform-users/:id           # Update
DELETE /platform-users/:id           # Delete
PUT    /platform-users/:id/toggle-active  # Toggle active
POST   /platform-users/:id/impersonate    # Impersonate
POST   /platform-users/:id/force-logout   # Force logout
GET    /platform-users/:id/sessions       # Get sessions
```

### 11.2 Platform Organizations

```http
GET    /platform-organizations       # List
GET    /platform-organizations/:id   # Get
POST   /platform-organizations       # Create
PATCH  /platform-organizations/:id   # Update
DELETE /platform-organizations/:id   # Delete
POST   /platform-organizations/:id/suspend   # Suspend
POST   /platform-organizations/:id/activate  # Activate
GET    /platform-organizations/:id/stats     # Stats
GET    /platform-organizations/:id/members   # Members
PATCH  /platform-organizations/:id/subscription # Update subscription
```

### 11.3 Platform Subscriptions

```http
GET    /platform-subscriptions/plans          # List plans
GET    /platform-subscriptions/plans/:id      # Get plan
POST   /platform-subscriptions/plans          # Create plan
PATCH  /platform-subscriptions/plans/:id      # Update plan
DELETE /platform-subscriptions/plans/:id      # Delete plan
```

### 11.4 Platform Options

```http
GET    /platform-options              # All options
GET    /platform-options/plans        # Subscription plans
GET    /platform-options/statuses     # Organization statuses
GET    /platform-options/broadcast-types # Broadcast types
GET    /platform-options/roles        # Platform roles
GET    /platform-options/platform-admin-roles # Admin roles
```

### 11.5 Platform Features

```http
GET    /platform-features             # List
GET    /platform-features/:id         # Get
PATCH  /platform-features/:id         # Update
GET    /platform-features/:id/overrides # Get overrides
POST   /platform-features/:id/overrides # Create override
DELETE /platform-features/:id/overrides/:orgId # Delete override
```

### 11.6 Platform Config

```http
GET    /platform-config               # List all
GET    /platform-config/:key          # Get by key
PATCH  /platform-config               # Update multiple
```

### 11.7 Platform Broadcasts

```http
POST   /platform-broadcasts           # Create
GET    /platform-broadcasts           # List
GET    /platform-broadcasts/:id       # Get
```

### 11.8 Platform Audit Logs

```http
GET    /platform-audit-logs           # List
GET    /platform-audit-logs/:id       # Get
```

### 11.9 Platform Health

```http
GET    /platform-health               # Health check
POST   /platform-health/check         # Manual check
```

---

## 12. Permissions API

### 12.1 Organization Permissions

```http
POST   /permissions                   # Create
GET    /permissions                   # List
DELETE /permissions/:id               # Delete
```

### 12.2 Organization Roles

```http
POST   /roles                         # Create
GET    /roles                         # List
GET    /roles/:id                     # Get
PUT    /roles/:id                     # Update
DELETE /roles/:id                     # Delete
POST   /roles/:id/permissions         # Assign permissions
```

### 12.3 Platform Permissions

```http
POST   /platform-permissions          # Create
GET    /platform-permissions          # List
DELETE /platform-permissions/:id      # Delete
```

### 12.4 Platform Roles

```http
POST   /platform-roles                # Create
GET    /platform-roles                # List
GET    /platform-roles/:id            # Get
PUT    /platform-roles/:id            # Update
DELETE /platform-roles/:id            # Delete
POST   /platform-roles/:id/permissions # Assign permissions
```

### 12.5 API Keys

```http
POST   /api-keys                      # Create
GET    /api-keys                      # List
PATCH  /api-keys/:id/toggle           # Toggle active
DELETE /api-keys/:id                  # Delete
```

### 12.6 Platform API Keys

```http
POST   /platform-api-keys             # Create
GET    /platform-api-keys             # List
PATCH  /platform-api-keys/:id/toggle  # Toggle active
DELETE /platform-api-keys/:id         # Delete
```

---

## 13. Organization Admin API

```http
GET    /org-admin/me                  # Get current org
PUT    /org-admin/me                  # Update org
GET    /org-admin/users               # List users
POST   /org-admin/users               # Create user
PUT    /org-admin/users/:id           # Update user
DELETE /org-admin/users/:id           # Delete user
GET    /org-admin/roles               # List roles
POST   /org-admin/roles               # Create role
PUT    /org-admin/roles/:id           # Update role
DELETE /org-admin/roles/:id           # Delete role
```

---

## 14. Health API

```http
GET    /health                        # Basic health
GET    /health/ready                  # Readiness check
GET    /health/live                   # Liveness check
GET    /health/routes                 # Route listing
```

---

## 15. Total Endpoint Count

| Service | Endpoints |
|---------|-----------|
| Auth Service | 57 |
| Farm Service | 73 |
| Finance Service | 24 |
| HR Service | 53 |
| Notification Service | 12 |
| Organization Service | 7 |
| Platform Service | 55 |
| API Gateway | 4 |
| **Total** | **285** |

---

*This API reference is auto-generated from controller definitions.
For interactive API documentation, integrate Swagger/OpenAPI.*
