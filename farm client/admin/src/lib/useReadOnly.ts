'use client';

import { useAuth } from './auth';
import { extractPermissions } from './permissions';

/**
 * Returns true if the user has NO write permissions across any domain.
 * Used to make forms read-only for users with read-only roles.
 */
export function useReadOnly() {
  const { user } = useAuth();

  const permissions = extractPermissions(user);

  // If user has wildcard, they can write
  if (permissions.some((p) => p === '*')) return false;

  // If user has any .write permission, they can write
  const canWrite = permissions.some((p) => p.endsWith('.write'));
  return !canWrite;
}
