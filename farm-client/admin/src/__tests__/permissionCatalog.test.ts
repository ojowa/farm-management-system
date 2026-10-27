import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROUTE_PERMISSIONS, requiredPermissionsForPath } from '@/lib/routePermissions';

/**
 * Permission-catalog guard for the full-stack permission audit
 * (`docs/PERMISSIONS_AUDIT.md`).
 *
 * The server is the source of truth for what can be granted: the seed's
 * `permissionData` list. Everything below pins invariants that hold today so
 * a regression fails CI rather than surfacing as a silent 403 or an empty
 * page in production:
 *
 *  1. the catalog parses to the expected 51 keys;
 *  2. every permission `routePermissions.ts` demands exists in the catalog;
 *  3. every permission literal the admin views check exists in the catalog
 *     (a typo'd or renamed key renders a control nobody can ever use);
 *  4. every view under `app/(app)` resolves to a gate — no unlisted route;
 *  5. mobile sidebar rows are catalog-valid and gate identically to admin,
 *     with exactly the two differences the audit documents.
 *
 * Read-only: parses source files the way a reviewer would, like
 * `navPlanGates.test.ts`.
 */

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); // …/admin/src
const adminRoot = path.resolve(here, '..'); // …/admin
const repoRoot = path.resolve(adminRoot, '..', '..'); // …/farm-management-system

const read = (...segments: string[]) => readFileSync(path.resolve(...segments), 'utf8');

/** `farm-server/packages/server/database/prisma/seed.ts` — the catalog. */
const seedSource = read(repoRoot, 'farm-server', 'packages', 'server', 'database', 'prisma', 'seed.ts');

/** Permission keys the seed can grant (`{ name: 'farm.read', … }`). */
function catalogKeys(): Set<string> {
  const block = seedSource.match(/const permissionData = \[([\s\S]*?)\n {2}\]/);
  expect(block, 'seed.ts still declares permissionData').toBeTruthy();
  return new Set(
    [...block![1].matchAll(/name: '([^']+)'/g)].map((match) => match[1])
  );
}

const catalog = catalogKeys();

/** Every `.ts`/`.tsx` file under `dir`, skipping tests. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (['__tests__', 'node_modules', '.next', 'coverage', 'out'].includes(entry)) continue;
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Permission-shaped strings (`module.action`) in a chunk of source. */
function permissionLiterals(source: string): string[] {
  const matches = source.match(/'([a-z][a-z-]*)\.(read|write|delete|manage|approve)'/g) ?? [];
  return matches.map((m) => m.slice(1, -1));
}

/** Unsorted, de-duplicated literals per file so failures name the file. */
function literalsByFile(dir: string): Array<{ file: string; keys: string[] }> {
  return sourceFiles(dir)
    .map((file) => ({
      file: path.relative(repoRoot, file),
      keys: [...new Set(permissionLiterals(readFileSync(file, 'utf8')))],
    }))
    .filter((entry) => entry.keys.length > 0);
}

describe('permission catalog', () => {
  it('parses to the 51 keys the seed declares', () => {
    expect(catalog.size).toBe(51);
  });

  it('covers every permission routePermissions demands', () => {
    const missing = ROUTE_PERMISSIONS.flatMap((route) =>
      route.permissions.filter((key) => !catalog.has(key)).map((key) => `${key} (${route.prefix})`)
    );
    expect(missing).toEqual([]);
  });
});

