# Full Database Setup — Farm Management System

## Overview

This document defines the complete database setup for the Farm Management System.

It is designed for:

* Multi-tenant SaaS architecture
* Poultry + crop + inventory farming system
* Offline-first mobile sync
* High scalability analytics
* Enterprise-grade data isolation

Primary database:

* entity["software","PostgreSQL","Relational database system"]

ORM layer:

* entity["software","Prisma","TypeScript ORM"]

---

# 1. Database Architecture Style

## Chosen Approach: Shared Database, Shared Schema (Multi-Tenant)

All tenants share the same database, but data is isolated using:

* organizationId (primary tenant key)
* farmId (sub-tenant scope)

---

## Tenant Isolation Rule

Every business table MUST include:

```text
organizationId
createdAt
updatedAt
createdBy
```

---

# 2. PostgreSQL Setup

## Install PostgreSQL (Docker)

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16
    container_name: farm_postgres
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: farm_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

## Recommended Extensions

Run inside PostgreSQL:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

Used for:

* GPS farm mapping
* Geospatial analysis
* UUID generation

---

# 3. Prisma Setup

## Install Prisma

```bash
pnpm add prisma @prisma/client
npx prisma init
```

---

## Prisma Folder Structure

```text
prisma/
│
├── schema.prisma
├── migrations/
└── seed.ts
```

---

# 4. Prisma Data Source

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

---

# 5. Core Multi-Tenant Models

## Organization (Tenant)

```prisma
model Organization {
  id        String   @id @default(cuid())
  name      String
  email     String?
  phone     String?

  users     User[]
  farms     Farm[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## User

```prisma
model User {
  id              String   @id @default(cuid())
  organizationId  String

  firstName       String
  lastName        String
  email           String?  @unique
  phone           String?  @unique

  passwordHash    String
  role            String

  organization    Organization @relation(fields: [organizationId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([organizationId])
}
```

---

# 6. Farm Structure

## Farm

```prisma
model Farm {
  id              String   @id @default(cuid())
  organizationId  String

  name            String
  location        String?
  latitude        Float?
  longitude       Float?

  organization    Organization @relation(fields: [organizationId], references: [id])

  fields          Field[]
  poultryHouses   PoultryHouse[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([organizationId])
}
```

---

## Field (Crop Land)

```prisma
model Field {
  id        String @id @default(cuid())
  farmId    String
  name      String
  size      Float

  farm      Farm @relation(fields: [farmId], references: [id])

  cropCycles CropCycle[]

  @@index([farmId])
}
```

---

# 7. Poultry Core Models

## PoultryHouse

```prisma
model PoultryHouse {
  id        String @id @default(cuid())
  farmId    String
  name      String
  capacity  Int

  farm      Farm @relation(fields: [farmId], references: [id])
  pens      Pen[]

  @@index([farmId])
}
```

---

## Pen

```prisma
model Pen {
  id              String @id @default(cuid())
  poultryHouseId  String
  name            String
  capacity        Int

  poultryHouse    PoultryHouse @relation(fields: [poultryHouseId], references: [id])

  flocks          Flock[]
}
```

---

## Breed

```prisma
model Breed {
  id        String @id @default(cuid())
  name      String
  birdType  BirdType

  flocks    Flock[]
}
```

---

## Flock

```prisma
model Flock {
  id              String @id @default(cuid())
  organizationId  String
  farmId          String
  penId           String
  breedId         String

  batchCode       String @unique
  birdCount       Int
  currentCount    Int

  arrivalDate     DateTime
  currentAgeDays  Int

  status          FlockStatus

  farm            Farm @relation(fields: [farmId], references: [id])
  pen             Pen @relation(fields: [penId], references: [id])
  breed           Breed @relation(fields: [breedId], references: [id])

  feedingRecords   FeedingRecord[]
  vaccinationRecords VaccinationRecord[]
  mortalityRecords MortalityRecord[]

  @@index([organizationId])
  @@index([farmId])
}
```

---

# 8. Poultry Transactions

## FeedingRecord

```prisma
model FeedingRecord {
  id        String @id @default(cuid())
  flockId   String

  feedType  String
  quantityKg Float
  date      DateTime

  flock     Flock @relation(fields: [flockId], references: [id])
}
```

---

## VaccinationRecord

```prisma
model VaccinationRecord {
  id        String @id @default(cuid())
  flockId   String

  vaccine   String
  dosage    String?
  date      DateTime

  flock     Flock @relation(fields: [flockId], references: [id])
}
```

---

## MortalityRecord

```prisma
model MortalityRecord {
  id        String @id @default(cuid())
  flockId   String

  count     Int
  cause     String?
  date      DateTime

  flock     Flock @relation(fields: [flockId], references: [id])
}
```

---

# 9. Crop Models

## Crop

```prisma
model Crop {
  id    String @id @default(cuid())
  name  String
}
```

---

## CropCycle

```prisma
model CropCycle {
  id            String @id @default(cuid())
  fieldId       String
  cropId        String

  plantingDate  DateTime
  harvestDate   DateTime?

  field         Field @relation(fields: [fieldId], references: [id])
  crop          Crop @relation(fields: [cropId], references: [id])
}
```

---

# 10. Inventory

```prisma
model Inventory {
  id        String @id @default(cuid())
  farmId    String

  name      String
  category  String
  quantity  Float
  unit      String

  @@index([farmId])
}
```

---

# 11. Finance

## Expense

```prisma
model Expense {
  id        String @id @default(cuid())
  farmId    String

  title     String
  amount    Float
  date      DateTime
}
```

---

## Sale

```prisma
model Sale {
  id        String @id @default(cuid())
  farmId    String

  item      String
  quantity  Float
  price     Float
  total     Float

  date      DateTime
}
```

---

# 12. Worker Management

```prisma
model Worker {
  id        String @id @default(cuid())
  farmId    String

  name      String
  role      String
}
```

---

# 13. Audit Log

```prisma
model AuditLog {
  id        String @id @default(cuid())

  userId    String?
  action    String
  entity    String
  entityId  String

  createdAt DateTime @default(now())
}
```

---

# 14. Sync Queue (Offline Support)

```prisma
model SyncQueue {
  id        String @id @default(cuid())

  entity    String
  entityId  String
  operation String
  payload   Json

  synced    Boolean @default(false)

  createdAt DateTime @default(now())
}
```

---

# 15. Indexing Strategy

## Required Indexes

* organizationId
* farmId
* createdAt
* batchCode (Flock)

Example:

```prisma
@@index([organizationId, farmId])
```

---

# 16. Performance Optimization

* Use indexed foreign keys
* Avoid deep joins in mobile queries
* Use pagination for all list APIs
* Cache analytics in Redis

---

# 17. Seed Data Setup

## seed.ts

* Create default roles
* Create demo organization
* Create demo farm
* Create sample poultry data

---

# 18. Migration Workflow

```bash
npx prisma migrate dev
npx prisma generate
npx prisma db seed
```

---

# 19. Security Rules

* Always filter by organizationId
* Never expose cross-tenant data
* Enforce RBAC at service layer
* Validate all inputs

---

# 20. Backup Strategy

* Daily PostgreSQL backup
* S3 backup for exports
* Point-in-time recovery enabled

---

# 21. Final Notes

This database setup is designed for:

* Multi-tenant SaaS agriculture platform
* Poultry + crop ERP system
* Offline-first mobile sync
* Scalable enterprise architecture

It can support:

* Small farms
* Commercial poultry farms
* Agricultural cooperatives
* Government agricultural systems

---

# End of Document
