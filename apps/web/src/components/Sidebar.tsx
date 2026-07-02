'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { usePermission } from '@/lib/usePermission';

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
      { href: '/crops', label: 'Crops', icon: '🌾', permission: 'crop.read', module: 'crop' },
      { href: '/livestock', label: 'Livestock', icon: '🐄', permission: 'livestock.read', module: 'livestock' },
      { href: '/workers', label: 'Workers', icon: '👷', permission: 'worker.read', module: 'worker' },
      { href: '/tasks', label: 'Tasks', icon: '✅', permission: 'task.read', module: 'task' },
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
      { href: '/sales', label: 'Sales', icon: '💰', permission: 'finance.read', module: 'finance' },
      { href: '/reports', label: 'Finance', icon: '📈', permission: 'finance.read', module: 'finance' },
      { href: '/analytics', label: 'Analytics', icon: '📉', permission: 'reporting.read', module: 'reporting' },
    ],
  },
  {
    title: 'HR',
    items: [
      { href: '/hr/leave', label: 'My Leave', icon: '🏖️', permission: 'leave.read', module: 'leave' },
      { href: '/hr/leave/approvals', label: 'Leave Approvals', icon: '✅', permission: 'leave.approve', module: 'leave' },
      { href: '/hr/leave/types', label: 'Leave Types', icon: '📋', permission: 'leave.write', module: 'leave' },
      { href: '/roster', label: 'Duty Roster', icon: '📅', permission: 'roster.read', module: 'roster' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { href: '/messages', label: 'Messages', icon: '✉️', permission: 'messaging.read', module: 'messaging' },
      { href: '/correspondence', label: 'Correspondence', icon: '📄', permission: 'correspondence.read', module: 'correspondence' },
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
  const { user, logout, myOrganizations, switchOrganization } = useAuth();
  const { hasPermission } = usePermission();
  const [collapsed, setCollapsed] = useState(false);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);

  useEffect(() => {
    if (user) {
      myOrganizations().then(setOrgs).catch(() => {});
    }
  }, [user, myOrganizations]);

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
            if (item.module && user?.planFeatures?.modules && !user.planFeatures.modules.includes(item.module)) return false;
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
          {orgs.length > 1 && (
            <div className="mb-3 relative">
              <button
                onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
                className="w-full text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <span className="text-gray-500 dark:text-gray-400 text-xs">Organization</span>
                <p className="font-medium text-gray-900 dark:text-white truncate">{user?.organizationName || 'Select org'}</p>
              </button>
              {showOrgSwitcher && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  {orgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => { switchOrganization(org.id); setShowOrgSwitcher(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        org.id === user?.organizationId ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {org.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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
