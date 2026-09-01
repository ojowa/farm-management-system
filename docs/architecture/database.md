# Database

PostgreSQL 16 with Prisma 6.4.1 ORM. 42 models across 11 domains. All services share a single database.

## Overview

| Property | Value |
|----------|-------|
| Engine | PostgreSQL 16 |
| ORM | Prisma 6.4.1 |
| Connection | `DATABASE_URL` env var |
| Pooling | PgBouncer 1.23.1 (transaction mode) |
| Models | 42 |
| Schema | `packages/database/prisma/schema.prisma` |

## Prisma Commands

```bash
# Push schema to database (dev)
npm run db:push

# Generate Prisma client
npm run db:generate

# Seed demo data
npm run db:seed

# Open Prisma Studio (visual editor)
npm run db:studio

# Reset database (WARNING: deletes all data)
npm run db:push -- --force-reset
```

---

## Identity & Access (10 models)

### Organization

Multi-tenant root entity. Every piece of data belongs to an organization.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | String | |
| slug | String | Unique |
| email | String | |
| phone | String? | |
| logo | String? | |
| website | String? | |
| industry | String? | |
| subscriptionPlanId | String? | FK → SubscriptionPlan |
| subscriptionStatus | String | ACTIVE, SUSPENDED, CANCELLED |
| settings | JSON | Default `{}` |
| createdAt | DateTime | |
| updatedAt | DateTime | |

Has many: users, farms, workers, inventory, expenses, sales, livestock, budgets, roles, featureOverrides.

### User

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String? | FK → Organization (null for SUPER_ADMIN) |
| firstName | String | |
| lastName | String | |
| middleName | String? | |
| email | String | Unique |
| phone | String? | Unique |
| passwordHash | String | bcrypt hash |
| roleId | String | FK → Role |
| avatar | String? | |
| isActive | Boolean | Default true |
| lastLoginAt | DateTime? | |
| twoFactorEnabled | Boolean | Default false |
| twoFactorSecret | String? | TOTP secret |
| notificationPreferences | JSON | Default `{}` |

Belongs to: Organization, Role. Has many: refreshTokens, auditLogs, memberships, sessions, apiKeys.

### Role

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | String | e.g. FARM_MANAGER |
| description | String? | |
| isSystem | Boolean | System roles can't be deleted |
| organizationId | String? | null = global role |

Unique on: `[name, organizationId]`

### Permission

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | String | Unique. e.g. `farm:read` |
| description | String? | |
| category | String | e.g. `Farm Management` |

60+ permissions across: Farm, Crop, Livestock, Poultry, Finance, HR, Notifications, Reports, Admin.

### RolePermission

Composite key: `(roleId, permissionId)`. Many-to-many join table.

### RefreshToken

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| userId | String | FK → User |
| tokenHash | String | Unique, indexed |
| expiresAt | DateTime | |
| revoked | Boolean | |
| replacedByToken | String? | Token rotation |
| deviceInfo | String? | |
| ipAddress | String? | |

### ApiKey

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| userId | String | FK → User |
| name | String | |
| keyPrefix | String | First 8 chars |
| keyHash | String | Hashed API key |
| service | String? | Target service |
| isActive | Boolean | |

### EmailVerification

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| userId | String | FK → User |
| token | String | Unique |
| type | Enum | EMAIL_VERIFICATION, PASSWORD_RESET |
| expiresAt | DateTime | |
| used | Boolean | |

### UserSession

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| userId | String | FK → User |
| app | String | web, admin, console, mobile |
| deviceInfo | JSON | |
| ipAddress | String? | |
| isActive | Boolean | |
| loginAt | DateTime | |
| lastActive | DateTime? | |
| logoutAt | DateTime? | |

---

## Farm Management (3 models)

### Farm

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| name | String | |
| farmType | Enum | CROP, LIVESTOCK, POULTRY, DAIRY, AQUACULTURE |
| location | String? | |
| latitude | Float? | |
| longitude | Float? | |
| size | Float? | |
| status | String | ACTIVE, INACTIVE |

Has many: fields, poultryHouses, flocks, workers, inventory, expenses, sales, livestock, budgets.

### Field

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| farmId | String | FK → Farm |
| name | String | |
| size | Float? | |

Has many: cropCycles.

### Inventory

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| farmId | String? | FK → Farm |
| name | String | |
| category | String | Seeds, Feed, Fertilizer, etc. |
| quantity | Float | |
| unit | String | kg, bags, liters |
| minimumQuantity | Float | Reorder threshold |

---

## Crop Management (7 models)

### Crop

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | String | Maize, Wheat, etc. |

Has many: cropCycles.

