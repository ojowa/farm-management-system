import { clearFetchCache } from '@/hooks/useFetch';

/**
 * Every farm-related `useFetch` key starts with `farm` — the detail key
 * (`farm-${id}`), the list keys (`farms-list-*`, `farms-dropdown`), and the
 * map key (`farm-map`). Clearing that one prefix after any farm write keeps
 * the list, detail, and map screens from serving stale data.
 */
export function clearFarmCaches() {
  clearFetchCache('farm');
}