describe('admin view permission literals', () => {
  // hasPermission('x.y') / hasAnyPermission('a', 'b') / canCreate('domain') …
  // Captured group (`Create`) → the action suffix `usePermission` derives.
  const derived: Record<string, string> = {
    Create: 'write',
    Read: 'read',
    Update: 'write',
    Delete: 'delete',
    Approve: 'manage',
  };

  it('only checks keys the catalog can grant', () => {
    const problems: string[] = [];
    for (const { file, keys } of literalsByFile(adminRoot)) {
      for (const key of keys) {
        if (!catalog.has(key)) problems.push(`${file}: ${key}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('resolves every canX(domain) call to a real key', () => {
    const problems: string[] = [];
    for (const file of sourceFiles(adminRoot)) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/can(Create|Read|Update|Delete|Approve)\('([^']+)'\)/g)) {
        const key = `${match[2]}.${derived[match[1]]}`;
        if (!catalog.has(key)) {
          problems.push(`${path.relative(repoRoot, file)}: ${match[0]} → ${key}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('route coverage', () => {
  it('gates every view under app/(app) — no unlisted route', () => {
    const viewsRoot = path.join(here, 'app', '(app)');
    const ungated: string[] = [];
    for (const file of sourceFiles(viewsRoot)) {
      if (!file.endsWith(`${path.sep}page.tsx`)) continue;
      const rel = path.relative(viewsRoot, file);
      const route =
        '/' +
        rel
          .replace(/\\page\.tsx$/, '')
          .replace(/\/page\.tsx$/, '')
          .replace(/\\/g, '/');
      if (requiredPermissionsForPath(route) === null) ungated.push(route);
    }
    expect(ungated).toEqual([]);
  });
});

describe('mobile parity', () => {
  const mobileConfig = read(
    repoRoot, 'farm-client', 'mobile', 'src', 'core', 'navigation', 'sidebarConfig.ts'
  );

  interface MobileItem { route: string; permissions: string[]; module: string | null }
  const mobileItems: MobileItem[] = [...mobileConfig.matchAll(/route: '([^']+)'/g)].map((m) => {
    // Within an item `route` precedes `permissions` and `module`, so the text
    // up to the next item holds exactly this row's metadata.
    const rest = mobileConfig.slice(m.index! + m[0].length);
    const next = rest.search(/\n\s*route: '/);
    const chunk = next === -1 ? rest : rest.slice(0, next);
    const perms = chunk.match(/permissions: \[([^\]]*)\]/);
    const mod = chunk.match(/module: '([^']+)'/);
    return {
      route: m[1],
      permissions: [...(perms?.[1] ?? '').matchAll(/'([^']+)'/g)].map((p) => p[1]),
      module: mod?.[1] ?? null,
    };
  });

  // The two rows the audit documents as deliberate differences, and the
  // mobile routes with no admin counterpart at all. Any *new* divergence
  // fails the tests below until it is either fixed or added here.
  const WIDER_ON_MOBILE = new Set(['/tasks']);
  const MOBILE_ONLY_ROUTES = new Set(['/', '/leave', '/attendance']);

  it('has parsed every sidebar row', () => {
    expect(mobileItems.length).toBe(24);
  });

  it('only uses catalog-valid permission keys', () => {
    const missing = mobileItems.flatMap((item) =>
      item.permissions.filter((key) => !catalog.has(key)).map((key) => `${item.route}: ${key}`)
    );
    expect(missing).toEqual([]);
  });

  it('gates each shared route exactly like admin', () => {
    const mismatches: string[] = [];
    const unmapped: string[] = [];
    for (const item of mobileItems) {
      const admin = requiredPermissionsForPath(item.route);
      if (admin === null) {
        unmapped.push(item.route);
        continue;
      }
      const sortedAdmin = [...admin].sort().join(',');
      const sortedMobile = [...item.permissions].sort().join(',');
      if (sortedAdmin !== sortedMobile && !WIDER_ON_MOBILE.has(item.route)) {
        mismatches.push(
          `${item.route}: admin=[${sortedAdmin}] mobile=[${sortedMobile}]`
        );
      }
    }
    expect(mismatches).toEqual([]);
    // Routes mobile exposes that the admin map doesn't know about must be a
    // closed list, so a new nav row can't silently skip the admin gate.
    expect(new Set(unmapped)).toEqual(MOBILE_ONLY_ROUTES);
  });

  it('keeps the documented widening on /tasks (both include hr.read)', () => {
    const tasks = mobileItems.find((item) => item.route === '/tasks');
    expect(requiredPermissionsForPath('/tasks')).toEqual(['hr.read']);
    expect(tasks?.permissions).toEqual(['hr.read', 'worker.self']);
  });
});
