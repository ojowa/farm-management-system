'use client';

import { useAuth } from '@/lib/auth';

const WILDCARD = '*';

function matches(granted: string, required: string): boolean {
  if (granted === WILDCARD) return true;
  if (granted === required) return true;
  if (granted.endsWith('.*')) {
    const prefix = granted.slice(0, -2);
    return required === prefix || required.startsWith(`${prefix}.`);
  }
  return false;
}

export function usePermission() {
  const { user } = useAuth();
  const permissions = user?.permissions || [];
  const role = user?.role || '';

  const hasPermission = (permission: string): boolean => {
    // SUPER_ADMIN wildcard
    if (role === 'SUPER_ADMIN') return true;
    // SUPPORT_ADMIN read-only wildcard
    if (role === 'SUPPORT_ADMIN' && permission.endsWith('.read')) return true;
    // Check explicit permissions
    return permissions.some((p) => matches(p, permission));
  };

  const hasAnyPermission = (...perms: string[]): boolean => {
    return perms.some((p) => hasPermission(p));
  };

  const canCreate = (domain: string) => hasPermission(`${domain}.write`);
  const canRead = (domain: string) => hasPermission(`${domain}.read`);
  const canUpdate = (domain: string) => hasPermission(`${domain}.write`);
  const canDelete = (domain: string) => hasPermission(`${domain}.delete`);
  const canApprove = (domain: string) => hasPermission(`${domain}.approve`);

  return { hasPermission, hasAnyPermission, canCreate, canRead, canUpdate, canDelete, canApprove, permissions, role };
}