### CropCycle

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| fieldId | String | FK → Field |
| cropId | String | FK → Crop |
| plantingDate | DateTime | |
| harvestDate | DateTime? | |
| health | Int | Default 100 (percentage) |
| status | String | growing, harvested, failed |

### CropStage

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| cropCycleId | String | FK → CropCycle |
| stage | Enum | PREPARATION, PLANTING, GROWING, FLOWERING, HARVESTING, POST_HARVEST |
| startDate | DateTime | |
| endDate | DateTime? | |
| notes | String? | |
| createdById | String? | |
| createdByName | String? | |

### YieldRecord

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| cropId | String | FK → Crop |
| cropCycleId | String? | FK → CropCycle |
| quantity | Float | |
| unit | String | kg, tons |
| quality | Enum | GRADE_A, GRADE_B, GRADE_C, PREMIUM |
| harvestedDate | DateTime | |
| notes | String? | |

### PestDiseaseRecord

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| cropCycleId | String? | FK → CropCycle |
| farmId | String? | FK → Farm |
| type | Enum | PEST, DISEASE, WEED, OTHER |
| name | String | |
| severity | Enum | LOW, MEDIUM, HIGH, CRITICAL |
| identifiedDate | DateTime | |
| treatment | String? | |
| treatedDate | DateTime? | |
| outcome | String? | |
| notes | String? | |

### IrrigationSchedule

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| farmId | String? | FK → Farm |
| cropCycleId | String? | FK → CropCycle |
| name | String | |
| frequency | Enum | DAILY, WEEKLY, CUSTOM |
| waterAmount | Float | |
| unit | String | liters, gallons |
| startDate | DateTime | |
| endDate | DateTime? | |
| isActive | Boolean | Default true |
| lastRun | DateTime? | |
| nextRun | DateTime? | |

### IrrigationLog

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| scheduleId | String | FK → IrrigationSchedule |
| farmId | String? | FK → Farm |
| date | DateTime | |
| duration | Float? | minutes |
| waterAmount | Float | |
| unit | String | |
| notes | String? | |
| recordedById | String? | |

---

## Poultry Management (8 models)

### PoultryHouse

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| farmId | String | FK → Farm |
| name | String | |
| capacity | Int | |

Has many: pens.

### Pen

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| poultryHouseId | String | FK → PoultryHouse |
| name | String | |
| capacity | Int | |

Has many: flocks.

### Breed

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | String | |
| birdType | Enum | BROILER, LAYER, DUAL_PURPOSE, COCK, OTHER |

Has many: flocks.

### Flock

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| farmId | String | FK → Farm |
| penId | String? | FK → Pen |
| breedId | String? | FK → Breed |
| batchCode | String | Unique |
| birdCount | Int | |
| currentCount | Int | Updated on mortality |
| arrivalDate | DateTime | |
| currentAgeDays | Int | |
| status | String | active, completed, culled |

Has many: feedingRecords, vaccinationRecords, mortalityRecords, medications.

### FeedingRecord

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| flockId | String | FK → Flock |
| feedType | String | |
| quantityKg | Float | |
| date | DateTime | |

### VaccinationRecord

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| flockId | String | FK → Flock |
| vaccine | String | |
| dosage | String? | |
| date | DateTime | |

### MortalityRecord

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| flockId | String | FK → Flock |
| count | Int | |
| cause | String? | |
| date | DateTime | |

### Medication

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| flockId | String | FK → Flock |
| name | String | |
| dosage | String? | |
| frequency | String? | |
| startDate | DateTime | |
| endDate | DateTime? | |
| notes | String? | |
| status | String | ACTIVE, COMPLETED |

---

## Livestock Management (5 models)

### Livestock

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| farmId | String | FK → Farm |
| species | String | Cattle, Goat, Sheep, etc. |
| breed | String? | |
| gender | String? | |
| birthDate | DateTime? | |
| status | String | active, sold, deceased |

### HealthRecord

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| livestockId | String | FK → Livestock |
| type | Enum | VACCINATION, TREATMENT, CHECKUP, SURGERY, DEWORMING, OTHER |
| date | DateTime | |
| description | String | |
| veterinarian | String? | |
| medications | String? | |
| cost | Float? | |
| nextCheckupDate | DateTime? | |

### VaccinationSchedule

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| livestockId | String | FK → Livestock |
| vaccineName | String | |
| scheduledDate | DateTime | |
| administeredDate | DateTime? | |
| status | Enum | SCHEDULED, ADMINISTERED, MISSED, CANCELLED |

### BreedingRecord

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| sireId | String? | FK → Livestock |
| sireName | String? | |
| damId | String? | FK → Livestock |
| damName | String? | |
| breedingDate | DateTime | |
| expectedDueDate | DateTime? | |
| actualBirthDate | DateTime? | |
| offspringCount | Int? | |
| status | Enum | PLANNED, BRED, CONFIRMED, BORN, FAILED |

