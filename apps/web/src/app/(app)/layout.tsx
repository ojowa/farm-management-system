'use client';

import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/lib/toasts';
import { SocketProvider } from '@/lib/socket';
import { ThemeProvider } from '@/lib/theme';
import AppLayout from '@/components/AppLayout';
import ReconnectingBanner from '@/components/ReconnectingBanner';
import OfflineBanner from '@/components/OfflineBanner';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <ReconnectingBanner />
            <OfflineBanner />
            <AppLayout>{children}</AppLayout>
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
