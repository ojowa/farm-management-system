import React from 'react';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/lib/toasts';
import { SocketProvider } from '@/lib/socket';
import { ThemeProvider } from '@/lib/theme';
import { NotificationProvider } from '@/lib/notifications';
import AppLayout from '@/components/AppLayout';
import ReconnectingBanner from '@/components/ReconnectingBanner';
import OfflineBanner from '@/components/OfflineBanner';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Farm Management Admin',
  description: 'Farm Management Admin Console',
};

export default function RootLayout({
  children,
}: {
  children: React.JSX.Element;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <SocketProvider>
                <NotificationProvider>
                  <ReconnectingBanner />
                  <OfflineBanner />
                  <AppLayout>{children}</AppLayout>
                </NotificationProvider>
              </SocketProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}