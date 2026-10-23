-- P6: Flock.batchCode was unique GLOBALLY, so two organizations could not
-- both use the batch code "BROIL-2026-01" — the second tenant's create
-- failed with a raw unique-constraint error (surfaced as a 500). Batch codes
-- are only meaningful inside one organization, so scope the constraint:
--
--   1. drop the global partial unique index;
--   2. de-duplicate within each organization (keep the newest row, matching
--      the order the global index would have rejected anyway) by appending
--      "-dupN" to the losing rows' codes, so step 3 can't fail;
--   3. create the org-scoped partial unique index.
--
-- Like the soft-delete partial uniques, this stays a partial index
-- (`WHERE "deletedAt" IS NULL`) so soft-deleted flocks don't block
-- re-registering the same batch code.

-- 1. Drop the global index.
DROP INDEX IF EXISTS "Flock_batchCode_key";

-- 2. De-duplicate within an organization. Row numbers partition by
--    organizationId+batchCode and order newest-first; anything past the
--    first row is a duplicate and gets a suffixed, unique code.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "organizationId", "batchCode"
      ORDER BY "createdAt" DESC, "id" DESC
    ) AS rn
  FROM "Flock"
  WHERE "deletedAt" IS NULL
)
UPDATE "Flock"
SET "batchCode" = "Flock"."batchCode" || '-dup' || ranked.rn::text
FROM ranked
WHERE "Flock"."id" = ranked."id"
  AND ranked.rn > 1;

-- 3. Org-scoped, live-rows-only unique index.
CREATE UNIQUE INDEX "Flock_organizationId_batchCode_key"
  ON "Flock"("organizationId", "batchCode")
  WHERE "deletedAt" IS NULL;

-- Also normalize the historical "ADMINISTERD" typo written by the old
-- administer-vaccination endpoint (now spelled ADMINISTERED).
UPDATE "VaccinationSchedule"
SET "status" = 'ADMINISTERED'
WHERE "status" = 'ADMINISTERD';
