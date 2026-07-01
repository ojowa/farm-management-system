-- Create a super admin user that bypasses RLS
-- This user can access ALL organizations' data

-- 1. Create platform organization
INSERT INTO "Organization" (id, name, slug, email, "createdAt", "updatedAt")
VALUES ('platform-org', 'Farm Management Platform', 'platform', 'platform@farm.com', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Create super admin user (password: superadmin123)
-- NOTE: The seed script (pnpm seed) also creates this user automatically.
-- This SQL is for manual setup without running the seed.
INSERT INTO "User" (id, "organizationId", "firstName", "lastName", email, "passwordHash", "roleId", "isActive", "createdAt", "updatedAt")
SELECT
  '00000000-0000-0000-0000-000000000001',
  'platform-org',
  'Super',
  'Admin',
  'superadmin@farm.com',
  '$2a$12$R0lN1lnbrZ91YaEwFum1Seor9pgUni3G398h6Wf3.4.7WtbLTzvfW',
  r.id,
  true,
  NOW(),
  NOW()
FROM "Role" r
WHERE r.name = 'SUPER_ADMIN'
ON CONFLICT (id) DO NOTHING;

-- 3. Assign ALL permissions to SUPER_ADMIN role (if not already)
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r.id, p.id
FROM "Role" r, "Permission" p
WHERE r.name = 'SUPER_ADMIN'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- 4. Verify
SELECT u.id, u.email, u."firstName", u."lastName", r.name as role, u."organizationId"
FROM "User" u
JOIN "Role" r ON r.id = u."roleId"
WHERE u.email = 'superadmin@farm.com';
