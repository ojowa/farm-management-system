# Data Management & Models

**Document Classification:** Internal — Confidential
**Version:** 1.0 | **Date:** July 2026

---

## 1. Database Overview

| Aspect | Detail |
|--------|--------|
| **Engine** | PostgreSQL 16 |
| **ORM** | Prisma 6.19.3 |
| **Connection pooling** | PgBouncer 1.23.1 (transaction mode, 200 max clients) |
| **Schema** | Shared across all 13 services |
| **Models** | 42 Prisma models |
| **Isolation** | Row-level via `organizationId` on every table |

---

## 2. Entity-Relationship Summary

### 2.1 Identity & Access (10 models)

```
Organization ──< User ──< Role ──< RolePermission >── Permission
     │                │
     │                ├──< RefreshToken
     │                ├──< ApiKey
     │                ├──< UserSession
     │                └──< EmailVerification
     │
     └──< FeatureFlagOverride
```

| Model | Key Fields | Relationships |
|-------|-----------|---------------|
| **Organization** | name, slug, subscriptionPlan, subscriptionStatus, maxUsers, maxFarms | Has many Users, Farms, FeatureFlagOverrides |
| **User** | email, passwordHash, roleId, organizationId, isPlatformAdmin, mfaEnabled | Belongs to Organization, Role; Has many RefreshTokens, Sessions |
| **Role** | name (enum: 8 values), description | Has many Users, RolePermissions |
| **Permission** | name (e.g., `farm:read`), description, resource, action | Has many RolePermissions |
| **RolePermission** | roleId, permissionId | Join table (many-to-many) |
| **RefreshToken** | tokenHash, userId, expiresAt, revokedAt | Belongs to User; 30-day expiry, rotation |
| **ApiKey** | keyHash, userId, name, permissions, expiresAt | Belongs to User |
| **EmailVerification** | email, token, type, expiresAt | Verification and password reset |
| **UserSession** | userId, app, deviceInfo, ipAddress, expiresAt | Cross-app session tracking |
| **UserOrganization** | userId, organizationId, isDefault | Multi-org membership |

### 2.2 Farm Management (3 models)

```
Organization ──< Farm ──< Field
                    │
                    └──< Inventory
```

| Model | Key Fields | Relationships |
|-------|-----------|---------------|
| **Farm** | name, type (CROP/LIVESTOCK/POULTRY/DAIRY/AQUACULTURE), size, unit, latitude, longitude, organizationId | Has many Fields, Inventories |
| **Field** | name, farmId, size, unit, soilType, irrigationType | Belongs to Farm |
| **Inventory** | name, farmId, category, quantity, unit, reorderThreshold | Belongs to Farm |

### 2.3 Crop Management (7 models)

```
Crop ──< CropCycle ──< CropStage
           │
           ├──< YieldRecord
           ├──< PestDiseaseRecord
           └──< IrrigationSchedule ──< IrrigationLog
```

| Model | Key Fields | Relationships |
|-------|-----------|---------------|
| **Crop** | name, type, description, organizationId | Has many CropCycles |
| **CropCycle** | cropId, fieldId, plantingDate, harvestDate, health, status | Belongs to Crop, Field |
| **CropStage** | cropCycleId, stage, startDate, endDate, notes | Belongs to CropCycle |
| **YieldRecord** | cropCycleId, quantity, unit, quality (GRADE_A—PREMIUM), date | Belongs to CropCycle |
| **PestDiseaseRecord** | cropCycleId, type (PEST/DISEASE/WEED), severity (LOW—CRITICAL), date | Belongs to CropCycle |
| **IrrigationSchedule** | cropCycleId, frequency, waterAmount, dayOfWeek | Belongs to CropCycle |
| **IrrigationLog** | scheduleId, executedAt, amount, notes | Belongs to IrrigationSchedule |

### 2.4 Poultry Management (8 models)

```
PoultryHouse ──< Pen ──< Flock
                    │
                    ├──< FeedingRecord
                    ├──< VaccinationRecord
                    ├──< MortalityRecord
                    └──< Medication
Breed ──< Flock
```

| Model | Key Fields | Relationships |
|-------|-----------|---------------|
| **PoultryHouse** | name, capacity, houseType, organizationId | Has many Pens |
| **Pen** | name, houseId, capacity, currentCount | Belongs to House |
| **Breed** | name, type (BROILER/LAYER/DUAL_PURPOSE/COCK/OTHER), description | Has many Flocks |
| **Flock** | batchCode, breedId, penId, birdCount, currentCount, startDate, status | Belongs to Breed, Pen |
| **FeedingRecord** | flockId, feedType, quantity, date, notes | Belongs to Flock |
| **VaccinationRecord** | flockId, vaccineName, dosage, date, veterinarian | Belongs to Flock |
| **MortalityRecord** | flockId, count, cause, date | Belongs to Flock; decrements `currentCount` |
| **Medication** | flockId, name, dosage, frequency, startDate, endDate, status | Belongs to Flock |

### 2.5 Livestock Management (5 models)

```
Livestock ──< HealthRecord
         ├──< BreedingRecord
         ├──< WeightRecord
         └──< VaccinationSchedule
```

| Model | Key Fields | Relationships |
|-------|-----------|---------------|
| **Livestock** | species, breed, tagNumber, gender, birthDate, status (ACTIVE/SOLD/DECEASED) | Has many HealthRecords, BreedingRecords, WeightRecords |
| **HealthRecord** | livestockId, type (VACCINATION/TREATMENT/CHECKUP/SURGERY/DEWORMING), date, notes | Belongs to Livestock |
| **BreedingRecord** | livestockId, sireId, damId, breedingDate, expectedDueDate, status | Belongs to Livestock |
| **WeightRecord** | livestockId, weight, unit (KG/LBS), date | Belongs to Livestock |
| **VaccinationSchedule** | livestockId, vaccineName, dueDate, status (SCHEDULED/ADMINISTERED/MISSED/CANCELLED) | Belongs to Livestock |

