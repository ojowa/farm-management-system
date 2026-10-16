import { AsyncLocalStorage } from 'async_hooks';

/**
 * Soft delete for tenant-content models.
 *
 * Every model listed in SOFT_DELETE_MODELS carries a `deletedAt DateTime?`
 * column in the Prisma schema. clients.ts wires this extension into both
 * exported clients so the behavior is automatic for every consumer:
 *
 *  - reads (findUnique, findFirst, findMany, count, aggregate, groupBy and
 *    the *OrThrow variants) skip soft-deleted rows;
 *  - update / upsert lookups only match live rows, so touching a deleted row
 *    fails with the usual not-found (P2025) error;
 *  - delete / deleteMany stamp `deletedAt` instead of removing the row and
 *    keep the original result shapes (record / { count });
 *  - runWithSoftDeleteBypass(fn) disables all of the above inside fn, so the
 *    deleted-data admin endpoints can list, restore and purge soft-deleted rows.
 *
 * Models outside the set (auth plumbing, platform tables, shared catalogs,
 * Organization/User) keep hard-delete semantics — e.g. the platform purge of
 * an organization must really remove rows.
 *
 * Tradeoffs worth knowing:
 *  - natural-key uniqueness is enforced by partial unique indexes
 *    (`WHERE "deletedAt" IS NULL`, see migration
 *    20261014140000_soft_delete_partial_uniques), so soft-deleted rows no
 *    longer block re-creating an entity with the same key;
 *  - nested relation reads via `include` are not filtered.
 */

export const SOFT_DELETE_MODELS: ReadonlySet<string> = new Set([
  // Farm & fields
  'Farm',
  'Field',
  // Poultry
  'PoultryHouse',
  'Pen',
  'Flock',
  'FeedingRecord',
  'VaccinationRecord',
  'MortalityRecord',
  'Medication',
  'EggProduction',
  'PoultrySale',
  // Crops
  'CropCycle',
  'CropStage',
  // Livestock
  'Livestock',
  'HealthRecord',
  'VaccinationSchedule',
  'BreedingRecord',
  'WeightRecord',
  // Farm operations
  'Inventory',
  'Equipment',
  'MaintenanceRecord',
  'Document',
  // Finance & marketplace
  'Expense',
  'Sale',
  'Budget',
  'BudgetCategory',
  'Contract',
  'Buyer',
  'MarketListing',
  // HR & internal communication
  'Worker',
  'Task',
  'Attendance',
  'Shift',
  'ShiftAssignment',
  'LeaveType',
  'LeaveRequest',
  'LeaveBalance',
  'Message',
  'MessageRecipient',
  'Correspondence',
  'CorrespondenceAttachment',
  // Reports & agronomy
  'Report',
  'ScheduledReport',
  'IrrigationSchedule',
  'IrrigationLog',
  'PestDiseaseRecord',
  'YieldRecord',
  // Notifications
  'Notification',
]);

const softDeleteBypass = new AsyncLocalStorage<boolean>();

/**
 * Run `fn` with soft-delete semantics disabled: reads see soft-deleted rows
 * and delete/deleteMany remove the row for real. Used by the deleted-data
 * admin endpoints (list / restore / purge).
 */
export function runWithSoftDeleteBypass<T>(fn: () => T): T {
  return softDeleteBypass.run(true, fn);
}

const LIVE_ROW_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'upsert',
]);

/**
 * Query-hook factory. It closes over the RAW client because a Prisma query
 * hook cannot switch operations (`query()` only re-runs the original one), so
 * delete/deleteMany are replayed as soft updates on the raw client instead.
 */
export function makeSoftDeleteHook(rawClient: any) {
  return {
    async $allOperations({
      model,
      operation,
      args,
      query,
    }: {
      model: string;
      operation: string;
      args: any;
      query: (args: any) => Promise<any>;
    }) {
      if (!SOFT_DELETE_MODELS.has(model) || softDeleteBypass.getStore()) return query(args);

      if (operation === 'delete' || operation === 'deleteMany') {
        // Restrict the update to live rows so deleting an already-deleted
        // row keeps failing with the usual not-found error.
        const where = { ...(args?.where ?? {}), deletedAt: null };
        const data = { deletedAt: new Date() };
        const target = rawClient[model];
        if (operation === 'delete') {
          const extra: Record<string, unknown> = {};
          if (args?.select) extra.select = args.select;
          if (args?.include) extra.include = args.include;
          return target.update({ where, data, ...extra });
        }
        return target.updateMany({ where, data });
      }

      if (LIVE_ROW_OPERATIONS.has(operation)) {
        const next = { ...(args ?? {}) };
        next.where = { ...(next.where ?? {}), deletedAt: null };
        return query(next);
      }

      return query(args);
    },
  };
}
