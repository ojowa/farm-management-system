/**
 * Permission matching with wildcard support.
 * Mirrors the server-side logic in @farm/auth/roles.ts.
 */
export function matchesPermission(granted: string, required: string): boolean {
  if (granted === '*') return true;
  if (granted === required) return true;
  if (granted.endsWith('.*')) {
    const prefix = granted.slice(0, -2);
    return required === prefix || required.startsWith(`${prefix}.`);
  }
  return false;
}

/**
 * Extract flat permission names from a user's role.
 */
export function extractPermissions(user: any): string[] {
  return (
    user?.role?.permissions?.flatMap(
      (rp: any) => rp.permission?.map((p: any) => p.name) ?? []
    ) ?? []
  );
}
