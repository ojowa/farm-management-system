-- An expense can now be manually linked to a budget category
-- (Expense.budgetCategoryId -> BudgetCategory.id).
--
-- The link is optional: expenses without it keep the existing behaviour of
-- being attributed to a category by title matching in refreshBudget. When it
-- is set, it wins over title matching.
--
-- ON DELETE SET NULL mirrors Prisma (deleting a category unlinks its
-- expenses instead of deleting them).

ALTER TABLE "Expense" ADD COLUMN "budgetCategoryId" TEXT;

CREATE INDEX IF NOT EXISTS "Expense_budgetCategoryId_idx" ON "Expense"("budgetCategoryId");

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_budgetCategoryId_fkey"
  FOREIGN KEY ("budgetCategoryId") REFERENCES "BudgetCategory"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
