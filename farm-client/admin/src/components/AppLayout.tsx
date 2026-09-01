'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from './ThemeToggle';
import { NotificationCenter } from './NotificationCenter';
import { cn } from '@/lib/utils';
import { Menu, X, User, LogOut, Settings } from 'lucide-react';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
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
                      alt={user ? `${user.firstName} ${user.lastName}` : 'U'}
                      fallback={user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : 'U'}
                    />
                  </Button>
                }
                align="end"
              >
                <DropdownMenuItem className="px-3 py-1 text-sm font-medium">
                  {user ? `${user.firstName} ${user.lastName}` : 'User'}
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
                  onClick={async () => {
                    await logout();
                    router.push('/login');
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