### WeightRecord

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| livestockId | String? | FK → Livestock |
| flockId | String? | FK → Flock |
| weight | Float | |
| unit | String | kg, lbs |
| recordedDate | DateTime | |
| notes | String? | |

---

## Finance (5 models)

### Expense

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| farmId | String? | FK → Farm |
| title | String | |
| amount | Float | |
| date | DateTime | |

### Sale

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| farmId | String? | FK → Farm |
| item | String | |
| quantity | Float | |
| price | Float | |
| total | Float | |
| date | DateTime | |

### Budget

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| farmId | String? | FK → Farm |
| name | String | |
| description | String? | |
| startDate | DateTime | |
| endDate | DateTime | |
| status | String | ACTIVE, COMPLETED |

Has many: BudgetCategory.

### BudgetCategory

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| budgetId | String | FK → Budget (cascade delete) |
| name | String | |
| budgetAmount | Float | |
| spentAmount | Float | Default 0 |

### Contract

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| type | Enum | BUY, SELL |
| buyerSellerName | String | |
| entityId | String? | |
| entityType | String? | |
| startDate | DateTime | |
| endDate | DateTime? | |
| value | Float | |
| status | Enum | DRAFT, ACTIVE, COMPLETED, CANCELLED |
| terms | String? | |

---

## Marketplace (2 models)

### Buyer

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| name | String | |
| contactPerson | String? | |
| email | String? | |
| phone | String? | |
| address | String? | |
| type | Enum | INDIVIDUAL, COMPANY, COOPERATIVE |
| notes | String? | |

### MarketListing

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| buyerId | String? | FK → Buyer (SetNull on delete) |
| entityType | String | |
| entityId | String | |
| title | String | |
| price | Float | |
| unit | String | |
| quantity | Float | |
| status | String | |
| listedDate | DateTime | |
| soldDate | DateTime? | |

---

## HR & Workforce (10 models)

### Worker

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| farmId | String? | FK → Farm |
| userId | String? | FK → User (linked account) |
| firstName | String | |
| middleName | String? | |
| lastName | String | |
| email | String? | |
| phone | String? | |
| position | String | |
| department | String? | |
| hireDate | DateTime | |
| status | String | ACTIVE, INACTIVE |

### Task

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| farmId | String? | FK → Farm |
| title | String | |
| description | String? | |
| priority | String | LOW, MEDIUM (default), HIGH, URGENT |
| status | String | PENDING (default), IN_PROGRESS, COMPLETED, CANCELLED |
| assignedToId | String? | |
| assignedToName | String? | |
| createdById | String? | |
| createdByName | String? | |
| dueDate | DateTime? | |
| completedAt | DateTime? | |

### Attendance

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| workerId | String | FK → Worker |
| workerName | String | |
| date | DateTime | |
| status | Enum | PRESENT, ABSENT, LATE, HALF_DAY, ON_LEAVE |
| clockIn | DateTime? | |
| clockOut | DateTime? | |
| hoursWorked | Float? | |
| notes | String? | |

Unique on: `[workerId, date]`

### LeaveType

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| name | String | Annual, Sick, Maternity, etc. |
| daysPerYear | Int | |
| isPaid | Boolean | |
| isActive | Boolean | |

### LeaveRequest

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| userId | String | FK → User |
| leaveTypeId | String | FK → LeaveType (cascade delete) |
| startDate | DateTime | |
| endDate | DateTime | |
| days | Int | |
| reason | String? | |
| status | String | PENDING (default), APPROVED, REJECTED |
| approvedById | String? | |
| approvedAt | DateTime? | |
| rejectionReason | String? | |

### LeaveBalance

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| userId | String | FK → User |
| leaveTypeId | String | FK → LeaveType |
| year | Int | |
| totalDays | Int | |
| usedDays | Int | Default 0 |

Unique on: `[userId, leaveTypeId, year]`

### Shift

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| name | String | |
| startTime | String | e.g. "08:00" |
| endTime | String | e.g. "16:00" |
| color | String? | UI display color |
| isActive | Boolean | |

### ShiftAssignment

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| shiftId | String | FK → Shift (cascade delete) |
| userId | String | FK → User |
| date | DateTime | |
| notes | String? | |

Unique on: `[shiftId, userId, date]`

### Message

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| senderId | String | |
| senderName | String | |
| subject | String | |
| body | String | |
| priority | Enum | LOW, NORMAL, HIGH, URGENT |

Has many: MessageRecipient.

### MessageRecipient

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| messageId | String | FK → Message (cascade delete) |
| recipientId | String | |
| recipientName | String | |
| organizationId | String | FK → Organization |
| isRead | Boolean | Default false |
| readAt | DateTime? | |

