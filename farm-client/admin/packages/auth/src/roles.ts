/**
 * Canonical role names. The auth-service is the only place allowed to assign
 * these to a user; every downstream service imports the same constants so a
 * rename is a single-line change.
 *
 * Keep these in sync with `prisma/seed.ts` in `@farm/database`.
 */
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SUPPORT_ADMIN: 'SUPPORT_ADMIN',
  ORGANIZATION_OWNER: 'ORGANIZATION_OWNER',
  FARM_MANAGER: 'FARM_MANAGER',
  ACCOUNTANT: 'ACCOUNTANT',
  SUPERVISOR: 'SUPERVISOR',
  VETERINARIAN: 'VETERINARIAN',
  WORKER: 'WORKER',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

/**
 * Permission matching with wildcard support.
 * Permissions are now stored in the database and loaded at login time.
 * This utility is used by the AuthorizationGuard to check permissions.
 */
const WILDCARD = '*';

export const matchesPermission = (granted: string, required: string): boolean => {
  if (granted === WILDCARD) return true;
  if (granted === required) return true;
  if (granted.endsWith('.*')) {
    const prefix = granted.slice(0, -2);
    return required === prefix || required.startsWith(`${prefix}.`);
  }
  return false;
};

/**
 * Returns true if the user's permissions grant the required permission.
 * Permissions are loaded from DB at login and embedded in the JWT.
 */
export const userHasPermission = (userPermissions: string[], required: string): boolean => {
  return userPermissions.some((p) => matchesPermission(p, required));
};

/**
 * Returns true if the user has at least one of the listed roles.
 */
export const userHasAnyRole = (
  userRole: string,
  allowed: readonly string[],
): boolean => {
  if (!userRole || allowed.length === 0) return false;
  return allowed.includes(userRole);
};

/**
 * Extract flat permission names from a user object with a Prisma-shaped role.
 */
export const extractPermissions = (user: any): string[] => {
  return (
    user?.role?.permissions?.flatMap(
      (rp: any) => rp.permission?.map((p: any) => p.name) ?? []
    ) ?? []
  );
};
