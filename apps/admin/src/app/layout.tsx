import React from 'react';

export const metadata = {
  title: 'Farm Management Admin',
  description: 'Farm Management Admin Console',
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
