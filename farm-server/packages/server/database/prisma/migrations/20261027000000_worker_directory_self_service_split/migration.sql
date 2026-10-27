-- Worker directory vs. self-service split.
--
-- Until now worker.read / worker.write did double duty: they were granted to
-- the WORKER role as a "pass the guard" token for mobile self-service (own
-- attendance/tasks/clock), even though the directory routes were gated on
-- hr.*. That meant the field-worker role held a key described as "view worker
-- profiles", and supervisors/veterinarians could reach the roster via hr.read.
--
-- After this change:
--   * worker.read / worker.write / worker.delete gate ONLY the worker
--     directory (the /workers routes on WorkerController), granted to
--     ORGANIZATION_OWNER (r/w/d), FARM_MANAGER (r/w) and ACCOUNTANT (read).
--   * worker.self is the new self-service key for own attendance/tasks/clock,
--     granted to ORGANIZATION_OWNER, FARM_MANAGER, SUPERVISOR and WORKER.
--   * SUPERVISOR and WORKER lose the directory keys they no longer need.
--
-- Only system roles (organizationId IS NULL) are touched: any custom role an
-- administrator built in the Roles UI keeps exactly the grants it has. Data
-- only, idempotent — mirrors the seed's rolePermissions block.

-- 1. The new self-service permission (the seed creates it for fresh installs).
INSERT INTO "Permission" ("id", "name", "description", "category")
SELECT gen_random_uuid()::text, 'worker.self',
       'Access your own worker records (attendance, tasks, clock in/out)',
       'Worker'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE "name" = 'worker.self');

-- 2. Restate the directory permissions' meaning (they no longer cover
--    tasks/attendance self-service).
UPDATE "Permission"
SET "description" = 'View the worker directory (roster of worker profiles)'
WHERE "name" = 'worker.read';
UPDATE "Permission"
SET "description" = 'Add and edit worker profiles in the directory'
WHERE "name" = 'worker.write';
UPDATE "Permission"
SET "description" = 'Delete worker profiles from the directory'
WHERE "name" = 'worker.delete';

-- 3. Self-service: owners, managers, supervisors and field workers may act on
--    their OWN records (the service ownership-scopes anyone without hr.*).
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."name" = 'worker.self'
WHERE r."organizationId" IS NULL
  AND r."name" IN ('ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'WORKER')
ON CONFLICT DO NOTHING;

-- 4. Directory read: owners, managers and accountants.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."name" = 'worker.read'
WHERE r."organizationId" IS NULL
  AND r."name" IN ('ORGANIZATION_OWNER', 'FARM_MANAGER', 'ACCOUNTANT')
ON CONFLICT DO NOTHING;

-- 5. Directory write: owners and managers (accountants stay read-only).
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."name" = 'worker.write'
WHERE r."organizationId" IS NULL
  AND r."name" IN ('ORGANIZATION_OWNER', 'FARM_MANAGER')
ON CONFLICT DO NOTHING;

-- 6. Revoke the stale directory grants: supervisors see the roster through
--    hr.read, field workers never see it. Only system roles — an explicit
--    grant an administrator made to a custom role is left alone.
DELETE FROM "RolePermission" rp
USING "Role" r, "Permission" p
WHERE rp."roleId" = r."id"
  AND rp."permissionId" = p."id"
  AND r."organizationId" IS NULL
  AND r."name" IN ('SUPERVISOR', 'WORKER')
  AND p."name" IN ('worker.read', 'worker.write', 'worker.delete');
