-- P6: Crop was a shared global name catalog (no organizationId column) — every
-- org saw the same names and any org could rename/delete any entry. Scope the
-- catalog per organization so each org owns its own crop vocabulary:
--
--   1. Add nullable organizationId to Crop;
--   2. Copy every global row into every existing org with a deterministic
--      UUID-shaped id (md5(org||id) with RFC-4122 version/variant nibbles);
--   3. Repoint CropCycle.cropId and YieldRecord.cropId onto the org-scoped copy
--      matching (cycle org, original crop id);
--   4. Delete global rows no longer referenced by any cycle or yield record;
--   5. Adopt any still-NULL leftovers to the oldest org;
--   6. SET NOT NULL on organizationId;
--   7. De-dupe (organizationId, name) then create the org index + unique index.

-- 1. Add nullable organizationId + timestamp columns (Crop has no
--    createdAt/updatedAt from the legacy 0_init baseline).
ALTER TABLE "Crop" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Crop" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE "Crop" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2. Copy each global (organizationId IS NULL) crop row into every org.
--    Ids are UUID-shaped: md5(organizationId || originalId) with the version
--    nibble forced to 4 and the variant nibble forced to 9 (RFC-4122), so the
--    client-side zod .uuid() validation passes. ON CONFLICT DO NOTHING makes
--    the step idempotent on re-run.
INSERT INTO "Crop" ("id", "organizationId", "name")
SELECT
  substr(md5(o."id" || c."id"), 1, 8) || '-' ||
  substr(md5(o."id" || c."id"), 9, 4) || '-4' ||
  substr(md5(o."id" || c."id"), 14, 3) || '-9' ||
  substr(md5(o."id" || c."id"), 19, 3) || '-' ||
  substr(md5(o."id" || c."id"), 21, 12),
  o."id",
  c."name"
FROM "Organization" o
CROSS JOIN "Crop" c
WHERE c."organizationId" IS NULL
ON CONFLICT ("id") DO NOTHING;

-- 3. Repoint CropCycle.cropId onto the org-scoped copy matching (cycle org,
--    original crop id). Same deterministic id derivation as step 2.
UPDATE "CropCycle" cc
SET "cropId" =
  substr(md5(cc."organizationId" || cc."cropId"), 1, 8) || '-' ||
  substr(md5(cc."organizationId" || cc."cropId"), 9, 4) || '-4' ||
  substr(md5(cc."organizationId" || cc."cropId"), 14, 3) || '-9' ||
  substr(md5(cc."organizationId" || cc."cropId"), 19, 3) || '-' ||
  substr(md5(cc."organizationId" || cc."cropId"), 21, 12)
WHERE cc."cropId" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "Crop" c
    WHERE c."id" =
      substr(md5(cc."organizationId" || cc."cropId"), 1, 8) || '-' ||
      substr(md5(cc."organizationId" || cc."cropId"), 9, 4) || '-4' ||
      substr(md5(cc."organizationId" || cc."cropId"), 14, 3) || '-9' ||
      substr(md5(cc."organizationId" || cc."cropId"), 19, 3) || '-' ||
      substr(md5(cc."organizationId" || cc."cropId"), 21, 12)
      AND c."organizationId" = cc."organizationId"
  );

-- 3b. Same repoint for YieldRecord.cropId.
UPDATE "YieldRecord" yr
SET "cropId" =
  substr(md5(yr."organizationId" || yr."cropId"), 1, 8) || '-' ||
  substr(md5(yr."organizationId" || yr."cropId"), 9, 4) || '-4' ||
  substr(md5(yr."organizationId" || yr."cropId"), 14, 3) || '-9' ||
  substr(md5(yr."organizationId" || yr."cropId"), 19, 3) || '-' ||
  substr(md5(yr."organizationId" || yr."cropId"), 21, 12)
WHERE yr."cropId" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "Crop" c
    WHERE c."id" =
      substr(md5(yr."organizationId" || yr."cropId"), 1, 8) || '-' ||
      substr(md5(yr."organizationId" || yr."cropId"), 9, 4) || '-4' ||
      substr(md5(yr."organizationId" || yr."cropId"), 14, 3) || '-9' ||
      substr(md5(yr."organizationId" || yr."cropId"), 19, 3) || '-' ||
      substr(md5(yr."organizationId" || yr."cropId"), 21, 12)
      AND c."organizationId" = yr."organizationId"
  );

-- 4. Delete global rows (organizationId IS NULL) not referenced by any cycle
--    or yield record. NOT EXISTS guard keeps rows still in use.
DELETE FROM "Crop" c
WHERE c."organizationId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "CropCycle" cc WHERE cc."cropId" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "YieldRecord" yr WHERE yr."cropId" = c."id");

-- 5. Adopt any still-NULL leftovers (rows still referenced but never copied,
--    e.g. cycles whose org had no matching copy) to the oldest organization.
UPDATE "Crop" c
SET "organizationId" = (
  SELECT "id" FROM "Organization" ORDER BY "createdAt" ASC LIMIT 1
)
WHERE c."organizationId" IS NULL;

-- 6. organizationId is now populated on every row.
ALTER TABLE "Crop" ALTER COLUMN "organizationId" SET NOT NULL;

-- 7. De-dupe (organizationId, name) — keep the oldest row, suffix the rest.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "organizationId", "name"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS rn
  FROM "Crop"
)
UPDATE "Crop" c
SET "name" = c."name" || '-dup' || ranked.rn::text
FROM ranked
WHERE c."id" = ranked."id"
  AND ranked.rn > 1;

-- 8. Org-scoped index + unique index on (organizationId, name). Both
--    idempotent (IF NOT EXISTS) so the migration can be safely re-run.
CREATE INDEX IF NOT EXISTS "Crop_organizationId_idx" ON "Crop"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "Crop_organizationId_name_key" ON "Crop"("organizationId", "name");
