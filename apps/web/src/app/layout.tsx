import React from 'react';
import './globals.css';
import { ToastProvider } from '@/lib/toasts';
import { SocketProvider } from '@/lib/socket';
import { ThemeProvider } from '@/lib/theme';
import { AuthProvider } from '@/lib/auth';
import AppLayout from '@/components/AppLayout';
import ReconnectingBanner from '@/components/ReconnectingBanner';
import OfflineBanner from '@/components/OfflineBanner';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <SocketProvider>
                <ReconnectingBanner />
                <OfflineBanner />
                <AppLayout>{children}</AppLayout>
              </SocketProvider>
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
