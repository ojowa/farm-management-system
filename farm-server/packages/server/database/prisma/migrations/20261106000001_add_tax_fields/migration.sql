-- Tax fields on finance money-carrying tables.
--
-- amount is stored tax-exclusive (net). taxRate is the percentage rate
-- (e.g. 7.5 for 7.5%). taxAmount is the computed tax = round(amount * taxRate / 100, 2).
-- Defaults are 0 so existing rows and tax-free transactions are unaffected.

ALTER TABLE "Expense" ADD COLUMN "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Expense" ADD COLUMN "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "Sale" ADD COLUMN "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Sale" ADD COLUMN "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "Contract" ADD COLUMN "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Contract" ADD COLUMN "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "MarketListing" ADD COLUMN "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "MarketListing" ADD COLUMN "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
