-- Transaction status lifecycle on Expense and Sale.
--
-- status: DRAFT | PENDING | POSTED | VOIDED. Default POSTED preserves
-- existing behavior (rows are committed on creation). VOIDED rows are
-- excluded from profitability and budget spend aggregations.

ALTER TABLE "Expense" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'POSTED';
ALTER TABLE "Sale" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'POSTED';
