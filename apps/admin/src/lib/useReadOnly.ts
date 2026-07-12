'use client';

import { useAuth } from './auth';

/**
 * Permission matching with wildcard support.
 */
function matchesPermission(granted: string, required: string): boolean {
  if (granted === '*') return true;
  if (granted === required) return true;
  if (granted.endsWith('.*')) {
    const prefix = granted.slice(0, -2);
    return required === prefix || required.startsWith(`${prefix}.`);
  }
  return false;
}

/**
 * Returns true if the user has NO write permissions across any domain.
 * Used to make forms read-only for users with read-only roles.
 */
export function useReadOnly() {
  const { user } = useAuth();

  const permissions: string[] =
    user?.role?.permissions?.flatMap(
      (rp: any) => rp.permission?.map((p: any) => p.name) ?? []
    ) ?? [];

  // If user has wildcard, they can write
  if (permissions.some((p) => p === '*')) return false;

  // If user has any .write permission, they can write
  const canWrite = permissions.some((p) => p.endsWith('.write'));
  return !canWrite;
}
