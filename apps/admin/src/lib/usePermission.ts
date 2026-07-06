'use client';

export function usePermission() {
  const hasPermission = (_permission: string): boolean => true;

  const hasAnyPermission = (..._perms: string[]): boolean => true;

  const canCreate = (_domain: string) => true;
  const canRead = (_domain: string) => true;
  const canUpdate = (_domain: string) => true;
  const canDelete = (_domain: string) => true;
  const canApprove = (_domain: string) => true;

  return { hasPermission, hasAnyPermission, canCreate, canRead, canUpdate, canDelete, canApprove, permissions: [], role: 'SUPER_ADMIN' };
}
