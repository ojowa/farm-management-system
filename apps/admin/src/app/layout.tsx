import React from 'react';
import './globals.css';
import { ToastProvider } from '@/lib/toasts';
import { SocketProvider } from '@/lib/socket';
import { ThemeProvider } from '@/lib/theme';
import { NotificationProvider } from '@/lib/notifications';
import { AuthProvider } from '@/lib/auth';
import { AppLayout } from '@/components/AppLayout';
import { ReconnectingBanner } from '@/components/ReconnectingBanner';
import { OfflineBanner } from '@/components/OfflineBanner';

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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#16a34a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <SocketProvider>
                <NotificationProvider>
                  <ReconnectingBanner />
                  <OfflineBanner />
                  <AppLayout>{children}</AppLayout>
                </NotificationProvider>
              </SocketProvider>
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
