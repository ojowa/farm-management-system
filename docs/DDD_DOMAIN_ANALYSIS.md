# DDD Domain Analysis - Phase 1

## Bounded Context Map

### 1. Identity & Access Context
**Owner:** auth-service (Port 4001)
**Responsibility:** Authentication, authorization, user management, organization membership, RBAC, API keys

#### Aggregate Roots
| Aggregate Root | Entity | Identity | Key Invariants |
|---------------|--------|----------|----------------|
| **User** | User | UUID | Email/phone uniqueness, password hash required, role must exist |
| **Organization** | Organization | UUID | Slug uniqueness, email uniqueness |
| **Role** | Role | UUID | Name unique per org, system roles cannot be deleted |
| **Permission** | Permission | UUID | Name uniqueness |
| **ApiKey** | ApiKey | UUID | Key hash uniqueness, belongs to a user |

#### Value Objects
- **Email** (validated format, unique)
- **Phone** (validated format, unique)
- **Password** (hashed, min 8 chars)
- **JwtToken** (access token: 15min, refresh token: 7 days)
- **TotpSecret** (2FA TOTP secret)
- **UserRole** (ORGANIZATION_OWNER, FARM_MANAGER, SUPERVISOR, WORKER, SUPER_ADMIN, SUPPORT_ADMIN)

#### Domain Events
| Event | Trigger | Payload |
|-------|---------|---------|
| `user.registered` | New user registration | userId, email, organizationId |
| `user.login` | Successful login | userId, sessionId, timestamp |
| `user.logout` | Logout | userId, sessionId |
| `user.role.changed` | Role assignment/revocation | userId, oldRole, newRole |
| `user.org.switched` | Organization context switch | userId, oldOrgId, newOrgId |
| `user.2fa.enabled` | 2FA enabled | userId |
| `user.2fa.disabled` | 2FA disabled | userId |
| `org.created` | New organization | orgId, name, slug |
| `org.subscription.changed` | Subscription plan changed | orgId, oldPlan, newPlan |
| `apikey.created` | API key created | userId, keyId, keyPrefix |
| `apikey.revoked` | API key deleted/revoked | userId, keyId |

#### Repository Interfaces
- `UserRepository` (findByEmail, findByPhone, create, update, softDelete)
- `OrganizationRepository` (findBySlug, create, update, delete)
- `RoleRepository` (findByName, create, update, delete, findByOrg)
- `PermissionRepository` (findByName, create, delete)
- `RefreshTokenRepository` (create, findValid, revoke, revokeAll)
- `ApiKeyRepository` (findByPrefix, create, toggle, delete)

#### Cross-Context Dependencies
- **Upstream:** None (this is the identity authority)
- **Downstream:** All other contexts depend on this for user/org validation

---

### 2. Farm Management Context
**Owner:** farm-service (Port 4002)
**Responsibility:** Farm and field management, geo-location, import/export

#### Aggregate Roots
| Aggregate Root | Entity | Identity | Key Invariants |
|---------------|--------|----------|----------------|
| **Farm** | Farm | UUID | Name required, organizationId required, valid farmType |
| **Field** | Field | UUID | Must belong to a valid farm, size > 0 |

#### Value Objects
- **FarmType** (CROP, LIVESTOCK, POULTRY, DAIRY, AQUACULTURE)
- **Location** (latitude, longitude, address string)
- **GeoCoordinates** (lat: -90 to 90, lng: -180 to 180)
- **FarmSize** (Float, hectares/acres)

#### Domain Events
| Event | Trigger | Payload |
|-------|---------|---------|
| `farm.created` | Farm created | farmId, name, farmType, organizationId |
| `farm.updated` | Farm updated | farmId, changes |
| `farm.deleted` | Farm deleted | farmId, organizationId |
| `field.created` | Field created | fieldId, farmId, name |
| `field.updated` | Field updated | fieldId, changes |
| `field.deleted` | Field deleted | fieldId, farmId |

#### Repository Interfaces
- `FarmRepository` (findById, findByOrg, create, update, delete, findLocations)
- `FieldRepository` (findById, findByFarm, create, update, delete)

