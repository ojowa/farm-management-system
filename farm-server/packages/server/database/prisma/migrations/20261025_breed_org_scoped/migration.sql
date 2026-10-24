-- Org-scope Breed (shared catalog → per-org vocabulary)
ALTER TABLE "Breed" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Breed" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE "Breed" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now();
UPDATE "Breed" SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" ASC LIMIT 1) WHERE "organizationId" IS NULL;
ALTER TABLE "Breed" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Breed_organizationId_name_key" ON "Breed"("organizationId", "name");
CREATE INDEX IF NOT EXISTS "Breed_organizationId_idx" ON "Breed"("organizationId");
