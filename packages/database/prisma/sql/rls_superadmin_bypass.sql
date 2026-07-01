-- ============================================================
-- RLS Bypass for SUPER_ADMIN role
-- ============================================================
-- Adds a session variable `app.is_super_admin` that lets
-- super admins see ALL organizations' data.
-- ============================================================

-- 1. Create bypass check function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT current_setting('app.is_super_admin', true) = 'true';
$$;

-- 2. Update the organization_id function to bypass for super admins
CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN current_setting('app.is_super_admin', true) = 'true'
    THEN NULL  -- super admins see everything, no org filter
    ELSE nullif(current_setting('app.current_organization', true), '')
  END;
$$;

-- 3. Recreate all RLS policies with super admin bypass

-- Organization
DROP POLICY IF EXISTS org_isolation ON "Organization";
CREATE POLICY org_isolation ON "Organization"
  FOR ALL
  USING (
    public.is_super_admin()
    OR id = public.current_organization_id()
  );

-- User
DROP POLICY IF EXISTS user_isolation ON "User";
CREATE POLICY user_isolation ON "User"
  FOR ALL
  USING (
    public.is_super_admin()
    OR "organizationId" = public.current_organization_id()
  );

-- Farm
DROP POLICY IF EXISTS farm_isolation ON "Farm";
CREATE POLICY farm_isolation ON "Farm"
  FOR ALL
  USING (
    public.is_super_admin()
    OR "organizationId" = public.current_organization_id()
  );

-- Flock
DROP POLICY IF EXISTS flock_isolation ON "Flock";
CREATE POLICY flock_isolation ON "Flock"
  FOR ALL
  USING (
    public.is_super_admin()
    OR "organizationId" = public.current_organization_id()
  );

-- Field (via Farm)
DROP POLICY IF EXISTS field_isolation ON "Field";
CREATE POLICY field_isolation ON "Field"
  FOR ALL
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM "Farm" WHERE "Farm".id = "Field"."farmId"
      AND "Farm"."organizationId" = public.current_organization_id()
    )
  );

-- PoultryHouse (via Farm)
DROP POLICY IF EXISTS poultryhouse_isolation ON "PoultryHouse";
CREATE POLICY poultryhouse_isolation ON "PoultryHouse"
  FOR ALL
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM "Farm" WHERE "Farm".id = "PoultryHouse"."farmId"
      AND "Farm"."organizationId" = public.current_organization_id()
    )
  );

-- Pen (via PoultryHouse -> Farm)
DROP POLICY IF EXISTS pen_isolation ON "Pen";
CREATE POLICY pen_isolation ON "Pen"
  FOR ALL
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM "PoultryHouse" ph
      JOIN "Farm" f ON f.id = ph."farmId"
      WHERE ph.id = "Pen"."poultryHouseId"
      AND f."organizationId" = public.current_organization_id()
    )
  );

-- FeedingRecord (via Flock)
DROP POLICY IF EXISTS feedingrecord_isolation ON "FeedingRecord";
CREATE POLICY feedingrecord_isolation ON "FeedingRecord"
  FOR ALL
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM "Flock" WHERE "Flock".id = "FeedingRecord"."flockId"
      AND "Flock"."organizationId" = public.current_organization_id()
    )
  );

-- VaccinationRecord (via Flock)
DROP POLICY IF EXISTS vaccinationrecord_isolation ON "VaccinationRecord";
CREATE POLICY vaccinationrecord_isolation ON "VaccinationRecord"
  FOR ALL
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM "Flock" WHERE "Flock".id = "VaccinationRecord"."flockId"
      AND "Flock"."organizationId" = public.current_organization_id()
    )
  );

-- MortalityRecord (via Flock)
DROP POLICY IF EXISTS mortalityrecord_isolation ON "MortalityRecord";
CREATE POLICY mortalityrecord_isolation ON "MortalityRecord"
  FOR ALL
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM "Flock" WHERE "Flock".id = "MortalityRecord"."flockId"
      AND "Flock"."organizationId" = public.current_organization_id()
    )
  );

-- Medication (via Flock)
DROP POLICY IF EXISTS medication_isolation ON "Medication";
CREATE POLICY medication_isolation ON "Medication"
  FOR ALL
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM "Flock" WHERE "Flock".id = "Medication"."flockId"
      AND "Flock"."organizationId" = public.current_organization_id()
    )
  );

-- CropCycle (via Field -> Farm)
DROP POLICY IF EXISTS cropcycle_isolation ON "CropCycle";
CREATE POLICY cropcycle_isolation ON "CropCycle"
  FOR ALL
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM "Field" f
      JOIN "Farm" fm ON fm.id = f."farmId"
      WHERE f.id = "CropCycle"."fieldId"
      AND fm."organizationId" = public.current_organization_id()
    )
  );

-- Inventory (via Farm)
DROP POLICY IF EXISTS inventory_isolation ON "Inventory";
CREATE POLICY inventory_isolation ON "Inventory"
  FOR ALL
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM "Farm" WHERE "Farm".id = "Inventory"."farmId"
      AND "Farm"."organizationId" = public.current_organization_id()
    )
  );

-- Expense (via Farm)
DROP POLICY IF EXISTS expense_isolation ON "Expense";
CREATE POLICY expense_isolation ON "Expense"
  FOR ALL
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM "Farm" WHERE "Farm".id = "Expense"."farmId"
      AND "Farm"."organizationId" = public.current_organization_id()
    )
  );

-- Sale (via Farm)
DROP POLICY IF EXISTS sale_isolation ON "Sale";
CREATE POLICY sale_isolation ON "Sale"
  FOR ALL
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM "Farm" WHERE "Farm".id = "Sale"."farmId"
      AND "Farm"."organizationId" = public.current_organization_id()
    )
  );

-- Worker (via Farm)
DROP POLICY IF EXISTS worker_isolation ON "Worker";
CREATE POLICY worker_isolation ON "Worker"
  FOR ALL
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM "Farm" WHERE "Farm".id = "Worker"."farmId"
      AND "Farm"."organizationId" = public.current_organization_id()
    )
  );

-- Livestock (via Farm)
DROP POLICY IF EXISTS livestock_isolation ON "Livestock";
CREATE POLICY livestock_isolation ON "Livestock"
  FOR ALL
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM "Farm" WHERE "Farm".id = "Livestock"."farmId"
      AND "Farm"."organizationId" = public.current_organization_id()
    )
  );

-- Notification (via User)
DROP POLICY IF EXISTS notification_isolation ON "Notification";
CREATE POLICY notification_isolation ON "Notification"
  FOR ALL
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM "User" WHERE "User".id = "Notification"."userId"
      AND "User"."organizationId" = public.current_organization_id()
    )
  );

-- AuditLog (via User)
DROP POLICY IF EXISTS auditlog_isolation ON "AuditLog";
CREATE POLICY auditlog_isolation ON "AuditLog"
  FOR ALL
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM "User" WHERE "User".id = "AuditLog"."userId"
      AND "User"."organizationId" = public.current_organization_id()
    )
  );

-- RefreshToken (via User)
DROP POLICY IF EXISTS refreshtoken_isolation ON "RefreshToken";
CREATE POLICY refreshtoken_isolation ON "RefreshToken"
  FOR ALL
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM "User" WHERE "User".id = "RefreshToken"."userId"
      AND "User"."organizationId" = public.current_organization_id()
    )
  );
