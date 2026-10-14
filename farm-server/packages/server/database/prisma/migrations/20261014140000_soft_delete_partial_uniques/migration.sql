-- Soft delete: move natural-key uniqueness to partial unique indexes that
-- ignore soft-deleted rows, so deleting then re-creating an entity with the
-- same natural key (shift name, batch code, attendance date, ...) works
-- without purging the old row first.

-- Flock
DROP INDEX IF EXISTS "Flock_batchCode_key";
CREATE UNIQUE INDEX "Flock_batchCode_key" ON "Flock"("batchCode") WHERE "deletedAt" IS NULL;

-- LeaveType
DROP INDEX IF EXISTS "LeaveType_name_organizationId_key";
CREATE UNIQUE INDEX "LeaveType_name_organizationId_key" ON "LeaveType"("name","organizationId") WHERE "deletedAt" IS NULL;

-- LeaveBalance
DROP INDEX IF EXISTS "LeaveBalance_userId_leaveTypeId_year_key";
CREATE UNIQUE INDEX "LeaveBalance_userId_leaveTypeId_year_key" ON "LeaveBalance"("userId","leaveTypeId","year") WHERE "deletedAt" IS NULL;

-- Shift
DROP INDEX IF EXISTS "Shift_name_organizationId_key";
CREATE UNIQUE INDEX "Shift_name_organizationId_key" ON "Shift"("name","organizationId") WHERE "deletedAt" IS NULL;

-- ShiftAssignment
DROP INDEX IF EXISTS "ShiftAssignment_shiftId_userId_date_key";
CREATE UNIQUE INDEX "ShiftAssignment_shiftId_userId_date_key" ON "ShiftAssignment"("shiftId","userId","date") WHERE "deletedAt" IS NULL;

-- Attendance
DROP INDEX IF EXISTS "Attendance_workerId_date_key";
CREATE UNIQUE INDEX "Attendance_workerId_date_key" ON "Attendance"("workerId","date") WHERE "deletedAt" IS NULL;

-- MessageRecipient
DROP INDEX IF EXISTS "MessageRecipient_messageId_recipientId_key";
CREATE UNIQUE INDEX "MessageRecipient_messageId_recipientId_key" ON "MessageRecipient"("messageId","recipientId") WHERE "deletedAt" IS NULL;

-- Correspondence
DROP INDEX IF EXISTS "Correspondence_referenceNumber_key";
CREATE UNIQUE INDEX "Correspondence_referenceNumber_key" ON "Correspondence"("referenceNumber") WHERE "deletedAt" IS NULL;
