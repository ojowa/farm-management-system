export type SortOrder = 'asc' | 'desc';

/**
 * Builds a Prisma `orderBy` object while ignoring unknown column names.
 *
 * Sort columns come from query strings, and several models (Crop, Report,
 * Organization, PoultryHouse, Pen, Breed, Field) were created without a
 * `createdAt` column. Passing one of those to Prisma throws
 * `Unknown argument 'createdAt'`, so anything not explicitly allowed here
 * falls back to a column that is guaranteed to exist.
 */
export function safeOrderBy(
  sortBy: string | undefined,
  sortOrder: string | undefined,
  allowed: readonly string[],
  fallback: string,
): Record<string, SortOrder> {
  const field = sortBy && allowed.includes(sortBy) ? sortBy : fallback;
  return { [field]: sortOrder === 'asc' ? 'asc' : 'desc' };
}
