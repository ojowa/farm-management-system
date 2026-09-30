'use client';

import { useAuth } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, transientError, retryAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user && !transientError) {
      router.push(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [user, isLoading, transientError, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // A network hiccup must never look like a logout — retry instead of
  // bouncing the user back to the login screen.
  if (!user && transientError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-sm px-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm font-medium text-gray-700">Couldn&apos;t verify your session</p>
          <p className="mt-1 text-xs text-gray-500">The server didn&apos;t respond. Retrying…</p>
          <button
            onClick={() => retryAuth()}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
