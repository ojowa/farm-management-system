-- Department becomes a first-class entity, and the three roster surfaces
-- (Worker, Task, Shift) reference it:
--
--   1. New `Department` table (org-level, soft-deleted like its neighbours).
--   2. Worker.departmentId / Task.departmentId / Shift.departmentId FKs.
--      Worker.department stays as the denormalised name — the free-text
--      column older clients and CSV exports still read.
--   3. Task gains the cross-module link (linkedModule + linkedRecordId +
--      linkedRecordName): which crop cycle / animal / house / pond / piece of
--      equipment the task was raised against.
--   4. Backfill: one Department row per distinct (organization, department
--      name) already in Worker, then point every worker at its row — existing
--      free-text values become real records with no client change.
--
-- The FKs are ON DELETE SET NULL to match Prisma; the service additionally
-- refuses to delete a department still in use (same rule as Shift).

CREATE TABLE IF NOT EXISTS "Department" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Department_organizationId_idx" ON "Department"("organizationId");

ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "linkedModule" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "linkedRecordId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "linkedRecordName" TEXT;
ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;

ALTER TABLE "Worker" ADD CONSTRAINT "Worker_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Worker_departmentId_idx" ON "Worker"("departmentId");
CREATE INDEX IF NOT EXISTS "Task_departmentId_idx" ON "Task"("departmentId");
CREATE INDEX IF NOT EXISTS "Task_linkedModule_linkedRecordId_idx" ON "Task"("linkedModule", "linkedRecordId");
CREATE INDEX IF NOT EXISTS "Shift_departmentId_idx" ON "Shift"("departmentId");

-- ── Backfill: existing free-text departments → Department rows ───────────
INSERT INTO "Department" ("id", "organizationId", "name", "updatedAt")
SELECT gen_random_uuid()::text, d."organizationId", d."department", CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "organizationId", "department"
  FROM "Worker"
  WHERE "department" IS NOT NULL AND btrim("department") <> ''
) d
WHERE NOT EXISTS (
  SELECT 1 FROM "Department" existing
  WHERE existing."organizationId" = d."organizationId"
    AND existing."name" = d."department"
);

UPDATE "Worker" w
SET "departmentId" = d."id"
FROM "Department" d
WHERE w."departmentId" IS NULL
  AND w."department" IS NOT NULL
  AND d."organizationId" = w."organizationId"
  AND d."name" = w."department";
