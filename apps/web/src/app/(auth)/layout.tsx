'use client';

import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/lib/toasts';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}
