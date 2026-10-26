/**
 * Route → permission map for the admin app.
 *
 * Every view under AppLayout must resolve here so a user never lands on a
 * screen (or its data) they are not allowed to see. Matching is longest
 * prefix first; an empty `permissions` array means "any authenticated user".
 *
 * The strings mirror what the API actually enforces (`@Permission(...)`
 * on the Nest controllers), which is deliberately *not* always the same as
 * the module name: inventory/equipment are served by the farm asset
 * controller (`farm.read`), and workers/tasks/attendance/roster/
 * correspondence/leave are served by the HR controller (`hr.read`).
 * Messages are the exception — the HR controller accepts the worker-facing
 * `communication.*` family there too, so workers on any client can read and
 * reply.
 * Gating on anything else would either hide a view a user may open, or
 * show one that answers 403 and renders "No data found".
 */
export interface RoutePermission {
  prefix: string;
  /** Any one of these grants access. */
  permissions: string[];
}

export const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Identity & authorization
  { prefix: '/users', permissions: ['users.manage'] },
  { prefix: '/roles', permissions: ['role.read', 'organization.read'] },
  { prefix: '/permissions', permissions: ['role.read', 'organization.read'] },
  // Owner-only billing management, mirroring @Permission('billing.manage')
  // on GET/PATCH /organizations/subscription.
  { prefix: '/subscription', permissions: ['billing.manage'] },

  // Every authenticated user keeps these
  { prefix: '/dashboard', permissions: [] },
  { prefix: '/weather', permissions: [] },
  { prefix: '/settings', permissions: [] }, // profile/password; Integrations tab gated on apikey.*
  { prefix: '/notifications', permissions: [] },

  // Farm operations
  { prefix: '/farms', permissions: ['farm.read'] },
  // Parcels are read through the farm controller (`farm.read`), like the
  // inventory/equipment views below.
  { prefix: '/fields', permissions: ['farm.read'] },
  { prefix: '/crops', permissions: ['crop.read'] },
  { prefix: '/irrigation', permissions: ['crop.read'] },
  { prefix: '/livestock', permissions: ['livestock.read'] },
  { prefix: '/aquaculture', permissions: ['aquaculture.read'] },
  { prefix: '/poultry', permissions: ['poultry.read'] },
  // Served by asset.controller (`farm.*`), not an inventory controller.
  { prefix: '/inventory', permissions: ['farm.read', 'inventory.read'] },
  { prefix: '/equipment', permissions: ['farm.read', 'inventory.read'] },

  // Served by hr.controller (`hr.*`), not worker/communication controllers.
  { prefix: '/workers', permissions: ['hr.read'] },
  { prefix: '/tasks', permissions: ['hr.read'] },
  { prefix: '/roster', permissions: ['hr.read'] },
  { prefix: '/correspondence', permissions: ['hr.read'] },
  { prefix: '/messages', permissions: ['hr.read', 'communication.read'] },
  { prefix: '/hr', permissions: ['hr.read', 'leave.read'] },
  // Approving/rejecting is a narrower view than leave itself: hr.write or the
  // dedicated leave.approve grant, mirroring @PermissionAny on the controller.
  { prefix: '/hr/leave/approvals', permissions: ['leave.approve', 'hr.write'] },

  // Money & reporting
  { prefix: '/finance', permissions: ['finance.read'] },
  { prefix: '/contracts', permissions: ['finance.read'] },
  { prefix: '/marketplace', permissions: ['finance.read'] },
  { prefix: '/reports', permissions: ['reporting.read'] },
  { prefix: '/analytics', permissions: ['reporting.read', 'finance.read'] },
];

/**
 * Permissions required to view `pathname`, or `null` when the route is not
 * in the map (root, auth pages and anything unlisted stays open to
 * authenticated users).
 */
export function requiredPermissionsForPath(pathname: string): string[] | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  // Longest prefix wins so /finance/transactions beats /finance.
  const match = ROUTE_PERMISSIONS.filter(
    (r) => path === r.prefix || path.startsWith(`${r.prefix}/`)
  ).sort((a, b) => b.prefix.length - a.prefix.length)[0];

  return match ? match.permissions : null;
}
