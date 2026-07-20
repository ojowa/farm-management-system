/**
 * Paths that do not require authentication.
 * Shared across all frontend apps to avoid duplication.
 */
export const PUBLIC_PATHS = ['/', '/login', '/register'] as const;

export function isPublicPath(pathname: string): boolean {
  return (PUBLIC_PATHS as readonly string[]).includes(pathname);
}
