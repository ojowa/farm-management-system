-- Conversion metadata on finance ledger rows.
--
-- Records the exchange rate and timestamp used when an amount was converted
-- to the organization's base currency at write time. Existing ledger rows
-- keep their originally recorded currency/rate; changing the org base
-- currency only affects newly recorded amounts.
--
-- rate:         1 unit of `currency` = `rate` units of org base currency
-- convertedAt:  when the conversion was performed

ALTER TABLE "Expense" ADD COLUMN "rate" DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE "Expense" ADD COLUMN "convertedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Sale" ADD COLUMN "rate" DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE "Sale" ADD COLUMN "convertedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Contract" ADD COLUMN "rate" DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE "Contract" ADD COLUMN "convertedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "MarketListing" ADD COLUMN "rate" DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE "MarketListing" ADD COLUMN "convertedAt" TIMESTAMP(3) NOT NULL DEFAULT now();
