'use client';

import React from 'react';
import '@/app/globals.css';
import { AuthProvider, useAuth } from '@/lib/auth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS: Array<{ label?: string; href?: string; icon?: string; divider?: boolean }> = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Users', href: '/users', icon: '👥' },
  { label: 'Organizations', href: '/organizations', icon: '🏢' },
  { divider: true },
  { label: 'Subscriptions', href: '/subscriptions', icon: '💳' },
  { label: 'Feature Flags', href: '/features', icon: '🔧' },
  { divider: true },
  { label: 'Audit Log', href: '/audit', icon: '📋' },
  { label: 'Health', href: '/health', icon: '💓' },
  { label: 'Broadcasts', href: '/broadcasts', icon: '📢' },
];

function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center font-bold text-lg">P</div>
          <div>
            <div className="font-semibold text-sm">Platform Console</div>
            <div className="text-xs text-gray-400">Farm Management</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item, i) => {
          if ('divider' in item && item.divider) return <div key={i} className="border-t border-gray-700 my-2" />;
          if (!item.href || !item.label) return null;
          const href: string = item.href;
          const isActive = pathname === href || pathname?.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive ? 'bg-green-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="text-sm text-gray-400 mb-2">{user?.firstName} {user?.lastName}</div>
        <div className="text-xs text-gray-500 mb-3">{user?.role}</div>
        <button
          onClick={logout}
          className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!isAuthenticated) { if (typeof window !== 'undefined') window.location.href = '/login'; return null; }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PlatformLayout>{children}</PlatformLayout>
    </AuthProvider>
  );
}