#### Cross-Context Dependencies
- **Upstream:** Identity & Access (user/org validation)
- **Downstream:** Crop Management (fields used for crop cycles), Finance (farm validation for expenses/sales), Livestock (farm reference)

---

### 3. Crop Management Context
**Owner:** crop-service (Port 4011)
**Responsibility:** Crop types, crop cycles, growth stages, irrigation, pest/disease, yield tracking

#### Aggregate Roots
| Aggregate Root | Entity | Identity | Key Invariants |
|---------------|--------|----------|----------------|
| **Crop** | Crop | UUID | Name required |
| **CropCycle** | CropCycle | UUID | Must reference valid field and crop, plantingDate required |
| **IrrigationSchedule** | IrrigationSchedule | UUID | Must reference valid farm, frequency valid |
| **PestDiseaseRecord** | PestDiseaseRecord | UUID | Must reference valid farm, type valid, severity valid |
| **YieldRecord** | YieldRecord | UUID | Must reference valid crop, quantity > 0 |

#### Value Objects
- **CropStageType** (PREPARATION, PLANTING, GERMINATION, GROWING, FLOWERING, FRUITING, HARVESTING, POST_HARVEST)
- **CropStatus** (growing, harvested, failed)
- **IrrigationFrequency** (DAILY, WEEKLY, CUSTOM)
- **PestDiseaseType** (PEST, DISEASE, WEED, OTHER)
- **Severity** (LOW, MEDIUM, HIGH, CRITICAL)
- **YieldQuality** (GRADE_A, GRADE_B, GRADE_C, PREMIUM)

#### Domain Events
| Event | Trigger | Payload |
|-------|---------|---------|
| `crop.created` | Crop type created | cropId, name |
| `crop.updated` | Crop type updated | cropId, changes |
| `crop.deleted` | Crop type deleted | cropId |
| `crop.planted` | Crop cycle started | cropCycleId, fieldId, cropId, plantingDate |
| `crop.harvested` | Crop cycle harvested | cropCycleId, yield |
| `irrigation.scheduled` | Irrigation scheduled | scheduleId, farmId, frequency |
| `irrigation.logged` | Irrigation executed | logId, scheduleId, waterAmount |
| `pest.identified` | Pest/disease found | recordId, farmId, type, severity |
| `yield.recorded` | Yield harvested | yieldId, cropId, quantity |

#### Repository Interfaces
- `CropRepository` (findById, create, update, delete)
- `CropCycleRepository` (findById, findByField, findByCrop, create, update, delete)
- `CropStageRepository` (findByCycle, create, update, delete)
- `IrrigationScheduleRepository` (findById, findByFarm, create, update, delete)
- `IrrigationLogRepository` (findBySchedule, create)
- `PestDiseaseRepository` (findById, findByFarm, findActive, create, update, delete)
- `YieldRepository` (findByCrop, findByCycle, create)

#### Cross-Context Dependencies
- **Upstream:** Farm Management (field validation), Identity & Access (user/org validation)
- **Downstream:** Finance (yield data for profitability), Reporting (crop reports)

---

### 4. Livestock Management Context
**Owner:** livestock-service (Port 4003)
**Responsibility:** Livestock tracking, health records, breeding, weight/growth

#### Aggregate Roots
| Aggregate Root | Entity | Identity | Key Invariants |
|---------------|--------|----------|----------------|
| **Livestock** | Livestock | UUID | Must reference valid farm, species required, gender valid, birthDate required |
| **HealthRecord** | HealthRecord | UUID | Must reference valid livestock, type valid, date required |
| **VaccinationSchedule** | VaccinationSchedule | UUID | Must reference valid livestock, scheduledDate required |
| **BreedingRecord** | BreedingRecord | UUID | Sire and dam must be valid livestock, breedingDate required |
| **WeightRecord** | WeightRecord | UUID | Must reference livestock or flock, weight > 0 |

