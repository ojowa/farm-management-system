-- ============================================================
-- Row-Level Security (RLS) Migration
-- Multi-tenant isolation for Farm Management System
-- ============================================================
-- Prisma maps String → PostgreSQL text (not uuid).
-- The helper function returns text to match column types.
-- ============================================================

-- ── 1. Helper function ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.current_organization', true), '');
$$;

-- ── 2. Tables with direct organizationId column ─────────────

-- Organization (special: users see their own org)
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON "Organization"
  FOR ALL
  USING (id = public.current_organization_id());

-- User
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "User"
  FOR ALL
  USING ("organizationId" = public.current_organization_id());

-- Farm
ALTER TABLE "Farm" ENABLE ROW LEVEL SECURITY;
CREATE POLICY farm_isolation ON "Farm"
  FOR ALL
  USING ("organizationId" = public.current_organization_id());

-- Flock
ALTER TABLE "Flock" ENABLE ROW LEVEL SECURITY;
CREATE POLICY flock_isolation ON "Flock"
  FOR ALL
  USING ("organizationId" = public.current_organization_id());

-- ── 3. Tables without organizationId (protected via JOIN) ────

-- Field (via Farm.organizationId)
ALTER TABLE "Field" ENABLE ROW LEVEL SECURITY;
CREATE POLICY field_isolation ON "Field"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Farm" WHERE "Farm".id = "Field"."farmId"
      AND "Farm"."organizationId" = public.current_organization_id()
    )
  );

-- PoultryHouse (via Farm.organizationId)
ALTER TABLE "PoultryHouse" ENABLE ROW LEVEL SECURITY;
CREATE POLICY poultryhouse_isolation ON "PoultryHouse"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Farm" WHERE "Farm".id = "PoultryHouse"."farmId"
      AND "Farm"."organizationId" = public.current_organization_id()
    )
  );

-- Pen (via PoultryHouse -> Farm.organizationId)
ALTER TABLE "Pen" ENABLE ROW LEVEL SECURITY;
CREATE POLICY pen_isolation ON "Pen"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "PoultryHouse" ph
      JOIN "Farm" f ON f.id = ph."farmId"
      WHERE ph.id = "Pen"."poultryHouseId"
      AND f."organizationId" = public.current_organization_id()
    )
  );

-- Breed (shared reference table — visible to all authenticated tenants)
ALTER TABLE "Breed" ENABLE ROW LEVEL SECURITY;
CREATE POLICY breed_isolation ON "Breed"
  FOR ALL
  USING (true);

-- FeedingRecord (via Flock.organizationId)
ALTER TABLE "FeedingRecord" ENABLE ROW LEVEL SECURITY;
CREATE POLICY feedingrecord_isolation ON "FeedingRecord"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Flock" WHERE "Flock".id = "FeedingRecord"."flockId"
      AND "Flock"."organizationId" = public.current_organization_id()
    )
  );

-- VaccinationRecord (via Flock.organizationId)
ALTER TABLE "VaccinationRecord" ENABLE ROW LEVEL SECURITY;
CREATE POLICY vaccinationrecord_isolation ON "VaccinationRecord"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Flock" WHERE "Flock".id = "VaccinationRecord"."flockId"
      AND "Flock"."organizationId" = public.current_organization_id()
    )
  );

-- MortalityRecord (via Flock.organizationId)
ALTER TABLE "MortalityRecord" ENABLE ROW LEVEL SECURITY;
CREATE POLICY mortalityrecord_isolation ON "MortalityRecord"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Flock" WHERE "Flock".id = "MortalityRecord"."flockId"
      AND "Flock"."organizationId" = public.current_organization_id()
    )
  );

-- Medication (via Flock.organizationId)
ALTER TABLE "Medication" ENABLE ROW LEVEL SECURITY;
CREATE POLICY medication_isolation ON "Medication"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Flock" WHERE "Flock".id = "Medication"."flockId"
      AND "Flock"."organizationId" = public.current_organization_id()
    )
  );

-- CropCycle (via Field -> Farm.organizationId)
ALTER TABLE "CropCycle" ENABLE ROW LEVEL SECURITY;
CREATE POLICY cropcycle_isolation ON "CropCycle"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Field" f
      JOIN "Farm" fm ON fm.id = f."farmId"
      WHERE f.id = "CropCycle"."fieldId"
      AND fm."organizationId" = public.current_organization_id()
    )
  );

-- Crop (shared reference table — visible to all authenticated tenants)
ALTER TABLE "Crop" ENABLE ROW LEVEL SECURITY;
CREATE POLICY crop_isolation ON "Crop"
  FOR ALL
  USING (true);

-- Inventory (via Farm.organizationId)
ALTER TABLE "Inventory" ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_isolation ON "Inventory"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Farm" WHERE "Farm".id = "Inventory"."farmId"
      AND "Farm"."organizationId" = public.current_organization_id()
    )
  );

-- Expense (via Farm.organizationId)
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
CREATE POLICY expense_isolation ON "Expense"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Farm" WHERE "Farm".id = "Expense"."farmId"
      AND "Farm"."organizationId" = public.current_organization_id()
    )
  );