---

## Correspondence (2 models)

### Correspondence

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| referenceNumber | String | Unique |
| title | String | |
| type | Enum | INCOMING, OUTGOING, INTERNAL |
| category | Enum | MEMO, LETTER, REPORT, NOTICE, OTHER |
| from | String? | |
| to | String? | |
| content | String | |
| status | Enum | DRAFT, SENT, RECEIVED, ARCHIVED |
| priority | String | |
| receivedDate | DateTime | |
| createdById | String? | |
| createdByName | String? | |
| archivedAt | DateTime? | |

### CorrespondenceAttachment

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| correspondenceId | String | FK → Correspondence (cascade delete) |
| fileName | String | |
| fileSize | Int | |
| fileUrl | String | |
| fileType | String | |
| uploadedById | String? | |
| organizationId | String | FK → Organization |

---

## Notifications & Files (3 models)

### Notification

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| userId | String | FK → User |
| title | String | |
| message | String | |
| type | String | INFO (default), WARNING, ERROR, SUCCESS |
| link | String? | Deep link |
| entityType | String? | |
| entityId | String? | |
| read | Boolean | Default false |

### DeviceToken

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| userId | String | FK → User |
| token | String | Expo push token |
| platform | String | web, ios, android |
| active | Boolean | |

Unique on: `[userId, token]`

### Document

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| name | String | |
| type | Enum | IMAGE, PDF, SPREADSHEET, DOCUMENT, OTHER |
| entityId | String? | Linked entity |
| entityType | String? | |
| uploadedById | String? | |
| uploadedByName | String? | |
| fileSize | Int? | bytes |
| mimeType | String? | |
| url | String | |

---

## Platform Administration (6 models)

### AuditLog

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| userId | String? | FK → User |
| organizationId | String? | FK → Organization |
| action | String | CREATE, UPDATE, DELETE, LOGIN, etc. |
| entity | String | User, Farm, Crop, etc. |
| entityId | String? | |
| metadata | JSON | |
| ipAddress | String? | |
| userAgent | String? | |

### SyncQueue

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| entity | String | |
| entityId | String | |
| operation | String | CREATE, UPDATE, DELETE |
| payload | JSON | |
| synced | Boolean | Default false |

### FeatureFlag

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| key | String | Unique. e.g. `weather_module` |
| name | String | Display name |
| description | String? | |
| category | String? | |
| defaultValue | Boolean | Default true |
| isEnabled | Boolean | Global toggle |

Has many: FeatureFlagOverride.

### FeatureFlagOverride

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| featureFlagId | String | FK → FeatureFlag (cascade delete) |
| organizationId | String | FK → Organization (cascade delete) |
| isEnabled | Boolean | |

Unique on: `[featureFlagId, organizationId]`

### SubscriptionPlan

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | String | Unique. e.g. `basic` |
| displayName | String | |
| description | String? | |
| price | Float | |
| currency | String | USD |
| billingCycle | String | monthly, yearly |
| maxUsers | Int | |
| maxFarms | Int | |
| maxStorage | Int | GB |
| features | JSON | Feature limits |
| isActive | Boolean | |
| sortOrder | Int | |

Has many: Organization.

### SystemHealth

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| serviceName | String | Unique |
| status | String | healthy, degraded, down |
| uptime | Float? | seconds |
| memoryUsage | JSON? | |
| lastCheck | DateTime | |
| metadata | JSON? | |

### Broadcast

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| title | String | |
| message | String | |
| type | String | info, warning, maintenance |
| targetOrgs | String[] | Empty = all orgs |
| isActive | Boolean | |
| startsAt | DateTime? | |
| expiresAt | DateTime? | |
| createdById | String? | |

### PlatformConfig

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| key | String | Unique |
| value | JSON | |
| description | String? | |
| category | String? | |

---

## Equipment (2 models)

### Equipment

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| farmId | String? | FK → Farm |
| name | String | |
| type | Enum | TRACTOR, HARVESTER, IRRIGATION, VEHICLE, TOOL, OTHER |
| model | String? | |
| serialNumber | String? | |
| purchaseDate | DateTime? | |
| purchaseCost | Float? | |
| status | String | operational, maintenance, retired |
| lastMaintenance | DateTime? | |
| nextMaintenance | DateTime? | |
| notes | String? | |

### MaintenanceRecord

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organizationId | String | FK → Organization |
| equipmentId | String | FK → Equipment (cascade delete) |
| type | Enum | SCHEDULED, REPAIR, INSPECTION, OTHER |
| date | DateTime | |
| cost | Float? | |
| description | String? | |
| performedBy | String? | |