### 2.6 Finance (5 models + 2 Marketplace)

```
Expense ── Finance (scope: organizationId)
Sale ── Finance
Budget ──< BudgetCategory
Contract
MarketListing
Buyer ──< MarketListing
```

| Model | Key Fields | Relationships |
|-------|-----------|---------------|
| **Expense** | title, amount, date, category, farmId, organizationId | Scoped to org |
| **Sale** | item, quantity, price, total, date, farmId, organizationId | Scoped to org |
| **Budget** | name, startDate, endDate, totalAmount, status, organizationId | Has many BudgetCategories |
| **BudgetCategory** | budgetId, name, budgetedAmount, spentAmount | Belongs to Budget |
| **Contract** | title, type (BUY/SELL), value, startDate, endDate, status, organizationId | Scoped to org |
| **Buyer** | name, type (INDIVIDUAL/COMPANY/COOPERATIVE), contactInfo, organizationId | Has many MarketListings |
| **MarketListing** | entityType, entityId, title, price, quantity, status, organizationId | Polymorphic entity link |

### 2.7 HR & Workforce (10 models)

```
Worker ── Attendance
     ├──< Task
     └──< LeaveRequest ── LeaveType ──< LeaveBalance

Shift ──< ShiftAssignment

Message ──< MessageRecipient

Correspondence ──< CorrespondenceAttachment
```

| Model | Key Fields | Relationships |
|-------|-----------|---------------|
| **Worker** | firstName, lastName, position, department, hireDate, userId | Belongs to User |
| **Task** | title, description, priority (LOW—URGENT), status (PENDING—CANCELLED), assigneeId | Belongs to User |
| **Attendance** | userId, date, clockIn, clockOut, status (PRESENT/ABSENT/LATE/HALF_DAY/ON_LEAVE) | Unique on user+date |
| **LeaveType** | name, daysPerYear, organizationId | Has many LeaveRequests, LeaveBalances |
| **LeaveRequest** | userId, leaveTypeId, startDate, endDate, status (PENDING/APPROVED/REJECTED) | Belongs to User, LeaveType |
| **LeaveBalance** | userId, leaveTypeId, year, used, remaining | Belongs to User, LeaveType |
| **Shift** | name, startTime, endTime, organizationId | Has many ShiftAssignments |
| **ShiftAssignment** | shiftId, userId, date | Belongs to Shift, User |
| **Message** | senderId, subject, body, priority, organizationId | Has many MessageRecipients |
| **MessageRecipient** | messageId, recipientId, readAt | Belongs to Message, User |

### 2.8 Notifications & Files (3 models)

```
Notification ── User
DeviceToken ── User
Document ── (polymorphic: entityType + entityId)
```

### 2.9 Platform Administration (6+ models)

```
AuditLog ── (all mutations)
SyncQueue ── (offline data sync)
FeatureFlag ──< FeatureFlagOverride
SubscriptionPlan
SystemHealth
Broadcast
PlatformConfig
```

---

## 3. Multi-Tenancy Strategy

### 3.1 Tenant Isolation

Every model (except `Organization`, `Role`, `Permission`) has an `organizationId`
field. All queries are filtered by this field via middleware.

```
Gateway sets: x-organization-id header
     ↓
Service reads: req.headers['x-organization-id']
     ↓
Prisma query: { where: { organizationId: orgId } }
```

### 3.2 RLS (Row-Level Security)

PostgreSQL RLS policies enforce tenant isolation at the database level:

```sql
-- Example: farm data is scoped to organization
CREATE POLICY farm_isolation ON farms
  USING (organization_id = current_setting('app.current_organization_id')::uuid);
```

### 3.3 Tenant Bypass

- `SUPER_ADMIN` — Bypasses all tenant isolation (platform-wide queries)
- `SUPPORT_ADMIN` — Bypasses tenant isolation for support operations
- Service tokens (`SERVICE_SECRET`) — Short-lived (30s) for gateway-to-service trust

---

## 4. Business Rules

### 4.1 Poultry

- Mortality count cannot exceed `flock.currentCount`
- Deletion of mortality record increments `currentCount` back
- Batch code uniqueness enforced per organisation

### 4.2 Crops

- `CropCycle` requires valid field and crop references
- Crop health computed from cycle state (0–100%)
- Crop status derived from planting/harvest dates

### 4.3 Finance

- Sale total = quantity × price (auto-calculated)
- Contract value must be > 0
- Budget categories cascade delete with parent budget

### 4.4 HR

- Clock-in after 09:00 = LATE status
- Hours worked = clockOut − clockIn
- Leave days exclude Sundays
- Attendance unique on worker + date combination
- Leave balance enforcement (cannot exceed allocation)

### 4.5 Subscriptions

| Plan | Users | Farms | Storage |
|------|-------|-------|---------|
| FREE | 3 | 1 | 100 MB |
| BASIC | 10 | 3 | 500 MB |
| PRO | 50 | 20 | 5 GB |
| ENTERPRISE | Unlimited | Unlimited | 50 GB |

Subscription states: `TRIAL → ACTIVE → PAST_DUE → SUSPENDED → CANCELLED`

---

*For the full Prisma schema, see `prisma/schema.prisma` in the repository.
For the API endpoints, see [API Reference](./10-API-REFERENCE.md).*
