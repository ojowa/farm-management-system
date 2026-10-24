-- Fix: Pen must link directly to Farm (not only through PoultryHouse).
ALTER TABLE "Pen" ADD COLUMN IF NOT EXISTS "farmId" TEXT;
CREATE INDEX IF NOT EXISTS "Pen_farmId_idx" ON "Pen"("farmId");
