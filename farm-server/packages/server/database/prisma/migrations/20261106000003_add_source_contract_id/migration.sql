-- Source contract link on Expense and Sale for recurring generation.
--
-- sourceContractId references the Contract this row was generated from.
-- Nullable; rows created manually have no source contract.

ALTER TABLE "Expense" ADD COLUMN "sourceContractId" TEXT;
ALTER TABLE "Sale" ADD COLUMN "sourceContractId" TEXT;

CREATE INDEX IF NOT EXISTS "Expense_sourceContractId_idx" ON "Expense"("sourceContractId");
CREATE INDEX IF NOT EXISTS "Sale_sourceContractId_idx" ON "Sale"("sourceContractId");
