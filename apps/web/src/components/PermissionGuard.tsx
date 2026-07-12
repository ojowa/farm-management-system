'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

/**
 * Route-level permission guard. Wraps page content and redirects
 * or shows a fallback if the user lacks the required permission(s).
 */
export default function PermissionGuard({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback,
}: PermissionGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const userPermissions: string[] =
    user?.role?.permissions?.flatMap(
      (rp: any) => rp.permission?.map((p: any) => p.name) ?? []
    ) ?? [];

  const hasAccess = permission
    ? userPermissions.some((p) => matchesPermission(p, permission))
    : permissions
    ? requireAll
      ? permissions.every((perm) => userPermissions.some((p) => matchesPermission(p, perm)))
      : permissions.some((perm) => userPermissions.some((p) => matchesPermission(p, perm)))
    : true;

  useEffect(() => {
    if (!isLoading && !hasAccess) {
      router.push('/');
    }
  }, [isLoading, hasAccess, router]);

  if (isLoading) return null;
  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
  }
  return <>{children}</>;
}
