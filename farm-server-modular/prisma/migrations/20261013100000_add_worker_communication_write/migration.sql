-- Workers could always open the mobile Messages tab (communication.read) but
-- were never granted communication.write, so they could never reply. The grant
-- only exists in seed.ts, and production databases are not re-seeded — apply
-- it here instead. Idempotent: re-running it (or re-seeding afterwards) is safe.

-- 1. Ensure the permission row exists (it is in the seed, but don't assume it).
--    Permission.name is @unique; Permission.id has no DB default (Prisma
--    @default(uuid()) generates client-side), so mint one in SQL.
INSERT INTO "Permission" ("id", "name", "description", "category")
SELECT gen_random_uuid()::text,
       'communication.write',
       'Send messages and correspondence',
       'Communication'
ON CONFLICT ("name") DO NOTHING;

-- 2. Grant it to the system WORKER role. Role.name is only unique per
--    organizationId, so scoping to organizationId IS NULL targets exactly the
--    seeded system role and leaves org-scoped custom roles named "WORKER"
--    untouched. ON CONFLICT DO NOTHING skips duplicate grants (RolePermission
--    has PK (roleId, permissionId)) and mirrors the seed's upsert key.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."name" = 'communication.write'
WHERE r."name" = 'WORKER'
  AND r."organizationId" IS NULL
ON CONFLICT DO NOTHING;
