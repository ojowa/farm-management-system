-- The worker.* permission family was seeded but never enforced anywhere, so
-- the WORKER role could not list its own tasks or clock in (those routes
-- required hr.*). HR reads/writes now accept worker.* as a self-service
-- alternative (PermissionAny('hr.read','worker.read') etc.) — grant the write
-- half to the system WORKER role so self-service actually works.
--
-- The seed gained the same grant for freshly seeded organizations; this
-- migration brings already-seeded ones in line. Data-only, idempotent.

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'WORKER'
  AND r."organizationId" IS NULL
  AND p."name" = 'worker.write'
ON CONFLICT DO NOTHING;
