import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  RECORD_SOURCES,
  LINKED_MODULE_LABELS,
  linkedModuleLabel,
  linkedRecordHref,
} from '@/lib/taskLinks';
import { fieldsAPI, contractsAPI } from '@/lib/api';
import { requiredPermissionsForPath } from '@/lib/routePermissions';

/**
 * The task-link picker against the two things that used to drop a link on
 * the floor: modules the server accepts but the admin form could not offer
 * (`field`, which needs a farmId; `contract`, which had no detail route) and
 * hrefs pointing at pages that do not exist.
 *
 * Read as three questions: does the picker cover the server's enum, does
 * every offered record open somewhere, and does the route it opens exist.
 */

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...segments: string[]) => readFileSync(path.resolve(here, ...segments), 'utf8');

/** The server's zod enum — the wire contract the picker has to mirror. */
const serverLinkedModules = (() => {
  const schemaPath = path.resolve(
    here,
    '..',
    '..',
    '..',
    'farm-server',
    'packages',
    'server',
    'validation',
    'src',
    'hr.schema.ts'
  );
  const source = readFileSync(schemaPath, 'utf8');
  const block = source.match(/const linkedModule = z\.enum\(\[([\s\S]*?)\]\)/)?.[1] ?? '';
  return [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
})();

vi.mock('@/lib/api', () => {
  const rows = (data: any[]) => async () => ({ data });
  return {
    farmsAPI: { list: rows([{ id: 'f1', name: 'Green Acres' }]) },
    // No farmId anywhere: this is the call the picker makes.
    fieldsAPI: {
      list: vi.fn(
        rows([
          { id: 'p1', name: 'North', farm: { id: 'f1', name: 'Green Acres' } },
          { id: 'p2', name: 'South', farm: { id: 'f2', name: 'Hill Farm' } },
        ])
      ),
    },
    cropsAPI: { listCycles: rows([]) },
    livestockAPI: { list: rows([]) },
    poultryHousesAPI: { list: rows([]) },
    aquacultureAPI: { ponds: { list: rows([]) } },
    inventoryAPI: { list: rows([]) },
    equipmentAPI: { list: rows([]) },
    contractsAPI: { list: rows([]) },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

const source = (key: string) => {
  const found = RECORD_SOURCES.find((s) => s.key === key);
  expect(found, `picker has a source for "${key}"`).toBeTruthy();
  return found!;
};

describe('picker ↔ server enum parity', () => {
  it('parses the server enum at all', () => {
    expect(serverLinkedModules.length).toBeGreaterThan(0);
    expect(serverLinkedModules).toContain('field');
    expect(serverLinkedModules).toContain('contract');
  });

  it('offers exactly the modules the server accepts', () => {
    const picked = RECORD_SOURCES.map((s) => s.key).sort();
    expect(picked).toEqual([...serverLinkedModules].sort());
  });

  it('labels every module, so an unknown key never leaks to the UI', () => {
    for (const key of serverLinkedModules) {
      expect(LINKED_MODULE_LABELS[key], `label for ${key}`).toBeTruthy();
    }
    expect(linkedModuleLabel('field')).toBe('Field');
    expect(linkedModuleLabel('contract')).toBe('Contract');
    expect(linkedModuleLabel(null)).toBe('');
  });
});

describe('field source', () => {
  it('lists parcels without a farmId and disambiguates them by farm', async () => {
    const options = await source('field').load();

    expect(fieldsAPI.list).toHaveBeenCalledWith({});
    expect(options).toEqual([
      { id: 'p1', name: 'North · Green Acres' },
      { id: 'p2', name: 'South · Hill Farm' },
    ]);
  });

  it('opens the field detail page', () => {
    expect(linkedRecordHref('field', 'p1')).toBe('/fields/p1');
    expect(linkedRecordHref('field', null)).toBeNull();
    expect(linkedRecordHref('field', 'p1')).not.toBeNull();
  });
});

describe('detail routes', () => {
  it('gives every module an href except equipment, which has no page yet', () => {
    const withoutHref = RECORD_SOURCES.filter((s) => !s.href).map((s) => s.key);
    expect(withoutHref).toEqual(['equipment']);
  });

  it('builds a contract href the contracts list can actually serve', () => {
    expect(linkedRecordHref('contract', 'c1')).toBe('/contracts/c1');
    expect(linkedRecordHref('nonsense', 'c1')).toBeNull();
  });

  it.each([
    ['field', ['fields', '[id]', 'page.tsx']],
    ['contract', ['contracts', '[id]', 'page.tsx']],
  ])('has a /%s detail page carrying the record tasks panel', (moduleKey, segments) => {
    const page = read('app', '(app)', ...segments);
    expect(page).toContain(`moduleKey="${moduleKey}"`);
  });

  it('has an edit page for contracts, matching the list row and detail buttons', () => {
    const detail = read('app', '(app)', 'contracts', '[id]', 'page.tsx');
    expect(detail).toContain('/edit');

    const editPath = path.resolve(here, 'app', '(app)', 'contracts', '[id]', 'edit', 'page.tsx');
    expect(existsSync(editPath), 'contracts/[id]/edit/page.tsx exists').toBe(true);
    expect(readFileSync(editPath, 'utf8')).toContain('contractsAPI.update');
  });

  it('gates both new detail routes on the permission their API enforces', () => {
    // FieldController and ContractController are @Permission('farm.read') /
    // @Permission('finance.read') — an unlisted prefix would let the guard
    // admit a user the API then rejects.
    expect(requiredPermissionsForPath('/fields/p1')).toEqual(['farm.read']);
    expect(requiredPermissionsForPath('/contracts/c1')).toEqual(['finance.read']);
  });
});
