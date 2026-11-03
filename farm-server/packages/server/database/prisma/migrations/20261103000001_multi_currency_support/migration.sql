-- Multi-currency support for finance records.
--
-- Adds a Currency registry (ISO codes), an ExchangeRate table for conversion
-- rates, a base-currency field on Organization, and currency + converted
-- amount columns on the money-carrying tables (Expense, Sale, Contract,
-- MarketListing, BudgetCategory).
--
-- amount/value/price keep the originally entered amount in `currency`;
-- amountInBase stores the value converted to the organization's base
-- currency at write time (using the latest ExchangeRate), so historic
-- ledger totals are stable and comparable.

-- Organization base / reporting currency (default USD)
ALTER TABLE "Organization" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';

-- Currency registry (ISO 4217 codes)
CREATE TABLE "Currency" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Exchange rates: 1 unit of fromCurrency = rate units of toCurrency
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "source" TEXT
);

CREATE INDEX IF NOT EXISTS "ExchangeRate_fromCurrency_toCurrency_idx" ON "ExchangeRate"("fromCurrency", "toCurrency");
CREATE INDEX IF NOT EXISTS "ExchangeRate_effectiveAt_idx" ON "ExchangeRate"("effectiveAt");

ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_fromCurrency_fkey"
    FOREIGN KEY ("fromCurrency") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_toCurrency_fkey"
    FOREIGN KEY ("toCurrency") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Expense
ALTER TABLE "Expense" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "Expense" ADD COLUMN "amountInBase" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Sale
ALTER TABLE "Sale" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "Sale" ADD COLUMN "amountInBase" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- BudgetCategory
ALTER TABLE "BudgetCategory" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';

-- Contract
ALTER TABLE "Contract" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "Contract" ADD COLUMN "amountInBase" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- MarketListing
ALTER TABLE "MarketListing" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "MarketListing" ADD COLUMN "amountInBase" DOUBLE PRECISION NOT NULL DEFAULT 0;
