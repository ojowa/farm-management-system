/**
 * Shared list-payload normalizers.
 *
 * WHY THIS EXISTS
 * ---------------
 * List endpoints across the API do NOT agree on their answer shape, and the
 * axios interceptor has already stripped the `{ success, data }` gateway
 * envelope by the time a screen sees the body. Depending on the module the
 * inner payload is:
 *
 *   livestock / poultry / aquaculture / finance / inventory / assets
 *       -> `{ data, total, page?, totalPages? }`   (PaginatedResult)
 *   farms  -> `{ farms, total, data }`
 *   crops  -> `{ crops, total, data }`
 *   tasks  -> `{ data, stats }`
 *   reports-> `{ data: { reports, total, ... } }`   (ONE level deeper)
 *   workers / plans / notifications
 *       -> bare `Array`
 *
 * Screens that naively did `res.data || []` and then `.filter` / `.map` /
 * `.reduce` threw a TypeError whenever the endpoint answered an object — the
 * exception escaped into the screen's catch block and surfaced as a full-screen
 * "Couldn't load" error (or a silent empty list) even though the request had
 * SUCCEEDED. That is what made the dashboard error look permanent.
 *
 * Normalize here instead of per-screen so a shape change can never again
 * masquerade as a load failure.
 */

/**
 * Pull the rows out of any list payload shape. Always returns an array —
 * never throws, never returns undefined. Falls back to `[]` so callers render
 * "empty" rather than crashing.
 */
export function unwrapList<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    // `data` first: it is the dominant key, and for reports it nests the rows
    // one level deeper (`{ data: { reports } }`).
    if (Array.isArray(payload.data)) return payload.data as T[];
    if (payload.data && typeof payload.data === 'object') {
      const inner = unwrapList<T>(payload.data);
      if (inner.length) return inner;
    }
    for (const key of ['farms', 'crops', 'items', 'records', 'reports', 'tasks', 'workers', 'plans']) {
      if (Array.isArray(payload[key])) return payload[key] as T[];
    }
  }
  return [];
}

/**
 * The server's pagination `total` when the body carries one, else the length
 * of the rows we actually loaded.
 *
 * `res` is a PromiseSettledResult whose `.value` is the axios response, so the
 * body lives at `value.data` — reading `.total` off `value` directly always
 * missed and silently fell back to the loaded-array length.
 */
export function totalOf(res: PromiseSettledResult<any> | null | undefined, list: any[]): number {
  if (!res || res.status !== 'fulfilled') return list.length;
  const body = res.value?.data;
  const total = body?.total ?? res.value?.total;
  return Number.isFinite(total) ? (total as number) : list.length;
}
