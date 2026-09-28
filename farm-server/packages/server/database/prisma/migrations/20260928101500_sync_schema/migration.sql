-- Sync Neon database with schema.prisma
-- Generated from `prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel schema.prisma`
-- Modified to be data-preserving (backfills) and idempotent (IF NOT EXISTS guards).

-- ── 1. Role.isPlatformAdmin ───────────────────────────────────────────────
ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;

-- ── 2. CropCycle.organizationId ───────────────────────────────────────────
ALTER TABLE "CropCycle" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
UPDATE "CropCycle" AS cc
SET "organizationId" = f."organizationId"
FROM "Field" AS fi
JOIN "Farm" AS f ON f."id" = fi."farmId"
WHERE fi."id" = cc."fieldId" AND cc."organizationId" IS NULL;
UPDATE "CropCycle"
SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "organizationId" IS NULL;
ALTER TABLE "CropCycle" ALTER COLUMN "organizationId" SET NOT NULL;

-- ── 3. Inventory.organizationId ───────────────────────────────────────────
ALTER TABLE "Inventory" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
UPDATE "Inventory" AS i
SET "organizationId" = f."organizationId"
FROM "Farm" AS f
WHERE f."id" = i."farmId" AND i."organizationId" IS NULL;
UPDATE "Inventory"
SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "organizationId" IS NULL;
ALTER TABLE "Inventory" ALTER COLUMN "organizationId" SET NOT NULL;

-- ── 4. Livestock.organizationId ───────────────────────────────────────────
ALTER TABLE "Livestock" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
UPDATE "Livestock" AS l
SET "organizationId" = f."organizationId"
FROM "Farm" AS f
WHERE f."id" = l."farmId" AND l."organizationId" IS NULL;
UPDATE "Livestock"
SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "organizationId" IS NULL;
ALTER TABLE "Livestock" ALTER COLUMN "organizationId" SET NOT NULL;

-- ── 5. Worker restructure (name/role → firstName/lastName/position, + org) ─
ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "middleName" TEXT;
ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "position" TEXT;
ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "hireDate" TIMESTAMP(3);
ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "status" TEXT;

UPDATE "Worker" AS w
SET "organizationId" = f."organizationId"
FROM "Farm" AS f
WHERE f."id" = w."farmId" AND w."organizationId" IS NULL;
UPDATE "Worker"
SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "organizationId" IS NULL;

-- Split "John Worker" → firstName "John", lastName "Worker"
UPDATE "Worker"
SET "firstName" = COALESCE("firstName", split_part(trim("name"), ' ', 1)),
    "lastName" = COALESCE(
      "lastName",
      CASE
        WHEN position(' ' in trim("name")) > 0
          THEN substr(trim("name"), position(' ' in trim("name")) + 1)
        ELSE split_part(trim("name"), ' ', 1)
      END
    ),
    "position" = COALESCE("position", "role", 'WORKER')
WHERE "name" IS NOT NULL;

UPDATE "Worker" SET "firstName" = COALESCE("firstName", 'Worker') WHERE "firstName" IS NULL;
UPDATE "Worker" SET "lastName" = COALESCE("lastName", "firstName") WHERE "lastName" IS NULL;
UPDATE "Worker" SET "position" = COALESCE("position", 'WORKER') WHERE "position" IS NULL;
UPDATE "Worker" SET "status" = COALESCE("status", 'ACTIVE') WHERE "status" IS NULL;

ALTER TABLE "Worker" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Worker" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "Worker" ALTER COLUMN "lastName" SET NOT NULL;
ALTER TABLE "Worker" ALTER COLUMN "position" SET NOT NULL;
ALTER TABLE "Worker" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
ALTER TABLE "Worker" ALTER COLUMN "status" SET NOT NULL;

ALTER TABLE "Worker" DROP COLUMN IF EXISTS "name";
ALTER TABLE "Worker" DROP COLUMN IF EXISTS "role";

-- ── 6. EggProduction ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EggProduction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "flockId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalEggs" INTEGER NOT NULL,
    "goodEggs" INTEGER NOT NULL DEFAULT 0,
    "brokenEggs" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EggProduction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EggProduction_flockId_idx" ON "EggProduction"("flockId");
CREATE INDEX IF NOT EXISTS "EggProduction_organizationId_idx" ON "EggProduction"("organizationId");
CREATE INDEX IF NOT EXISTS "EggProduction_date_idx" ON "EggProduction"("date");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EggProduction_flockId_fkey') THEN
    ALTER TABLE "EggProduction" ADD CONSTRAINT "EggProduction_flockId_fkey"
      FOREIGN KEY ("flockId") REFERENCES "Flock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 7. PoultrySale ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PoultrySale" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "farmId" TEXT,
    "flockId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "buyerName" TEXT,
    "birdType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION,
    "pricePerBird" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoultrySale_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PoultrySale_organizationId_idx" ON "PoultrySale"("organizationId");
CREATE INDEX IF NOT EXISTS "PoultrySale_farmId_idx" ON "PoultrySale"("farmId");
CREATE INDEX IF NOT EXISTS "PoultrySale_flockId_idx" ON "PoultrySale"("flockId");
CREATE INDEX IF NOT EXISTS "PoultrySale_date_idx" ON "PoultrySale"("date");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PoultrySale_flockId_fkey') THEN
    ALTER TABLE "PoultrySale" ADD CONSTRAINT "PoultrySale_flockId_fkey"
      FOREIGN KEY ("flockId") REFERENCES "Flock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 8. Report ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Report" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "farmId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "parameters" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Report_organizationId_idx" ON "Report"("organizationId");
CREATE INDEX IF NOT EXISTS "Report_farmId_idx" ON "Report"("farmId");
CREATE INDEX IF NOT EXISTS "Report_status_idx" ON "Report"("status");

-- ── 9. Remaining indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "CropCycle_organizationId_idx" ON "CropCycle"("organizationId");
CREATE INDEX IF NOT EXISTS "Inventory_organizationId_idx" ON "Inventory"("organizationId");
CREATE INDEX IF NOT EXISTS "Livestock_organizationId_idx" ON "Livestock"("organizationId");
CREATE INDEX IF NOT EXISTS "Worker_organizationId_idx" ON "Worker"("organizationId");
CREATE INDEX IF NOT EXISTS "Worker_userId_idx" ON "Worker"("userId");
CREATE INDEX IF NOT EXISTS "Worker_status_idx" ON "Worker"("status");

-- ── 10. Remaining foreign keys ────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Inventory_organizationId_fkey') THEN
    ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Worker_organizationId_fkey') THEN
    ALTER TABLE "Worker" ADD CONSTRAINT "Worker_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Livestock_organizationId_fkey') THEN
    ALTER TABLE "Livestock" ADD CONSTRAINT "Livestock_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
