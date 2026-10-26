import { SIDEBAR_SECTIONS, isSidebarItemVisible } from '../core/navigation/sidebarConfig';

// ─── Sidebar config audit ─────────────────────────────────────────────────────
// The rendering side is covered by sidebar.test.tsx; this guards the data:
// the People entries a task/department link navigates to, and the plan-module
// names, which must stay a subset of what the billing plan actually declares.

/** The 12 plan modules admin's MODULE_OPTIONS offers (plus owner-only billing). */
const KNOWN_PLAN_MODULES = [
  'farm',
  'crop',
  'livestock',
  'poultry',
  'aquaculture',
  'inventory',
  'finance',
  'worker',
  'communication',
  'reporting',
  'notification',
  'hr',
  'billing.manage',
];

const allItems = SIDEBAR_SECTIONS.flatMap((section) => section.items);

const findItem = (label: string) => {
  const item = allItems.find((i) => i.label === label);
  if (!item) throw new Error(`sidebarConfig has no "${label}" entry`);
  return item;
};

describe('sidebarConfig audit', () => {
  it('routes the People entries a task or department row links to', () => {
    // The task detail's Department row pushes /workers?department=…
    expect(findItem('Workers')).toMatchObject({
      route: '/workers',
      module: 'hr',
      permissions: ['hr.read'],
    });
    expect(findItem('Roster')).toMatchObject({
      route: '/roster',
      module: 'hr',
      permissions: ['hr.read'],
    });
    // Tasks widens to worker.read so the tab bar and the menu agree.
    expect(findItem('Tasks')).toMatchObject({
      route: '/tasks',
      module: 'worker',
      permissions: ['hr.read', 'worker.read'],
    });
    expect(findItem('Attendance')).toMatchObject({
      route: '/attendance',
      module: 'hr',
      permissions: ['hr.read', 'worker.read'],
    });
  });

  it('only names plan modules the plans actually declare', () => {
    for (const item of allItems) {
      if (item.module === null) continue;
      expect(KNOWN_PLAN_MODULES).toContain(item.module);
    }
  });

  it('gives every entry a route and a permission list (any-of semantics)', () => {
    for (const section of SIDEBAR_SECTIONS) {
      for (const item of section.items) {
        expect(item.route).toBeTruthy();
        expect(Array.isArray(item.permissions)).toBe(true);
      }
    }
  });

  it('keeps isSidebarItemVisible in step with the module + permission gates', () => {
    const tasks = findItem('Tasks');
    const hasWorkerRead = (perm: string) => perm === 'worker.read';

    // Module gate: a plan that does not list `worker` hides the entry …
    expect(isSidebarItemVisible(tasks, ['farm'], hasWorkerRead)).toBe(false);
    // … an empty list means "no plan linked" and hides nothing …
    expect(isSidebarItemVisible(tasks, [], hasWorkerRead)).toBe(true);
    // … and permission is ANY-of, so worker.read alone still shows it.
    expect(isSidebarItemVisible(tasks, ['worker'], hasWorkerRead)).toBe(true);
    expect(isSidebarItemVisible(tasks, ['worker'], () => false)).toBe(false);
  });
});
