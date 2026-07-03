'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import NotificationCenter from '@/components/NotificationCenter';
import ThemeToggle from '@/components/ThemeToggle';
import { LoadingSpinner } from '@/components/ui';

function getRequiredModule(pathname: string): string | null {
  if (pathname.startsWith('/farms')) return 'farm';
  if (pathname.startsWith('/crops')) return 'crop';
  if (pathname.startsWith('/livestock')) return 'livestock';
  if (pathname.startsWith('/workers')) return 'worker';
  if (pathname.startsWith('/tasks')) return 'task';
  if (pathname.startsWith('/poultry') || pathname.startsWith('/flocks') || pathname.startsWith('/feeding') || pathname.startsWith('/vaccinations') || pathname.startsWith('/mortality') || pathname.startsWith('/egg-production') || pathname.startsWith('/medications')) return 'poultry';
  if (pathname.startsWith('/inventory')) return 'inventory';
  if (pathname.startsWith('/sales')) return 'finance';
  if (pathname.startsWith('/reports')) return 'finance';
  if (pathname.startsWith('/analytics')) return 'reporting';
  if (pathname.startsWith('/roster')) return 'roster';
  if (pathname.startsWith('/hr')) return 'leave';
  if (pathname.startsWith('/messages')) return 'messaging';
  if (pathname.startsWith('/correspondence')) return 'correspondence';
  return null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Check subscription status
  const isSuspended = user?.subscriptionStatus === 'SUSPENDED' && user?.role !== 'SUPER_ADMIN' && user?.role !== 'SUPPORT_ADMIN';
  if (isSuspended) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-8 text-center backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 transition-all transform duration-300">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Subscription Suspended</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm leading-relaxed">
            Your organization's subscription has been suspended. Please contact your system administrator or support to reactivate your access.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => logout()}
              className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium rounded-xl transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check module plan allowance
  const requiredModule = getRequiredModule(pathname);
  const isModuleAllowed = !requiredModule ||
    (user?.planFeatures?.modules && user.planFeatures.modules.includes(requiredModule)) ||
    user?.role === 'SUPER_ADMIN' || user?.role === 'SUPPORT_ADMIN';

  if (!isModuleAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-8 text-center backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 transition-all transform duration-300">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Upgrade Required</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm leading-relaxed">
            The <strong className="text-blue-600 dark:text-blue-400">{requiredModule?.toUpperCase()}</strong> module is not included in your current subscription plan ({user?.subscriptionPlan || 'FREE'}). Please upgrade your plan to unlock this feature.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.push('/settings')}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-xl transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Go to Settings / Billing
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-2.5 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-750 dark:text-gray-200 font-medium rounded-xl transition-all focus:outline-none"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900" suppressHydrationWarning>
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-end sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationCenter />
          </div>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
