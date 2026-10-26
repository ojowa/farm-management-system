import {
  farmsAPI,
  fieldsAPI,
  cropsAPI,
  livestockAPI,
  aquacultureAPI,
  poultryHousesAPI,
  inventoryAPI,
  equipmentAPI,
  contractsAPI,
} from '@/lib/api';

/**
 * Task.linkedModule — the farm-module record a task was raised against.
 * The key set must stay in step with the server's zod enum (hr.schema.ts):
 * all nine modules are offered here, `field` included. A source may omit
 * `href` while its module has no detail page (`equipment`), but it still has
 * to *load*, otherwise a link could be picked but never re-chosen.
 */
export type LinkedModule =
  | 'farm'
  | 'field'
  | 'crop'
  | 'livestock'
  | 'poultry'
  | 'aquaculture'
  | 'equipment'
  | 'inventory'
  | 'contract';

export interface RecordOption {
  id: string;
  name: string;
}

export interface RecordSource {
  key: LinkedModule;
  /** Singular label for the module picker, e.g. "Pond". */
  label: string;
  /** Heading for lists of these records, e.g. "Ponds". */
  plural: string;
  /** Loads the records offered by the picker (first page, unfiltered). */
  load: () => Promise<RecordOption[]>;
  /** Detail route for the "open record" link — null when the module has no detail page. */
  href?: (id: string) => string;
}

/** List endpoints disagree on shape: bare array, `{ data }` or `{ items }`. */
function rows(res: any): any[] {
  if (Array.isArray(res)) return res;
  return res?.data ?? res?.items ?? [];
}

const labelOf = (row: any, ...parts: Array<string | undefined | null>) =>
  parts.filter(Boolean).join(' · ') || String(row?.id ?? '');

export const RECORD_SOURCES: RecordSource[] = [
  {
    key: 'farm',
    label: 'Farm',
    plural: 'Farms',
    load: async () =>
      rows(await farmsAPI.list({ limit: 200 })).map((r) => ({ id: r.id, name: r.name })),
    href: (id) => `/farms/${id}`,
  },
  {
    key: 'field',
    label: 'Field',
    plural: 'Fields',
    // No farmId: the server answers with the whole organisation's parcels,
    // each carrying its farm so two parcels called "North" stay apart.
    load: async () =>
      rows(await fieldsAPI.list({})).map((r) => ({
        id: r.id,
        name: labelOf(r, r.name, r.farm?.name),
      })),
    href: (id) => `/fields/${id}`,
  },
  {
    key: 'crop',
    label: 'Crop cycle',
    plural: 'Crop cycles',
    load: async () =>
      rows(await cropsAPI.listCycles({ limit: 200 })).map((r) => ({
        id: r.id,
        name: labelOf(r, r.cropName, r.fieldName),
      })),
    href: (id) => `/crops/${id}`,
  },
  {
    key: 'livestock',
    label: 'Livestock',
    plural: 'Livestock',
    load: async () =>
      rows(await livestockAPI.list({ limit: 200 })).map((r) => ({
        id: r.id,
        name: labelOf(r, r.species, r.breed),
      })),
    href: (id) => `/livestock/${id}`,
  },
  {
    key: 'poultry',
    label: 'Poultry house',
    plural: 'Poultry houses',
    load: async () =>
      rows(await poultryHousesAPI.list({ limit: 200 })).map((r) => ({ id: r.id, name: r.name })),
    href: (id) => `/poultry/houses/${id}`,
  },
  {
    key: 'aquaculture',
    label: 'Pond',
    plural: 'Ponds',
    load: async () =>
      rows(await aquacultureAPI.ponds.list({ limit: 200 })).map((r) => ({ id: r.id, name: r.name })),
    href: (id) => `/aquaculture/${id}`,
  },
  {
    key: 'inventory',
    label: 'Inventory item',
    plural: 'Inventory',
    load: async () =>
      rows(await inventoryAPI.list({ limit: 200 })).map((r) => ({ id: r.id, name: r.name })),
    href: (id) => `/inventory/${id}`,
  },
  {
    key: 'equipment',
    label: 'Equipment',
    plural: 'Equipment',
    load: async () =>
      rows(await equipmentAPI.list({ limit: 200 })).map((r) => ({ id: r.id, name: r.name })),
    // No equipment detail page yet — the link still filters the tasks list.
  },
  {
    key: 'contract',
    label: 'Contract',
    plural: 'Contracts',
    load: async () =>
      rows(await contractsAPI.list({ limit: 200 })).map((r) => ({
        id: r.id,
        name: labelOf(r, r.type, r.counterpartyName || r.buyerSellerName),
      })),
    href: (id) => `/contracts/${id}`,
  },
];

/** Every module key the server accepts — all nine are now pickable. */
export const LINKED_MODULE_LABELS: Record<string, string> = Object.fromEntries(
  RECORD_SOURCES.map((s) => [s.key, s.label])
);

export function linkedModuleLabel(key?: string | null): string {
  if (!key) return '';
  return LINKED_MODULE_LABELS[key] ?? key;
}

/** Detail route for a linked record, or null when the module has no detail page. */
export function linkedRecordHref(module?: string | null, id?: string | null): string | null {
  if (!module || !id) return null;
  const source = RECORD_SOURCES.find((s) => s.key === module);
  return source?.href ? source.href(id) : null;
}

/** Query params that make /tasks show exactly the tasks linked to one record. */
export function linkedTasksQuery(linkedModule?: string | null, linkedRecordId?: string | null) {
  return linkedModule && linkedRecordId ? { linkedModule, linkedRecordId } : {};
}

/** Prefill params for /tasks/new so a record's panel opens a ready-made form. */
export function newTaskQuery(linkedModule: string, linkedRecordId: string, linkedRecordName: string) {
  return { linkedModule, linkedRecordId, linkedRecordName };
}
