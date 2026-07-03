'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from './ThemeToggle';
import { NotificationCenter } from './NotificationCenter';
import { cn } from '@/lib/utils';
import { Menu, X, User, LogOut, Settings, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

function getRequiredModule(pathname: string): string | null {
  if (pathname.startsWith('/farms')) return 'farm';
  if (pathname.startsWith('/crops')) return 'crop';
  if (pathname.startsWith('/livestock')) return 'livestock';
  if (pathname.startsWith('/poultry')) return 'poultry';
  if (pathname.startsWith('/inventory')) return 'inventory';
  if (pathname.startsWith('/workers')) return 'worker';
  if (pathname.startsWith('/finance')) return 'finance';
  if (pathname.startsWith('/reports')) return 'reporting';
  return null;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  // Check subscription status
  const isSuspended = user?.subscriptionStatus === 'SUSPENDED' && user?.role !== 'SUPER_ADMIN' && user?.role !== 'SUPPORT_ADMIN';
  if (isSuspended) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-8 text-center backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 transition-all transform duration-300">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Subscription Suspended</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm leading-relaxed">
            Your organization's subscription has been suspended. Please contact your system administrator or support to reactivate your access.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => logout()}
              variant="destructive"
              className="w-full py-2.5 px-4 font-medium rounded-xl transition-all shadow-md hover:shadow-lg focus:outline-none"
            >
              Sign Out
            </Button>
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
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:bg-blue-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Upgrade Required</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm leading-relaxed">
            The <strong className="text-blue-600 dark:text-blue-400">{requiredModule?.toUpperCase()}</strong> module is not included in your current subscription plan ({user?.subscriptionPlan || 'FREE'}). Please upgrade your plan to unlock this feature.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => router.push('/settings')}
              className="w-full py-2.5 px-4 font-medium rounded-xl transition-all shadow-md hover:shadow-lg focus:outline-none"
            >
              Go to Settings / Profile
            </Button>
            <Button
              onClick={() => router.push('/')}
              variant="secondary"
              className="w-full py-2.5 px-4 font-medium rounded-xl transition-all focus:outline-none"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" suppressHydrationWarning>
      <Sidebar />

      <div
        className={cn(
          'transition-all duration-300 min-h-screen',
          'lg:pl-64'
        )}
      >
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <NotificationCenter />

              <DropdownMenu
                trigger={
                  <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
                    <Avatar
                      src={user?.avatar}
                      alt={user?.fullName}
                      fallback={user?.fullName || 'U'}
                    />
                  </Button>
                }
                align="end"
              >
                <DropdownMenuItem className="px-3 py-1 text-sm font-medium">
                  {user?.fullName || 'User'}
                </DropdownMenuItem>
                <DropdownMenuItem className="px-3 py-1 text-sm text-muted-foreground">
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { router.push('/settings'); setUserMenuOpen(false); }}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { router.push('/settings'); setUserMenuOpen(false); }}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    setUserMenuOpen(false);
                  }}
                  className="text-red-600"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}