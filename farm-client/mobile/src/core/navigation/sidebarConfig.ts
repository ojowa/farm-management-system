/**
 * Mobile navigation sidebar — mirrors the admin portal's left nav
 * (admin/src/components/Sidebar.tsx): the same 8 sections and 23 items, in the
 * same order, with the same plan-module + permission gating rules.
 *
 * `route` is the in-app destination. Every admin item now has a mobile screen,
 * so no entry is null anymore. Inventory and Reports only exist as sub-views
 * on mobile, so they route to those. Poultry, Workers and Equipment have full
 * CRUD screens (`/poultry`, `/workers`, `/equipment` — list + add + detail +
 * edit); Users, Roles, Correspondence and Contracts have list + detail screens
 * (create lives in the list's inline modal), Roster and Marketplace are single
 * screens, and Weather is a plan-free read-only screen.
 *
 * `permissions` mirror admin's routePermissions.ts (the strings the API
 * actually enforces), matched with ANY-of semantics; an empty list means every
 * signed-in user. Tasks is the one deliberate widening: the admin gates
 * /tasks on hr.read while the mobile tab bar gates Tasks on worker.read, so
 * both are accepted here — otherwise a user who sees the Tasks tab would not
 * see the Tasks menu item.
 */

export interface SidebarItem {
  label: string;
  /** Emoji standing in for the admin portal's lucide icons (mobile uses emoji). */
  icon: string;
  /** In-app route (every admin item now has a mobile screen; none are null). */
  route: string | null;
  /** ANY-of permission list; empty = open to every signed-in user (as admin). */
  permissions: string[];
  /** Plan module that gates the item (null = not plan-gated). */
  module: string | null;
}

export interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', icon: '🏠', route: '/', permissions: [], module: null }],
  },
  {
    label: 'Access',
    items: [
      { label: 'Users', icon: '👤', route: '/users', permissions: ['users.manage'], module: null },
      {
        label: 'Roles',
        icon: '🛡️',
        route: '/roles',
        permissions: ['role.read', 'organization.read'],
        module: null,
      },
    ],
  },
  {
    label: 'Farming',
    items: [
      { label: 'Farms', icon: '🌾', route: '/farms', permissions: ['farm.read'], module: 'farm' },
      { label: 'Crops', icon: '🌱', route: '/crops', permissions: ['crop.read'], module: 'crop' },
      {
        label: 'Livestock',
        icon: '🐄',
        route: '/livestock',
        permissions: ['livestock.read'],
        module: 'livestock',
      },
      { label: 'Poultry', icon: '🥚', route: '/poultry', permissions: ['poultry.read'], module: 'poultry' },
      {
        label: 'Aquaculture',
        icon: '🐟',
        route: '/aquaculture',
        permissions: ['aquaculture.read'],
        module: 'aquaculture',
      },
    ],
  },
  {
    label: 'Assets',
    items: [
      {
        label: 'Inventory',
        icon: '📦',
        route: '/inventory/low-stock',
        permissions: ['farm.read', 'inventory.read'],
        module: 'inventory',
      },
      {
        label: 'Equipment',
        icon: '🔧',
        route: '/equipment',
        permissions: ['farm.read', 'inventory.read'],
        module: 'inventory',
      },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Workers', icon: '👷', route: '/workers', permissions: ['hr.read'], module: 'hr' },
      { label: 'Roster', icon: '📅', route: '/roster', permissions: ['hr.read'], module: 'hr' },
      {
        label: 'Tasks',
        icon: '✅',
        route: '/tasks',
        permissions: ['hr.read', 'worker.read'],
        module: 'worker',
      },
      // Attendance is a first-class mobile screen (`/attendance`) that the
      // dashboard links to via "View all", but it had no sidebar entry — so
      // the only way in was that one link. Mirrors admin, where attendance is
      // a child of Workers; on mobile it earns its own row because clocking
      // in/out is a worker's primary daily action. `worker.read` is included
      // so a worker (no hr.read) still reaches their own records, matching the
      // server's PermissionAny('hr.read', 'worker.read') on /attendance.
      {
        label: 'Attendance',
        icon: '🕒',
        route: '/attendance',
        permissions: ['hr.read', 'worker.read'],
        module: 'hr',
      },
      {
        label: 'Leave',
        icon: '🗓️',
        route: '/leave',
        permissions: ['hr.read', 'leave.read'],
        module: 'hr',
      },
      {
        label: 'Messages',
        icon: '💬',
        route: '/messages',
        permissions: ['hr.read', 'communication.read'],
        module: 'communication',
      },
      {
        label: 'Correspondence',
        icon: '✉️',
        route: '/correspondence',
        permissions: ['hr.read'],
        module: 'communication',
      },
    ],
  },
  {
    label: 'Money',
    items: [
      { label: 'Finance', icon: '💰', route: '/finance', permissions: ['finance.read'], module: 'finance' },
      { label: 'Contracts', icon: '📝', route: '/contracts', permissions: ['finance.read'], module: 'finance' },
      { label: 'Marketplace', icon: '🏪', route: '/marketplace', permissions: ['finance.read'], module: 'finance' },
    ],
  },
  {
    label: 'Insights',
    items: [
      {
        label: 'Reports',
        icon: '📊',
        route: '/reports/scheduled',
        permissions: ['reporting.read'],
        module: 'reporting',
      },
      { label: 'Weather', icon: '⛅', route: '/weather', permissions: [], module: null },
    ],
  },
  {
    label: 'System',
    items: [
      // Admin gates /subscription on billing.manage (owner-only) — mirrored here
      // so the sidebar matches the admin nav exactly. The mobile screen itself
      // stays viewable by anyone who reaches it; only this entry is owner-gated.
      {
        label: 'Subscription',
        icon: '💳',
        route: '/subscription',
        permissions: ['billing.manage'],
        module: null,
      },
      { label: 'Settings', icon: '⚙️', route: '/settings', permissions: [], module: null },
    ],
  },
];

/**
 * Same visibility semantics as the admin sidebar's `isVisible`
 * (admin/src/components/Sidebar.tsx) and the mobile tab bar:
 * - Module gate: hide only when the plan declares a non-empty module list that
 *   doesn't include the item's module (`modules: []` means "no plan linked /
 *   lookup failed" — unknown, not "entitled to nothing" — so it hides nothing).
 * - Permission gate: ANY-of the item's permissions (empty list = open).
 */
export function isSidebarItemVisible(
  item: SidebarItem,
  planModules: string[] | undefined,
  hasPermission: (permission: string) => boolean
): boolean {
  if (item.module && planModules && planModules.length > 0 && !planModules.includes(item.module)) {
    return false;
  }
  return item.permissions.length === 0 || item.permissions.some((permission) => hasPermission(permission));
}
