-- Object storage for documents: record the S3-compatible / local object key
-- and the driver that produced it, so files can be streamed back by key.
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "storageKey" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "storageDriver" TEXT;
