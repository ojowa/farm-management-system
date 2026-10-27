/**
 * Route → permission map for the mobile app — the SAME map the admin portal
 * enforces (`admin/src/lib/routePermissions.ts`), so one permission drives
 * both clients: if a user may open /workers on the web, they may open it on
 * mobile, and if the web hides it, deep-linking on mobile is denied too.
 *
 * Enforced at the route level in `app/(app)/_layout.tsx` (mirroring admin's
 * `AppLayout`): a signed-in user who holds none of a route's permissions gets
 * the AccessDenied screen instead of the view. The sidebar only *hides* rows;
 * this guard is what makes an unlisted deep link safe.
 *
 * Matching is longest prefix first (so /workers/departments resolves through
 * /workers); an empty `permissions` array means "any authenticated user".
 * Keep the shared prefixes in lockstep with the admin map — the parity test
 * in `admin/src/__tests__/permissionCatalog.test.ts` fails the build if they
 * drift.
 */
export interface RoutePermission {
  prefix: string;
  /** Any one of these grants access. */
  permissions: string[];
}

export const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Identity & authorization
  { prefix: '/users', permissions: ['users.manage'] },
  { prefix: '/roles', permissions: ['organization.read'] },
  // Owner-only billing management, mirroring @Permission('billing.manage')
  // on GET/PATCH /organizations/subscription.
  { prefix: '/subscription', permissions: ['billing.manage'] },

  // Every authenticated user keeps these
  { prefix: '/', permissions: [] },
  { prefix: '/weather', permissions: [] },
  { prefix: '/settings', permissions: [] }, // profile/password/2FA
  { prefix: '/notifications', permissions: [] },

  // Farm operations
  { prefix: '/farms', permissions: ['farm.read'] },
  { prefix: '/crops', permissions: ['crop.read'] },
  { prefix: '/livestock', permissions: ['livestock.read'] },
  { prefix: '/aquaculture', permissions: ['aquaculture.read'] },
  { prefix: '/poultry', permissions: ['poultry.read'] },
  { prefix: '/inventory', permissions: ['farm.read'] },
  { prefix: '/equipment', permissions: ['farm.read'] },

  // Served by hr.controller (`hr.*`). The worker directory is gated on the
  // dedicated `worker.read` key, exactly like admin — field workers (and
  // hr.read supervisors/vets without it) never see the roster; their
  // self-service is worker.self, ownership-scoped server-side.
  { prefix: '/workers', permissions: ['worker.read'] },
  // Widened vs admin (documented in permissionCatalog.test.ts): mobile shows
  // Tasks to worker.self holders so a field worker reaches their OWN tasks —
  // the server scopes them in getTasks; admin has no worker-facing view.
  { prefix: '/tasks', permissions: ['hr.read', 'worker.self'] },
  { prefix: '/roster', permissions: ['hr.read'] },
  { prefix: '/correspondence', permissions: ['hr.read'] },
  { prefix: '/messages', permissions: ['hr.read', 'communication.read'] },

  // Mobile-only routes (no admin counterpart): attendance widens with
  // worker.self so a field worker (no hr.read) reaches their OWN records —
  // matching @PermissionAny('hr.read', 'worker.self') on /attendance; leave
  // mirrors admin's /hr/leave view (hr.read or leave.read).
  { prefix: '/attendance', permissions: ['hr.read', 'worker.self'] },
  { prefix: '/leave', permissions: ['hr.read', 'leave.read'] },

  // Money & reporting
  { prefix: '/finance', permissions: ['finance.read'] },
  { prefix: '/contracts', permissions: ['finance.read'] },
  { prefix: '/marketplace', permissions: ['finance.read'] },
  { prefix: '/reports', permissions: ['reporting.read'] },
];

/**
 * Permissions required to view `pathname`, or `null` when the route is not
 * in the map (anything unlisted stays open to authenticated users).
 */
export function requiredPermissionsForPath(pathname: string): string[] | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  // Longest prefix wins so /finance/123 beats /finance.
  const match = ROUTE_PERMISSIONS.filter(
    (r) => path === r.prefix || path.startsWith(`${r.prefix}/`)
  ).sort((a, b) => b.prefix.length - a.prefix.length)[0];

  return match ? match.permissions : null;
}
