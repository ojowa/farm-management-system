'use client';

import { useAuth } from './auth';
import { matchesPermission, extractPermissions } from './permissions';

export function usePermission() {
  const { user } = useAuth();

  const permissions = extractPermissions(user);
  const role: string = user?.role?.name ?? '';

  const hasPermission = (permission: string): boolean => {
    return permissions.some((p) => matchesPermission(p, permission));
  };

  const hasAnyPermission = (...perms: string[]): boolean => {
    return perms.some((p) => hasPermission(p));
  };

  const canCreate = (domain: string) => hasPermission(`${domain}.write`);
  const canRead = (domain: string) => hasPermission(`${domain}.read`);
  const canUpdate = (domain: string) => hasPermission(`${domain}.write`);
  const canDelete = (domain: string) => hasPermission(`${domain}.delete`);
  const canApprove = (domain: string) => hasPermission(`${domain}.manage`);

  return { hasPermission, hasAnyPermission, canCreate, canRead, canUpdate, canDelete, canApprove, permissions, role };
}
