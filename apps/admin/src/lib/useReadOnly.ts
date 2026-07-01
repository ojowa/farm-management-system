'use client';

import { useAuth } from '@/lib/auth';

const READ_ONLY_ROLES = ['SUPPORT_ADMIN'];

export function useReadOnly() {
  const { user } = useAuth();
  return READ_ONLY_ROLES.includes(user?.role || '');
}