#### Value Objects
- **LivestockSpecies** (CATTLE, GOAT, SHEEP, PIG, etc.)
- **LivestockGender** (MALE, FEMALE)
- **LivestockStatus** (ACTIVE, SOLD, DECEASED, etc.)
- **HealthRecordType** (VACCINATION, TREATMENT, CHECKUP, SURGERY, DEWORMING, OTHER)
- **BreedingStatus** (PLANNED, BRED, CONFIRMED, BORN, FAILED)
- **VaccinationStatus** (SCHEDULED, ADMINISTERED, MISSED, CANCELLED)

#### Domain Events
| Event | Trigger | Payload |
|-------|---------|---------|
| `livestock.created` | Livestock registered | livestockId, farmId, species, breed |
| `livestock.updated` | Livestock updated | livestockId, changes |
| `livestock.deleted` | Livestock removed | livestockId, farmId |
| `livestock.health.recorded` | Health event | healthRecordId, livestockId, type |
| `livestock.vaccination.scheduled` | Vaccination scheduled | vaccinationId, livestockId, scheduledDate |
| `livestock.vaccination.administered` | Vaccination given | vaccinationId, livestockId |
| `livestock.breeding.recorded` | Breeding recorded | breedingId, sireId, damId |
| `livestock.breeding.born` | Offspring born | breedingId, offspringCount |
| `livestock.weight.recorded` | Weight measured | weightId, livestockId, weight |

#### Repository Interfaces
- `LivestockRepository` (findById, findByFarm, create, update, delete)
- `HealthRecordRepository` (findByLivestock, create)
- `VaccinationScheduleRepository` (findByLivestock, findOverdue, create, update)
- `BreedingRecordRepository` (findByStatus, findUpcoming, create, update)
- `WeightRecordRepository` (findByLivestock, create)

#### Cross-Context Dependencies
- **Upstream:** Farm Management (farm validation), Identity & Access (user/org validation)
- **Downstream:** Finance (livestock sales), Reporting (livestock health reports)

---

### 5. Poultry Management Context
**Owner:** poultry-service (Port 4004)
**Responsibility:** Poultry houses, pens, breeds, flocks, feeding, vaccination, mortality, medications

#### Aggregate Roots
| Aggregate Root | Entity | Identity | Key Invariants |
|---------------|--------|----------|----------------|
| **PoultryHouse** | PoultryHouse | UUID | Must reference valid farm, capacity > 0 |
| **Pen** | Pen | UUID | Must reference valid poultry house, capacity > 0 |
| **Breed** | Breed | UUID | Name required, birdType required |
| **Flock** | Flock | UUID | Must reference valid pen, breed, and farm; birdCount > 0; arrivalDate required; unique batchCode |
| **FeedingRecord** | FeedingRecord | UUID | Must reference valid flock, quantityKg > 0, date required |
| **VaccinationRecord** | VaccinationRecord | UUID | Must reference valid flock, vaccine name required, date required |
| **MortalityRecord** | MortalityRecord | UUID | Must reference valid flock, count > 0, must not exceed flock currentCount |
| **Medication** | Medication | UUID | Must reference valid flock, name/dosage/frequency required |

#### Value Objects
- **BirdType** (BROILER, LAYER, etc.)
- **FlockStatus** (ACTIVE, SOLD, etc.)
- **MortalityCount** (validated: <= flock.currentCount)

#### Domain Events
| Event | Trigger | Payload |
|-------|---------|---------|
| `poultry.house.created` | House created | poultryHouseId, farmId |
| `poultry.pen.created` | Pen created | penId, poultryHouseId |
| `poultry.breed.created` | Breed created | breedId, name |
| `poultry.flock.created` | Flock arrived | flockId, batchCode, birdCount, farmId |
| `poultry.flock.updated` | Flock updated | flockId, changes |
| `poultry.flock.sold` | Flock sold | flockId, birdCount |
| `poultry.feeding.recorded` | Feed given | feedingRecordId, flockId, feedType, quantity |
| `poultry.vaccination.recorded` | Vaccination done | vaccinationRecordId, flockId, vaccine |
| `poultry.mortality.recorded` | Mortality recorded | mortalityRecordId, flockId, count |
| `poultry.medication.administered` | Medication given | medicationId, flockId, name |

