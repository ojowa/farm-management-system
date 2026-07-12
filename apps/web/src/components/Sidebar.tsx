'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePermission } from '@/lib/usePermission';
import { useAuth } from '@/lib/auth';

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '📊', permission: null, module: null },
    ],
  },
  {
    title: 'Farm Management',
    items: [
      { href: '/farms', label: 'Farms', icon: '🏡', permission: 'farm.read', module: 'farm' },
      { href: '/farms/map', label: 'Farm Map', icon: '🗺️', permission: 'farm.read', module: 'farm' },
      { href: '/crops', label: 'Crops', icon: '🌾', permission: 'crop.read', module: 'crop' },
      { href: '/crops/calendar', label: 'Crop Calendar', icon: '📅', permission: 'crop.read', module: 'crop' },
      { href: '/crops/pest-disease', label: 'Pest & Disease', icon: '🐛', permission: 'crop.read', module: 'crop' },
      { href: '/livestock', label: 'Livestock', icon: '🐄', permission: 'livestock.read', module: 'livestock' },
      { href: '/livestock/health', label: 'Health', icon: '❤️', permission: 'livestock.read', module: 'livestock' },
      { href: '/livestock/breeding', label: 'Breeding', icon: '👶', permission: 'livestock.read', module: 'livestock' },
      { href: '/irrigation', label: 'Irrigation', icon: '💧', permission: 'crop.read', module: 'crop' },
      { href: '/workers', label: 'Workers', icon: '👷', permission: 'worker.read', module: 'worker' },
      { href: '/tasks', label: 'Tasks', icon: '✅', permission: 'worker.read', module: 'worker' },
      { href: '/workers/attendance', label: 'Attendance', icon: '🕐', permission: 'worker.read', module: 'worker' },
    ],
  },
  {
    title: 'Poultry',
    items: [
      { href: '/poultry', label: 'Poultry', icon: '🐔', permission: 'poultry.read', module: 'poultry' },
      { href: '/flocks', label: 'Flocks', icon: '🐦', permission: 'poultry.read', module: 'poultry' },
      { href: '/feeding', label: 'Feeding', icon: '🍖', permission: 'poultry.read', module: 'poultry' },
      { href: '/vaccinations', label: 'Vaccinations', icon: '💉', permission: 'poultry.read', module: 'poultry' },
      { href: '/mortality', label: 'Mortality', icon: '📉', permission: 'poultry.read', module: 'poultry' },
      { href: '/egg-production', label: 'Egg Production', icon: '🥚', permission: 'poultry.read', module: 'poultry' },
      { href: '/medications', label: 'Medications', icon: '💊', permission: 'poultry.read', module: 'poultry' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/inventory', label: 'Inventory', icon: '📦', permission: 'inventory.read', module: 'inventory' },
      { href: '/inventory/low-stock', label: 'Low Stock', icon: '⚠️', permission: 'inventory.read', module: 'inventory' },
      { href: '/equipment', label: 'Equipment', icon: '🔧', permission: 'inventory.read', module: 'inventory' },
      { href: '/sales', label: 'Sales', icon: '💰', permission: 'finance.read', module: 'finance' },
      { href: '/finance', label: 'Finance', icon: '📈', permission: 'finance.read', module: 'finance' },
      { href: '/finance/profitability', label: 'Profitability', icon: '💹', permission: 'finance.read', module: 'finance' },
      { href: '/contracts', label: 'Contracts', icon: '📝', permission: 'finance.read', module: 'finance' },
      { href: '/marketplace', label: 'Marketplace', icon: '🏪', permission: 'finance.read', module: 'finance' },
      { href: '/analytics', label: 'Analytics', icon: '📉', permission: 'reporting.read', module: 'reporting' },
    ],
  },
  {
    title: 'Reports',
    items: [
      { href: '/reports', label: 'Reports', icon: '📊', permission: 'reporting.read', module: 'reporting' },
      { href: '/reports/scheduled', label: 'Scheduled Reports', icon: '🕐', permission: 'reporting.read', module: 'reporting' },
    ],
  },
  {
    title: 'HR',
    items: [
      { href: '/hr/leave', label: 'My Leave', icon: '🏖️', permission: 'worker.read', module: 'worker' },
      { href: '/hr/leave/approvals', label: 'Leave Approvals', icon: '✅', permission: 'worker.write', module: 'worker' },
      { href: '/hr/leave/types', label: 'Leave Types', icon: '📋', permission: 'worker.write', module: 'worker' },
      { href: '/roster', label: 'Duty Roster', icon: '📅', permission: 'worker.read', module: 'worker' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { href: '/messages', label: 'Messages', icon: '✉️', permission: 'communication.read', module: 'communication' },
      { href: '/correspondence', label: 'Correspondence', icon: '📄', permission: 'communication.read', module: 'communication' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { href: '/weather', label: 'Weather', icon: '🌤️', permission: null, module: null },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/settings', label: 'Settings', icon: '⚙️', permission: null, module: null },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { hasPermission } = usePermission();
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
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => {
            if (item.permission && !hasPermission(item.permission)) return false;
            return true;
          });
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title}>
              {!collapsed && (
                <p className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{section.title}</p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
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
          );
        })}
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center text-green-700 dark:text-green-400 font-semibold text-sm">
              {user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user ? `${user.firstName} ${user.lastName}` : 'User'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.role?.name?.replace('_', ' ') || 'User'}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
