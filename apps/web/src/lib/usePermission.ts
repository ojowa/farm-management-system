'use client';

export function usePermission() {
  const hasPermission = (permission: string): boolean => {
    return true;
  };

  const hasAnyPermission = (...perms: string[]): boolean => {
    return true;
  };

  const canCreate = (domain: string) => true;
  const canRead = (domain: string) => true;
  const canUpdate = (domain: string) => true;
  const canDelete = (domain: string) => true;
  const canApprove = (domain: string) => true;

  return { hasPermission, hasAnyPermission, canCreate, canRead, canUpdate, canDelete, canApprove, permissions: [], role: 'ADMIN' };
}
