'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

import { usePermission } from '@/lib/usePermission';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard,
  Users,
  Home,
  Tractor,
  Sprout,
  Beef,
  Egg,
  Fish,
  Package,
  DollarSign,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserCog,
  ListTodo,
  Calendar,
  CalendarDays,
  CloudSun,
  Wrench,
  FileText,
  Mail,
  Store,
} from 'lucide-react';
import { requiredPermissionsForPath } from '@/lib/routePermissions';

/**
 * Sectioned sidebar: 8 labeled groups instead of one 33-item flat list.
 * Child views (Farm Map, Crop Calendar, Health, Low Stock, Attendance,
 * Profitability, Scheduled Reports, Permissions) were demoted to tabs on
 * their parent pages (`@/components/NavTabs`) so routes stay reachable
 * without a sidebar entry of their own.
 *
 * `module` mirrors the plan-module names in the server's features module -
 * the same gating mobile's tab bar applies - so a plan without e.g. the
 * poultry module never offers a dead-end link. `undefined` = core (always
 * shown).
 */
interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  module?: string;
}

const navigation: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [{ name: 'Dashboard', href: '/', icon: LayoutDashboard }],
  },
  {
    label: 'Access',
    items: [
      { name: 'Users', href: '/users', icon: UserCog },
      { name: 'Roles', href: '/roles', icon: Shield },
    ],
  },
  {
    label: 'Farming',
    items: [
      { name: 'Farms', href: '/farms', icon: Home, module: 'farm' },
      { name: 'Crops', href: '/crops', icon: Sprout, module: 'crop' },
      { name: 'Livestock', href: '/livestock', icon: Beef, module: 'livestock' },
      { name: 'Poultry', href: '/poultry', icon: Egg, module: 'poultry' },
      { name: 'Aquaculture', href: '/aquaculture', icon: Fish, module: 'aquaculture' },
    ],
  },
  {
    label: 'Assets',
    items: [
      { name: 'Inventory', href: '/inventory', icon: Package, module: 'inventory' },
      { name: 'Equipment', href: '/equipment', icon: Wrench, module: 'inventory' },
    ],
  },
  {
    label: 'People',
    items: [
      { name: 'Workers', href: '/workers', icon: Users, module: 'hr' },
      { name: 'Roster', href: '/roster', icon: CalendarDays, module: 'hr' },
      { name: 'Tasks', href: '/tasks', icon: ListTodo, module: 'worker' },
      { name: 'Leave', href: '/hr/leave', icon: Calendar, module: 'hr' },
      { name: 'Messages', href: '/messages', icon: FileText, module: 'communication' },
      { name: 'Correspondence', href: '/correspondence', icon: Mail, module: 'communication' },
    ],
  },
  {
    label: 'Money',
    items: [
      { name: 'Finance', href: '/finance', icon: DollarSign, module: 'finance' },
      { name: 'Contracts', href: '/contracts', icon: FileText, module: 'finance' },
      { name: 'Marketplace', href: '/marketplace', icon: Store, module: 'finance' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { name: 'Reports', href: '/reports', icon: BarChart3, module: 'reporting' },
      { name: 'Weather', href: '/weather', icon: CloudSun },
    ],
  },
  {
    label: 'System',
    items: [{ name: 'Settings', href: '/settings', icon: Settings }],
  },
];

export function Sidebar({ open = false, onNavigate }: { open?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const [collapsed, setCollapsed] = useState(false);

  // Visibility comes from the same map AppLayout gates routes with, so the
  // nav can never offer a link the user would be denied on arrival. Plan
  // modules layer on top: only gate when the plan actually declares its
  // module list (same semantics as the mobile tab bar).
  const modules: string[] | undefined = user?.planFeatures?.modules;
  const isVisible = (item: NavItem) => {
    if (item.module && modules && !modules.includes(item.module)) return false;
    const required = requiredPermissionsForPath(item.href);
    return !required || required.length === 0 || required.some((p) => hasPermission(p));
  };
  const visibleSections = navigation
    .map((section) => ({ ...section, items: section.items.filter(isVisible) }))
    .filter((section) => section.items.length > 0);

  return (
    <aside
      id="app-sidebar"
      className={cn(
        // Off-canvas below lg: parked at -100% until `open`, always pinned in
        // from the lg breakpoint where `AppLayout` pads content by w-64.
        'fixed left-0 top-0 z-40 h-dvh bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col lg:translate-x-0',
        collapsed ? 'w-16' : 'w-64',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <Link href="/" onClick={onNavigate} className="flex items-center gap-2">
            <Tractor className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl text-gray-900 dark:text-white">Farm Admin</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Main navigation">
        {visibleSections.map((section) => (
          <div key={section.label} className="space-y-1">
            {collapsed ? (
              <div className="my-3 border-t border-gray-200 dark:border-gray-700" role="separator" />
            ) : (
              <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground text-sm font-medium">
              {user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : 'U'}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user ? `${user.firstName} ${user.lastName}` : 'User'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.role?.name?.replace('_', ' ') || 'User'}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