#### Key Business Logic
- **Mortality invariant:** When mortality recorded, flock.currentCount is decremented. Count cannot exceed currentCount.
- **Mortality rollback:** When mortality record deleted, flock.currentCount is incremented back.

#### Repository Interfaces
- `PoultryHouseRepository` (findById, findByFarm, create, update, delete)
- `PenRepository` (findById, findByHouse, create, update, delete)
- `BreedRepository` (findById, findByName, create, update, delete)
- `FlockRepository` (findById, findByFarm, findByBatchCode, create, update, delete)
- `FeedingRecordRepository` (findByFlock, create)
- `VaccinationRecordRepository` (findByFlock, create)
- `MortalityRecordRepository` (findByFlock, create, delete)
- `MedicationRepository` (findByFlock, create, update, delete)

#### Cross-Context Dependencies
- **Upstream:** Farm Management (farm validation), Identity & Access (user/org validation)
- **Downstream:** Finance (poultry sales), Reporting (poultry reports)

---

### 6. Finance Context
**Owner:** finance-service (Port 4006)
**Responsibility:** Expenses, sales, contracts, marketplace, profitability analysis

#### Aggregate Roots
| Aggregate Root | Entity | Identity | Key Invariants |
|---------------|--------|----------|----------------|
| **Expense** | Expense | UUID | Must reference valid farm, amount > 0, date required |
| **Sale** | Sale | UUID | Must reference valid farm, quantity > 0, price > 0, total = quantity * price |
| **Contract** | Contract | UUID | startDate required, value > 0, type valid (BUY/SELL) |
| **Buyer** | Buyer | UUID | Name required |
| **MarketListing** | MarketListing | UUID | entityType valid, price > 0, quantity > 0 |

#### Value Objects
- **Money** (amount: Float, currency: USD default)
- **ContractType** (BUY, SELL)
- **ContractStatus** (DRAFT, ACTIVE, COMPLETED, CANCELLED)
- **BuyerType** (INDIVIDUAL, COMPANY, COOPERATIVE)
- **ListingStatus** (ACTIVE, SOLD, CANCELLED)
- **ExpenseCategory** (Feed, Labor, Medicine, Equipment, Inputs, Transport, Water, Rent, Other - keyword based)

#### Domain Events
| Event | Trigger | Payload |
|-------|---------|---------|
| `finance.expense.created` | Expense recorded | expenseId, farmId, amount, category |
| `finance.expense.updated` | Expense updated | expenseId, changes |
| `finance.expense.deleted` | Expense removed | expenseId, farmId |
| `finance.sale.created` | Sale recorded | saleId, farmId, amount, item |
| `finance.sale.updated` | Sale updated | saleId, changes |
| `finance.sale.deleted` | Sale removed | saleId, farmId |
| `finance.contract.created` | Contract created | contractId, type, value |
| `finance.contract.status_changed` | Contract status changed | contractId, oldStatus, newStatus |
| `finance.listing.created` | Marketplace listing | listingId, entityType, price |
| `finance.listing.sold` | Listing sold | listingId, buyerId, amount |

#### Repository Interfaces
- `ExpenseRepository` (findById, findByOrg, findByFarm, create, update, delete)
- `SaleRepository` (findById, findByOrg, findByFarm, create, update, delete)
- `ContractRepository` (findById, findByOrg, create, update, delete)
- `BuyerRepository` (findById, findByOrg, create, update, delete)
- `MarketListingRepository` (findById, findByOrg, create, update, delete)

#### Cross-Context Dependencies
- **Upstream:** Farm Management (farm validation), Identity & Access (user/org validation)
- **Downstream:** Reporting (financial reports, profitability analysis)

---

### 7. HR & Workforce Context
**Owner:** hr-service (Port 4012) + worker-service (Port 4007)
**Responsibility:** Workers, attendance, tasks, shifts, leave, messaging, correspondence

