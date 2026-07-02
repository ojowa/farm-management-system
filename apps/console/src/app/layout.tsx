import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Farm Management Platform Console',
  description: 'Master control panel for the Farm Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50" suppressHydrationWarning>{children}</body>
    </html>
  );
}
