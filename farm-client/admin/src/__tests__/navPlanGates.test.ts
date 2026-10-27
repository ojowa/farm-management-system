import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROUTE_PERMISSIONS, requiredPermissionsForPath } from '@/lib/routePermissions';

/**
 * Source guards for the nav + plan-gate audit: the sidebar's `navigation`
 * array is module-private, so these tests read the files the way a reviewer
 * would rather than re-rendering the whole layout. They pin three things:
 *
 *  1. Workers / Roster / Tasks are reachable from the sidebar with the plan
 *     module the server actually gates them on;
 *  2. every sidebar href is covered by routePermissions.ts, so no entry can
 *     offer a link the guard on arrival would bounce;
 *  3. admin and mobile agree on href/module/permissions for the HR trio —
 *     the two clients gate the same server routes with the same strings.
 */

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const read = (...segments: string[]) => readFileSync(path.resolve(here, ...segments), 'utf8');

const sidebarSource = read('components', 'Sidebar.tsx');
const mobileSidebarSource = read(
  '..',
  '..',
  'mobile',
  'src',
  'core',
  'navigation',
  'sidebarConfig.ts'
);

/** Plan-module keys the server's features module declares (see Sidebar docs). */
const PLAN_MODULES = new Set([
  'farm',
  'crop',
  'livestock',
  'poultry',
  'aquaculture',
  'inventory',
  'finance',
  'worker',
  'hr',
  'communication',
  'reporting',
  'notification',
]);

/** `{ name: 'Workers', href: '/workers', ..., module: 'hr' }` per line. */
function adminNavItems(): Array<{ name: string; href: string; module?: string }> {
  return [...sidebarSource.matchAll(/\{ name: '([^']+)', href: '([^']+)'[^}]*\}/g)].map(
    (match) => {
      const moduleMatch = match[0].match(/module: '([^']+)'/);
      return { name: match[1], href: match[2], module: moduleMatch?.[1] };
    }
  );
}

const adminItems = adminNavItems();

/** The chunk of mobile source describing one item, for cheap assertions. */
function mobileItem(route: string): string {
  const index = mobileSidebarSource.indexOf(`route: '${route}'`);
  expect(index, `mobile sidebar has an entry for ${route}`).toBeGreaterThan(-1);
  // Items are written `route:` → `permissions:` → `module:`, so everything
  // this needs follows the route key; starting there keeps the *previous*
  // item's module out of the chunk.
  return mobileSidebarSource.slice(index, index + 300);
}

describe('sidebar nav items', () => {
  it('lists Workers, Roster and Tasks with the modules the plan gates them on', () => {
    const byHref = new Map(adminItems.map((item) => [item.href, item]));

    expect(byHref.get('/workers')).toMatchObject({ name: 'Workers', module: 'hr' });
    expect(byHref.get('/roster')).toMatchObject({ name: 'Roster', module: 'hr' });
    expect(byHref.get('/tasks')).toMatchObject({ name: 'Tasks', module: 'worker' });
  });

  it('uses only known plan-module keys', () => {
    const unknown = adminItems
      .filter((item) => item.module && !PLAN_MODULES.has(item.module))
      .map((item) => `${item.name} → ${item.module}`);

    expect(unknown).toEqual([]);
  });

  it('covers every sidebar href in routePermissions (except the root)', () => {
    const uncovered = adminItems
      .filter((item) => item.href !== '/' && requiredPermissionsForPath(item.href) === null)
      .map((item) => item.href);

    expect(uncovered).toEqual([]);
  });

  it('gates /workers/departments on worker.read (the directory) and /workers/attendance on the attendance keys', () => {
    expect(requiredPermissionsForPath('/workers/departments')).toEqual(['worker.read']);
    // Served by the attendance controller, not the directory (see the map).
    expect(requiredPermissionsForPath('/workers/attendance')).toEqual([
      'hr.read',
      'worker.self',
    ]);
    expect(requiredPermissionsForPath('/roster')).toEqual(['hr.read']);
    expect(requiredPermissionsForPath('/tasks')).toEqual(['hr.read']);
  });
});

describe('workers section tabs', () => {
  it.each(['page.tsx', path.join('attendance', 'page.tsx'), path.join('departments', 'page.tsx')])(
    'exposes all three tabs on workers/%s',
    (relative) => {
      const source = read('app', '(app)', 'workers', relative);
      expect(source).toContain("label: 'Workers', href: '/workers'");
      expect(source).toContain("label: 'Attendance', href: '/workers/attendance'");
      expect(source).toContain("label: 'Departments', href: '/workers/departments'");
    }
  );
});

describe('admin ↔ mobile parity', () => {
  it('Workers: same href, module and permissions', () => {
    const chunk = mobileItem('/workers');
    expect(chunk).toContain("module: 'hr'");
    // Directory access on both clients — the same worker.read the API enforces.
    expect(chunk).toContain("permissions: ['worker.read']");
    expect(adminItems.find((i) => i.name === 'Workers')?.href).toBe('/workers');
  });

  it('Roster: same href, module and permissions', () => {
    const chunk = mobileItem('/roster');
    expect(chunk).toContain("module: 'hr'");
    expect(chunk).toContain("permissions: ['hr.read']");
    expect(adminItems.find((i) => i.name === 'Roster')?.href).toBe('/roster');
  });

  it('Tasks: same href and module; mobile widens to worker.self deliberately', () => {
    const chunk = mobileItem('/tasks');
    expect(chunk).toContain("module: 'worker'");
    // Admin gates /tasks on hr.read alone (routePermissions); mobile accepts
    // worker.self too because its tab bar also serves field workers (their own
    // tasks, ownership-scoped server-side). Both must include hr.read.
    expect(chunk).toContain("permissions: ['hr.read', 'worker.self']");
    expect(requiredPermissionsForPath('/tasks')).toEqual(['hr.read']);
    expect(adminItems.find((i) => i.name === 'Tasks')?.href).toBe('/tasks');
  });

  it('declares the same plan-module keys as mobile for the HR entries', () => {
    for (const route of ['/workers', '/roster', '/tasks']) {
      const chunk = mobileItem(route);
      const moduleMatch = chunk.match(/module: '([^']+)'/);
      const adminItem = adminItems.find((i) => i.href === route);
      expect(moduleMatch?.[1], `${route} module parity`).toBe(adminItem?.module);
    }
  });
});

describe('routePermissions coverage', () => {
  it('keeps the HR family on hr.read, with the worker directory on worker.read', () => {
    for (const prefix of ['/tasks', '/roster', '/correspondence']) {
      expect(ROUTE_PERMISSIONS.find((r) => r.prefix === prefix)?.permissions).toEqual([
        'hr.read',
      ]);
    }
    // The directory moved off hr.read so supervisors/vets (hr.read) no longer
    // see the roster; attendance mirrors its own controller's keys.
    expect(ROUTE_PERMISSIONS.find((r) => r.prefix === '/workers')?.permissions).toEqual([
      'worker.read',
    ]);
    expect(
      ROUTE_PERMISSIONS.find((r) => r.prefix === '/workers/attendance')?.permissions
    ).toEqual(['hr.read', 'worker.self']);
  });
});
