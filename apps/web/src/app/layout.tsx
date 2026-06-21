import React from 'react';

export const metadata = {
  title: 'Farm Management System',
  description: 'Farm Management System App',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
