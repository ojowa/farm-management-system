import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export default function AppLayoutRoot({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      {children}
    </Suspense>
  );
}
