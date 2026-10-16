-- CreateTable
CREATE TABLE "Pond" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pondType" TEXT NOT NULL DEFAULT 'FISH',
    "area" DOUBLE PRECISION,
    "waterSource" TEXT,
    "capacity" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Pond_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PondStocking" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pondId" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "strain" TEXT,
    "count" INTEGER NOT NULL,
    "source" TEXT,
    "totalCost" DOUBLE PRECISION,
    "stockedAt" TIMESTAMP(3) NOT NULL,
    "expectedHarvestAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ongoing',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PondStocking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PondFeeding" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pondId" TEXT NOT NULL,
    "stockingId" TEXT,
    "feedType" TEXT NOT NULL,
    "quantityKg" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION,
    "fedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PondFeeding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PondWaterQuality" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pondId" TEXT NOT NULL,
    "ph" DOUBLE PRECISION,
    "temperatureC" DOUBLE PRECISION,
    "dissolvedOxygen" DOUBLE PRECISION,
    "ammonia" DOUBLE PRECISION,
    "turbidity" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PondWaterQuality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PondHarvest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pondId" TEXT NOT NULL,
    "stockingId" TEXT,
    "quantityKg" DOUBLE PRECISION NOT NULL,
    "count" INTEGER,
    "unitPrice" DOUBLE PRECISION,
    "revenue" DOUBLE PRECISION,
    "harvestedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PondHarvest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pond_organizationId_idx" ON "Pond"("organizationId");

-- CreateIndex
CREATE INDEX "Pond_farmId_idx" ON "Pond"("farmId");

-- CreateIndex
CREATE INDEX "PondStocking_organizationId_idx" ON "PondStocking"("organizationId");

-- CreateIndex
CREATE INDEX "PondStocking_pondId_idx" ON "PondStocking"("pondId");

-- CreateIndex
CREATE INDEX "PondFeeding_organizationId_idx" ON "PondFeeding"("organizationId");

-- CreateIndex
CREATE INDEX "PondFeeding_pondId_idx" ON "PondFeeding"("pondId");

-- CreateIndex
CREATE INDEX "PondFeeding_stockingId_idx" ON "PondFeeding"("stockingId");

-- CreateIndex
CREATE INDEX "PondWaterQuality_organizationId_idx" ON "PondWaterQuality"("organizationId");

-- CreateIndex
CREATE INDEX "PondWaterQuality_pondId_idx" ON "PondWaterQuality"("pondId");

-- CreateIndex
CREATE INDEX "PondHarvest_organizationId_idx" ON "PondHarvest"("organizationId");

-- CreateIndex
CREATE INDEX "PondHarvest_pondId_idx" ON "PondHarvest"("pondId");

-- CreateIndex
CREATE INDEX "PondHarvest_stockingId_idx" ON "PondHarvest"("stockingId");

-- AddForeignKey
ALTER TABLE "Pond" ADD CONSTRAINT "Pond_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pond" ADD CONSTRAINT "Pond_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PondStocking" ADD CONSTRAINT "PondStocking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PondStocking" ADD CONSTRAINT "PondStocking_pondId_fkey" FOREIGN KEY ("pondId") REFERENCES "Pond"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PondFeeding" ADD CONSTRAINT "PondFeeding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PondFeeding" ADD CONSTRAINT "PondFeeding_pondId_fkey" FOREIGN KEY ("pondId") REFERENCES "Pond"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PondFeeding" ADD CONSTRAINT "PondFeeding_stockingId_fkey" FOREIGN KEY ("stockingId") REFERENCES "PondStocking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PondWaterQuality" ADD CONSTRAINT "PondWaterQuality_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PondWaterQuality" ADD CONSTRAINT "PondWaterQuality_pondId_fkey" FOREIGN KEY ("pondId") REFERENCES "Pond"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PondHarvest" ADD CONSTRAINT "PondHarvest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PondHarvest" ADD CONSTRAINT "PondHarvest_pondId_fkey" FOREIGN KEY ("pondId") REFERENCES "Pond"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PondHarvest" ADD CONSTRAINT "PondHarvest_stockingId_fkey" FOREIGN KEY ("stockingId") REFERENCES "PondStocking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
