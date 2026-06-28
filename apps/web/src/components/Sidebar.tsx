'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    ],
  },
  {
    title: 'Farm Management',
    items: [
      { href: '/farms', label: 'Farms', icon: '🏡' },
      { href: '/crops', label: 'Crops', icon: '🌾' },
      { href: '/livestock', label: 'Livestock', icon: '🐄' },
      { href: '/workers', label: 'Workers', icon: '👷' },
    ],
  },
  {
    title: 'Poultry',
    items: [
      { href: '/poultry', label: 'Poultry', icon: '🐔' },
      { href: '/flocks', label: 'Flocks', icon: '🐦' },
      { href: '/feeding', label: 'Feeding', icon: '🍖' },
      { href: '/vaccinations', label: 'Vaccinations', icon: '💉' },
      { href: '/mortality', label: 'Mortality', icon: '📉' },
      { href: '/egg-production', label: 'Egg Production', icon: '🥚' },
      { href: '/medications', label: 'Medications', icon: '💊' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/inventory', label: 'Inventory', icon: '📦' },
      { href: '/sales', label: 'Sales', icon: '💰' },
      { href: '/reports', label: 'Finance', icon: '📈' },
      { href: '/analytics', label: 'Analytics', icon: '📉' },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/settings', label: 'Settings', icon: '⚙️' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-200`}>
      <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && <h1 className="text-lg font-bold text-green-700 dark:text-green-400">🌾 Farm Manager</h1>}
        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1" aria-label="Toggle sidebar">
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-4 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{section.title}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    } ${collapsed ? 'justify-center' : ''}`}
                  >
                    <span className="text-lg flex-shrink-0">{item.icon}</span>
                    {!collapsed && item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center text-green-700 dark:text-green-400 font-semibold text-sm">
              {user?.fullName?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.fullName || 'User'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
