/**
 * Unified response parser for API responses.
 *
 * Backend returns direct arrays: `GET /farms` → `[...]`
 * Backend may wrap responses:   `GET /farms` → `{ data: [...], total: N }`
 *
 * This module handles both formats consistently.
 */

/** Axios response shape (response.data is the HTTP body). */
export interface ApiResponse<T = any> {
  data: T;
  total?: number;
  [key: string]: any;
}

/**
 * Extract an array from an API response, handling both formats:
 * - Direct:  response.data = [...]
 * - Wrapped: response.data = { data: [...] }
 *
 * @returns Array of items, or empty array if extraction fails.
 */
export function extractArray<T>(response: ApiResponse): T[] {
  const payload = response.data;
  const arr = payload.data ?? payload;
  return Array.isArray(arr) ? arr : [];
}

/**
 * Extract pagination total from an API response.
 * Falls back to the array length when no total is provided.
 */
export function extractTotal(response: ApiResponse, fallbackLength: number): number {
  const payload = response.data;
  return payload.total ?? fallbackLength;
}
