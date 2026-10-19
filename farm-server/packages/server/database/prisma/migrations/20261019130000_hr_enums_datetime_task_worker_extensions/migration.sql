-- HR model hardening:
--   1. Closed enums for the four HR status columns (were free-form strings,
--      which let casing drift like "active" vs "ACTIVE").
--   2. Attendance clock times stored as real timestamps (were "HH:MM" strings,
--      which broke overnight shifts and made hoursWorked hand-stored).
--   3. Task recurrence fields + dueDate/farmId indexes.
--   4. TaskComment / TaskAttachment tables.
--   5. Worker payroll, emergency-contact, termination and skills columns.
--   6. Shift.daysOfWeek (the mobile app already had this field in its type).
--   7. Real relations Worker.userId -> User and Attendance.workerId -> Worker.

-- ── Enum types ────────────────────────────────────────────────────────
CREATE TYPE "WorkerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PROBATION', 'TERMINATED');
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE');
CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- ── Normalise drifted values before the cast ──────────────────────────
-- Uppercase known variants first, then park anything unrecognised on the
-- model default so the ::ENUM casts below cannot fail on legacy rows.

UPDATE "Worker" SET "status" = UPPER("status") WHERE "status" IS NOT NULL;
UPDATE "Worker" SET "status" = 'ACTIVE'
  WHERE "status" IS NULL OR "status" NOT IN ('ACTIVE', 'INACTIVE', 'PROBATION', 'TERMINATED');

UPDATE "Task" SET "status" = UPPER("status") WHERE "status" IS NOT NULL;
UPDATE "Task" SET "status" = 'PENDING'
  WHERE "status" IS NULL OR "status" NOT IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
UPDATE "Task" SET "priority" = UPPER("priority") WHERE "priority" IS NOT NULL;
UPDATE "Task" SET "priority" = 'MEDIUM'
  WHERE "priority" IS NULL OR "priority" NOT IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

UPDATE "Attendance" SET "status" = UPPER("status") WHERE "status" IS NOT NULL;
UPDATE "Attendance" SET "status" = 'PRESENT'
  WHERE "status" IS NULL OR "status" NOT IN ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE');

UPDATE "LeaveRequest" SET "status" = UPPER("status") WHERE "status" IS NOT NULL;
UPDATE "LeaveRequest" SET "status" = 'PENDING'
  WHERE "status" IS NULL OR "status" NOT IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- ── String -> enum column casts ───────────────────────────────────────
-- String column defaults ('ACTIVE', 'PENDING', ...) cannot ride along with
-- the type change — drop them first, restore them as enum literals after.
ALTER TABLE "Worker" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "Attendance" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "LeaveRequest" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Worker" ALTER COLUMN "status" TYPE "WorkerStatus" USING "status"::"WorkerStatus";
ALTER TABLE "Task" ALTER COLUMN "status" TYPE "TaskStatus" USING "status"::"TaskStatus";
ALTER TABLE "Task" ALTER COLUMN "priority" TYPE "TaskPriority" USING "priority"::"TaskPriority";
ALTER TABLE "Attendance" ALTER COLUMN "status" TYPE "AttendanceStatus" USING "status"::"AttendanceStatus";
ALTER TABLE "LeaveRequest" ALTER COLUMN "status" TYPE "LeaveRequestStatus" USING "status"::"LeaveRequestStatus";

ALTER TABLE "Worker" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "Task" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';
ALTER TABLE "LeaveRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- ── Attendance clock times: "HH:MM" -> TIMESTAMP(3) ───────────────────
-- Park values that aren't an HH:MM string instead of failing the cast.
UPDATE "Attendance" SET "clockIn" = NULL
  WHERE "clockIn" IS NOT NULL AND "clockIn" !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$';
UPDATE "Attendance" SET "clockOut" = NULL
  WHERE "clockOut" IS NOT NULL AND "clockOut" !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$';

ALTER TABLE "Attendance" ALTER COLUMN "clockIn" TYPE TIMESTAMP(3)
  USING (CASE WHEN "clockIn" IS NULL THEN NULL ELSE "date" + "clockIn"::TIME END);
ALTER TABLE "Attendance" ALTER COLUMN "clockOut" TYPE TIMESTAMP(3)
  USING (CASE WHEN "clockOut" IS NULL THEN NULL ELSE "date" + "clockOut"::TIME END);

-- Overnight shift: checkout happened after midnight, so it lands before the
-- clock-in when both are anchored to the same date. Push it to the next day.
UPDATE "Attendance"
   SET "clockOut" = "clockOut" + INTERVAL '1 day'
 WHERE "clockIn" IS NOT NULL
   AND "clockOut" IS NOT NULL
   AND "clockOut" < "clockIn";

-- hoursWorked is now derived from the timestamps rather than hand-stored.
UPDATE "Attendance"
   SET "hoursWorked" = ROUND(EXTRACT(EPOCH FROM ("clockOut" - "clockIn")) / 3600, 2)
 WHERE "clockIn" IS NOT NULL AND "clockOut" IS NOT NULL;

-- ── Worker columns ────────────────────────────────────────────────────
ALTER TABLE "Worker"
  ADD COLUMN "payRate" DOUBLE PRECISION,
  ADD COLUMN "payType" TEXT,
  ADD COLUMN "terminationDate" TIMESTAMP(3),
  ADD COLUMN "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "emergencyContactName" TEXT,
  ADD COLUMN "emergencyContactPhone" TEXT,
  ADD COLUMN "emergencyContactRelation" TEXT;

-- ── Task recurrence + indexes ─────────────────────────────────────────
ALTER TABLE "Task"
  ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "recurrenceRule" TEXT,
  ADD COLUMN "nextDueAt" TIMESTAMP(3);
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");
CREATE INDEX "Task_farmId_idx" ON "Task"("farmId");

-- ── Shift.daysOfWeek ──────────────────────────────────────────────────
ALTER TABLE "Shift" ADD COLUMN "daysOfWeek" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- ── TaskComment ───────────────────────────────────────────────────────
CREATE TABLE "TaskComment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- ── TaskAttachment ────────────────────────────────────────────────────
CREATE TABLE "TaskAttachment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "uploadedById" TEXT,
    "uploadedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TaskAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskComment_taskId_idx" ON "TaskComment"("taskId");
CREATE INDEX "TaskComment_organizationId_idx" ON "TaskComment"("organizationId");
CREATE INDEX "TaskAttachment_taskId_idx" ON "TaskAttachment"("taskId");
CREATE INDEX "TaskAttachment_organizationId_idx" ON "TaskAttachment"("organizationId");

ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Worker.userId -> User (nullable; orphan ids nulled first) ─────────
UPDATE "Worker" w
   SET "userId" = NULL
 WHERE "userId" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u."id" = w."userId");
ALTER TABLE "Worker" DROP CONSTRAINT IF EXISTS "Worker_userId_fkey";
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Attendance.workerId -> Worker ─────────────────────────────────────
-- Worker deletion is a soft delete, so live rows should always resolve.
-- Any row pointing at a worker that was hard-deleted has no subject left
-- and would block the FK; drop those unusable records.
DELETE FROM "Attendance" a
 WHERE NOT EXISTS (SELECT 1 FROM "Worker" w WHERE w."id" = a."workerId");
ALTER TABLE "Attendance" DROP CONSTRAINT IF EXISTS "Attendance_workerId_fkey";
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_workerId_fkey"
  FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
