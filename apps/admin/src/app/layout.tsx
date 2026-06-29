import React from 'react';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/lib/toasts';
import { SocketProvider } from '@/lib/socket';
import { ThemeProvider } from '@/lib/theme';
import { NotificationProvider } from '@/lib/notifications';
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){var a=['bis_skin_checked','bis_register'];function r(el){for(var k=0;k<a.length;k++)el.removeAttribute(a[k]);}function c(e){var s=e.querySelectorAll('*');for(var i=0;i<s.length;i++)r(s[i]);}var o=new MutationObserver(function(m){for(var i=0;i<m.length;i++){var n=m[i].addedNodes;for(var j=0;j<n.length;j++){if(n[j].nodeType===1){r(n[j]);c(n[j]);}}}});if(document.body){c(document.body);}o.observe(document.documentElement,{childList:true,subtree:true});})();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
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