#### Aggregate Roots
| Aggregate Root | Entity | Identity | Key Invariants |
|---------------|--------|----------|----------------|
| **Worker** | Worker | UUID | Must reference valid farm, name/role required |
| **Attendance** | Attendance | UUID | Must reference valid worker, date required, unique worker+date |
| **Task** | Task | UUID | organizationId required, title required, valid priority/status |
| **Shift** | Shift | UUID | Name unique per org, startTime/endTime valid |
| **ShiftAssignment** | ShiftAssignment | UUID | Must reference valid shift, userId required, date required, unique shift+user+date |
| **LeaveType** | LeaveType | UUID | Name unique per org, daysPerYear >= 0 |
| **LeaveRequest** | LeaveRequest | UUID | Must reference valid user and leaveType, startDate <= endDate, days > 0 |
| **LeaveBalance** | LeaveBalance | UUID | Must reference valid user and leaveType, year required, unique user+type+year |
| **Message** | Message | UUID | senderId required, subject/body required |
| **Correspondence** | Correspondence | UUID | referenceNumber unique, type valid, title required |

#### Value Objects
- **AttendanceStatus** (PRESENT, ABSENT, LATE, HALF_DAY, ON_LEAVE)
- **TaskPriority** (LOW, MEDIUM, HIGH, URGENT)
- **TaskStatus** (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
- **LeaveStatus** (PENDING, APPROVED, REJECTED, CANCELLED)
- **MessagePriority** (LOW, NORMAL, HIGH, URGENT)
- **CorrespondenceType** (INCOMING, OUTGOING, INTERNAL)
- **CorrespondenceCategory** (MEMO, LETTER, REPORT, NOTICE, OTHER)
- **CorrespondenceStatus** (DRAFT, SENT, RECEIVED, ARCHIVED)

#### Domain Events
| Event | Trigger | Payload |
|-------|---------|---------|
| `hr.attendance.clocked_in` | Worker clocked in | attendanceId, workerId, time |
| `hr.attendance.clocked_out` | Worker clocked out | attendanceId, workerId, hoursWorked |
| `hr.task.created` | Task assigned | taskId, assignedToId, priority |
| `hr.task.completed` | Task completed | taskId, completedAt |
| `hr.task.status_changed` | Task status changed | taskId, oldStatus, newStatus |
| `hr.leave.requested` | Leave requested | leaveRequestId, userId, leaveType, days |
| `hr.leave.approved` | Leave approved | leaveRequestId, userId, approvedById |
| `hr.leave.rejected` | Leave rejected | leaveRequestId, userId, rejectionReason |
| `hr.message.sent` | Message sent | messageId, senderId, recipientIds |
| `hr.correspondence.created` | Correspondence created | correspondenceId, type, referenceNumber |

#### Key Business Logic
- **Clock-in late detection:** If clock-in time > "09:00", status is "LATE"
- **Hours worked calculation:** clockOut - clockIn in minutes, divided by 60
- **Leave day calculation:** Counts only business days (Mon-Sat, excludes Sunday)
- **Leave balance enforcement:** Prevents requests exceeding remaining balance

#### Repository Interfaces
- `WorkerRepository` (findById, findByFarm, create, update, delete)
- `AttendanceRepository` (findById, findByWorker, findByDate, create, update)
- `TaskRepository` (findById, findByOrg, findByAssignee, create, update, delete)
- `ShiftRepository` (findById, findByOrg, create, update, delete)
- `ShiftAssignmentRepository` (findByShift, findByUser, findByDateRange, create, delete)
- `LeaveTypeRepository` (findById, findByOrg, create, update, delete)
- `LeaveRequestRepository` (findById, findByUser, findByOrg, create, update)
- `LeaveBalanceRepository` (findByUser, findByUserAndYear, upsert)
- `MessageRepository` (findById, findInbox, findSent, create, delete)
- `CorrespondenceRepository` (findById, findByOrg, create, update, delete)

#### Cross-Context Dependencies
- **Upstream:** Farm Management (farm validation for workers), Identity & Access (user/org validation)
- **Downstream:** Notification Service (leave approval/rejection notifications, message notifications)

---

### 8. Notification Context
**Owner:** notification-service (Port 4005)
**Responsibility:** In-app notifications, email delivery, push notifications, WebSocket realtime

#### Aggregate Roots
| Aggregate Root | Entity | Identity | Key Invariants |
|---------------|--------|----------|----------------|
| **Notification** | Notification | UUID | userId required, title/message required |
| **DeviceToken** | DeviceToken | UUID | userId/token unique, platform valid |

#### Value Objects
- **NotificationType** (INFO, WARNING, ERROR, SUCCESS)
- **DevicePlatform** (web, ios, android)
- **EmailOptions** (to, subject, html/text body)

#### Domain Events
| Event | Trigger | Payload |
|-------|---------|---------|
| `notification.created` | Notification sent | notificationId, userId, type |
| `notification.read` | Notification marked read | notificationId, userId |
| `notification.all_read` | All notifications read | userId |
| `notification.email.sent` | Email delivered | to, subject, success |
| `notification.push.sent` | Push sent | userId, platform, success |

#### Repository Interfaces
- `NotificationRepository` (findById, findByUser, findUnreadCount, create, update, markRead, markAllRead, delete)
- `DeviceTokenRepository` (findByUser, findByToken, create, deactivate, delete)

#### Cross-Context Dependencies
- **Upstream:** HR & Workforce (triggers notifications for leave, messages), Identity & Access (user lookup)
- **Downstream:** None (this is a leaf context)

---

### 9. Reporting Context
**Owner:** reporting-service (Port 4008)
**Responsibility:** Report generation, scheduled reports

#### Aggregate Roots
| Aggregate Root | Entity | Identity | Key Invariants |
|---------------|--------|----------|----------------|
| **ScheduledReport** | ScheduledReport | UUID | name/template/frequency required, recipients valid |

#### Value Objects
- **ReportTemplate** (FINANCIAL_SUMMARY, CROP_PRODUCTION, LIVESTOCK_HEALTH, INVENTORY, CUSTOM)
- **ReportFrequency** (DAILY, WEEKLY, MONTHLY, QUARTERLY)

#### Domain Events
| Event | Trigger | Payload |
|-------|---------|---------|
| `report.generated` | Report created | reportId, template |
| `report.scheduled` | Scheduled report set up | scheduledReportId, frequency |
| `report.sent` | Scheduled report dispatched | scheduledReportId, recipients |

#### Repository Interfaces
- `ReportRepository` (findById, findByOrg, create, update, delete)
- `ScheduledReportRepository` (findById, findByOrg, findDue, create, update, delete)

#### Cross-Context Dependencies
- **Upstream:** All contexts (reads data for reports), Identity & Access (user/org validation)
- **Downstream:** Notification Service (sends reports)

---

### 10. Platform Administration Context
**Owner:** platform-service (Port 4020)
**Responsibility:** SaaS platform management - feature flags, subscriptions, system health, audit, broadcasts

#### Aggregate Roots
| Aggregate Root | Entity | Identity | Key Invariants |
|---------------|--------|----------|----------------|
| **FeatureFlag** | FeatureFlag | UUID | Key unique, name required |
| **SubscriptionPlan** | SubscriptionPlan | UUID | Name unique, price >= 0, maxUsers > 0 |
| **AuditLog** | AuditLog | UUID | action/entity required |
| **SystemHealth** | SystemHealth | UUID | serviceName unique |
| **Broadcast** | Broadcast | UUID | title/message required |
| **PlatformConfig** | PlatformConfig | UUID | Key unique |

#### Value Objects
- **HealthStatus** (healthy, degraded, unhealthy)
- **BroadcastType** (INFO, WARNING, MAINTENANCE)
- **AuditAction** (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.)

#### Domain Events
| Event | Trigger | Payload |
|-------|---------|---------|
| `platform.feature.toggled` | Feature flag changed | featureFlagId, key, isEnabled |
| `platform.feature.override.set` | Org-specific override | featureFlagId, orgId, isEnabled |
| `platform.org.suspended` | Organization suspended | orgId |
| `platform.org.activated` | Organization activated | orgId |
| `platform.broadcast.created` | Broadcast sent | broadcastId, targetOrgs |
| `platform.health.checked` | Health check completed | serviceName, status |

#### Repository Interfaces
- `FeatureFlagRepository` (findByKey, findAll, create, update, findOverrides, upsertOverride, deleteOverride)
- `SubscriptionPlanRepository` (findById, findByName, findAll, create, update, delete)
- `AuditLogRepository` (findById, findByFilters, create)
- `SystemHealthRepository` (findByService, upsert, findAll)
- `BroadcastRepository` (findById, findActive, create, update, delete)
- `PlatformConfigRepository` (findByKey, upsert)

#### Cross-Context Dependencies
- **Upstream:** Identity & Access (platform admin auth)
- **Downstream:** All contexts (feature flags, subscription checks)

---

### 11. Organization Management Context
**Owner:** organization-service (Port 4009)
**Responsibility:** Organization CRUD, subscription management

#### Aggregate Roots
| Aggregate Root | Entity | Identity | Key Invariants |
|---------------|--------|----------|----------------|
| **Organization** | Organization | UUID | Slug unique, name required |

#### Value Objects
- **OrgSlug** (unique, lowercase, hyphens allowed)
- **SubscriptionStatus** (TRIAL, ACTIVE, PAST_DUE, CANCELLED, SUSPENDED)

#### Domain Events
| Event | Trigger | Payload |
|-------|---------|---------|
| `org.created` | Organization created | orgId, name, slug |
| `org.updated` | Organization updated | orgId, changes |
| `org.deleted` | Organization deleted | orgId |

#### Repository Interfaces
- `OrganizationRepository` (findById, findBySlug, findAll, create, update, delete)

#### Cross-Context Dependencies
- **Upstream:** Identity & Access (user/org validation)
- **Downstream:** All farm-related contexts (organization scoping)

---

## Cross-Context Communication Patterns

### 1. Synchronous HTTP (Current)
```
hr-service --HTTP--> notification-service (leave/message notifications)
platform-service --HTTP--> All services (health checks)
All services --HTTP--> API Gateway (realtime events via WebSocket)
```

### 2. Shared Database (Current)
All services share a single PostgreSQL database via Prisma with Row-Level Security (RLS).

### 3. Recommended DDD Communication
| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| **Domain Events** | Cross-context state changes | Event bus (In-memory or message queue) |
| **API Calls** | Real-time queries | HTTP/gRPC between services |
| **Shared Kernel** | Common value objects, base entities | `@farm/domain-core` package |
| **Anti-Corruption Layer** | External service integration | Adapter pattern in infrastructure |

---

## Context Relationship Diagram

```
                    ┌─────────────────────┐
                    │   Platform Admin    │
                    │   (platform-svc)    │
                    └──────────┬──────────┘
                               │ feature flags, subscriptions
                    ┌──────────▼──────────┐
                    │   Identity & Access │
                    │   (auth-service)    │
                    └──────────┬──────────┘
                               │ user/org validation
          ┌────────────────────┼────────────────────┐
          │                    │                     │
┌─────────▼─────────┐ ┌───────▼────────┐ ┌─────────▼─────────┐
│  Farm Management  │ │   Finance      │ │  Organization     │
│  (farm-service)   │ │ (finance-svc)  │ │  (org-service)    │
└─────────┬─────────┘ └───────┬────────┘ └───────────────────┘
          │                    │
    ┌─────┼─────┐              │
    │     │     │              │
┌───▼───┐ ┌───▼────┐ ┌───────▼───────┐
│ Crop  │ │Live-   │ │   Poultry     │
│ Mgmt  │ │stock   │ │   Mgmt        │
│       │ │Mgmt    │ │               │
└───┬───┘ └───┬────┘ └───────┬───────┘
    │         │              │
    └────┬────┴──────────────┘
         │
┌────────▼────────┐      ┌────────────────┐
│  HR & Workforce │─────>│  Notification  │
│  (hr-service)   │      │  (notif-svc)   │
└─────────────────┘      └────────────────┘
         │
┌────────▼────────┐
│   Reporting     │
│ (reporting-svc) │
└─────────────────┘
```
