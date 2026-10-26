import {
  farmsAPI,
  cropsAPI,
  livestockAPI,
  poultryHousesAPI,
  aquacultureAPI,
  equipmentAPI,
  contractsAPI,
} from '../../services/api';

/**
 * Task.linkedModule — the farm-module record a task was raised against.
 * Must stay in step with the server's zod enum (hr.schema.ts). The mobile
 * picker offers only the seven modules that own a detail screen, so every link
 * it writes is also openable ("field" and "inventory" are valid on the wire
 * but have no mobile record page to jump to).
 */
export type LinkedModule = 'farm' | 'crop' | 'livestock' | 'poultry' | 'aquaculture' | 'equipment' | 'contract';

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
  /** Mobile detail route for the "open record" link. */
  href: (id: string) => string;
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
    key: 'crop',
    label: 'Crop cycle',
    plural: 'Crop cycles',
    // The mobile crop detail screen reads a cycle (getCycle), so the picker
    // offers cycles rather than the bare crop catalogue.
    load: async () =>
      rows(await cropsAPI.listCycles({ limit: 200 })).map((r) => ({
        id: r.id,
        name: labelOf(r, r.cropName || r.crop?.name, r.fieldName || r.field?.name),
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
        name: labelOf(r, r.name, r.species, r.breed),
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
      rows(await aquacultureAPI.listPonds({ limit: 200 })).map((r) => ({ id: r.id, name: r.name })),
    href: (id) => `/aquaculture/${id}`,
  },
  {
    key: 'equipment',
    label: 'Equipment',
    plural: 'Equipment',
    load: async () =>
      rows(await equipmentAPI.list({ limit: 200 })).map((r) => ({ id: r.id, name: r.name })),
    href: (id) => `/equipment/${id}`,
  },
  {
    key: 'contract',
    label: 'Contract',
    plural: 'Contracts',
    // contractsAPI.list takes only { type, status } — no limit — so the picker
    // reads the endpoint's default first page.
    load: async () =>
      rows(await contractsAPI.list()).map((r) => ({
        id: r.id,
        // Same party the contract screens show: buyerSellerName at the DB
        // level, with the legacy DTO aliases behind it.
        name: labelOf(r, r.type, r.buyerSellerName || r.counterpartyName || r.title),
      })),
    href: (id) => `/contracts/${id}`,
  },
];

/** Every module key the server accepts, including the ones the picker skips. */
export const LINKED_MODULE_LABELS: Record<string, string> = {
  ...Object.fromEntries(RECORD_SOURCES.map((s) => [s.key, s.label])),
  field: 'Field',
  inventory: 'Inventory item',
  contract: 'Contract',
};

export function linkedModuleLabel(key?: string | null): string {
  if (!key) return '';
  return LINKED_MODULE_LABELS[key] ?? key;
}

/** Detail route for a linked record, or null when the module is unknown. */
export function linkedRecordHref(module?: string | null, id?: string | null): string | null {
  if (!module || !id) return null;
  const source = RECORD_SOURCES.find((s) => s.key === module);
  return source ? source.href(id) : null;
}

/** Query string that makes /tasks show exactly the tasks linked to one record. */
export function linkedTasksPath(
  linkedModule: string,
  linkedRecordId: string,
  linkedRecordName?: string
): string {
  const params = [`linkedModule=${encodeURIComponent(linkedModule)}`, `linkedRecordId=${encodeURIComponent(linkedRecordId)}`];
  if (linkedRecordName) params.push(`linkedRecordName=${encodeURIComponent(linkedRecordName)}`);
  return `/tasks?${params.join('&')}`;
}