-- Sale (via Farm.organizationId)
ALTER TABLE "Sale" ENABLE ROW LEVEL SECURITY;
CREATE POLICY sale_isolation ON "Sale"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Farm" WHERE "Farm".id = "Sale"."farmId"
      AND "Farm"."organizationId" = public.current_organization_id()
    )
  );

-- Worker (via Farm.organizationId)
ALTER TABLE "Worker" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_isolation ON "Worker"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Farm" WHERE "Farm".id = "Worker"."farmId"
      AND "Farm"."organizationId" = public.current_organization_id()
    )
  );

-- Livestock (via Farm.organizationId)
ALTER TABLE "Livestock" ENABLE ROW LEVEL SECURITY;
CREATE POLICY livestock_isolation ON "Livestock"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Farm" WHERE "Farm".id = "Livestock"."farmId"
      AND "Farm"."organizationId" = public.current_organization_id()
    )
  );

-- Notification (direct userId, protected via User.organizationId)
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
CREATE POLICY notification_isolation ON "Notification"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User" WHERE "User".id = "Notification"."userId"
      AND "User"."organizationId" = public.current_organization_id()
    )
  );

-- AuditLog (direct userId, protected via User.organizationId)
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY auditlog_isolation ON "AuditLog"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User" WHERE "User".id = "AuditLog"."userId"
      AND "User"."organizationId" = public.current_organization_id()
    )
  );

-- RolePermission (shared reference — visible to all)
ALTER TABLE "RolePermission" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rolepermission_isolation ON "RolePermission"
  FOR ALL
  USING (true);

-- Permission (shared reference — visible to all)
ALTER TABLE "Permission" ENABLE ROW LEVEL SECURITY;
CREATE POLICY permission_isolation ON "Permission"
  FOR ALL
  USING (true);

-- Role (shared reference — visible to all)
ALTER TABLE "Role" ENABLE ROW LEVEL SECURITY;
CREATE POLICY role_isolation ON "Role"
  FOR ALL
  USING (
    public.is_super_admin()
    OR "organizationId" IS NULL
    OR "organizationId" = public.current_organization_id()
  );

-- RefreshToken (direct userId, protected via User.organizationId)
ALTER TABLE "RefreshToken" ENABLE ROW LEVEL SECURITY;
CREATE POLICY refreshtoken_isolation ON "RefreshToken"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User" WHERE "User".id = "RefreshToken"."userId"
      AND "User"."organizationId" = public.current_organization_id()
    )
  );

-- SyncQueue (no direct org link — requires application-level filtering)
ALTER TABLE "SyncQueue" ENABLE ROW LEVEL SECURITY;
CREATE POLICY syncqueue_isolation ON "SyncQueue"
  FOR ALL
  USING (true);

-- LeaveRequest (direct orgId)
ALTER TABLE "LeaveRequest" ENABLE ROW LEVEL SECURITY;
CREATE POLICY leaverequest_isolation ON "LeaveRequest"
  FOR ALL
  USING ("organizationId" = public.current_organization_id());

-- LeaveBalance (direct orgId)
ALTER TABLE "LeaveBalance" ENABLE ROW LEVEL SECURITY;
CREATE POLICY leavebalance_isolation ON "LeaveBalance"
  FOR ALL
  USING ("organizationId" = public.current_organization_id());

-- ── Phase 2: Duty Roster ──────────────────────────────────

-- Shift (direct orgId)
ALTER TABLE "Shift" ENABLE ROW LEVEL SECURITY;
CREATE POLICY shift_isolation ON "Shift"
  FOR ALL
  USING ("organizationId" = public.current_organization_id());

-- ShiftAssignment (direct orgId)
ALTER TABLE "ShiftAssignment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY shiftassignment_isolation ON "ShiftAssignment"
  FOR ALL
  USING ("organizationId" = public.current_organization_id());

-- ── Phase 3: Internal Messaging ───────────────────────────

-- Message (direct orgId)
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
CREATE POLICY message_isolation ON "Message"
  FOR ALL
  USING ("organizationId" = public.current_organization_id());

-- MessageRecipient (via Message.organizationId)
ALTER TABLE "MessageRecipient" ENABLE ROW LEVEL SECURITY;
CREATE POLICY messagerecipient_isolation ON "MessageRecipient"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Message" WHERE "Message".id = "MessageRecipient"."messageId"
      AND "Message"."organizationId" = public.current_organization_id()
    )
  );

-- ── Phase 4: Correspondence ───────────────────────────────

-- Correspondence (direct orgId)
ALTER TABLE "Correspondence" ENABLE ROW LEVEL SECURITY;
CREATE POLICY correspondence_isolation ON "Correspondence"
  FOR ALL
  USING ("organizationId" = public.current_organization_id());

-- CorrespondenceAttachment (via Correspondence.organizationId)
ALTER TABLE "CorrespondenceAttachment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY correspondenceattachment_isolation ON "CorrespondenceAttachment"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Correspondence" WHERE "Correspondence".id = "CorrespondenceAttachment"."correspondenceId"
      AND "Correspondence"."organizationId" = public.current_organization_id()
    )
  );

-- UserOrganization (user can see their own memberships)
ALTER TABLE "UserOrganization" ENABLE ROW LEVEL SECURITY;
CREATE POLICY userorganization_isolation ON "UserOrganization"
  FOR ALL
  USING (
    "userId" = current_setting('app.current_user_id')::text
    OR public.is_super_admin()
  );
