-- Paystack recurring billing: charge ledger, subscription mirror, and the
-- paid-through date that lazy expiry evaluates. Fully additive.

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "subscriptionPaidThrough" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN "paystackPlanCode" TEXT;

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT,
    "planName" TEXT NOT NULL,
    "userId" TEXT,
    "reference" TEXT NOT NULL,
    "subscriptionCode" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'checkout',
    "amount" DECIMAL(65,3) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "channel" TEXT,
    "raw" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaystackSubscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT,
    "planName" TEXT NOT NULL,
    "paystackPlanCode" TEXT,
    "subscriptionCode" TEXT NOT NULL,
    "token" TEXT,
    "customerEmail" TEXT NOT NULL,
    "customerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "cancelReason" TEXT,
    "nextPaymentDate" TIMESTAMP(3),
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaystackSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_reference_key" ON "PaymentTransaction"("reference");

-- CreateIndex
CREATE INDEX "PaymentTransaction_organizationId_createdAt_idx" ON "PaymentTransaction"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaystackSubscription_organizationId_key" ON "PaystackSubscription"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PaystackSubscription_subscriptionCode_key" ON "PaystackSubscription"("subscriptionCode");

-- CreateIndex
CREATE INDEX "PaystackSubscription_status_idx" ON "PaystackSubscription"("status");
