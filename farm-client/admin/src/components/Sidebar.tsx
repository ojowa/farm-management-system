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
  Package,
  DollarSign,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserCog,
  ListTodo,
  Clock,
  Calendar,
  CalendarDays,
  Heart,
  Baby,
  Droplets,
  Bug,
  CloudSun,
  MapPin,
  Wrench,
  FileText,
  Mail,
  Store,
} from 'lucide-react';
import { requiredPermissionsForPath } from '@/lib/routePermissions';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Users', href: '/users', icon: UserCog },
  { name: 'Roles', href: '/roles', icon: Shield },
  { name: 'Permissions', href: '/permissions', icon: Shield },
  { name: 'Farms', href: '/farms', icon: Home },
  { name: 'Farm Map', href: '/farms/map', icon: MapPin },
  { name: 'Crops', href: '/crops', icon: Sprout },
  { name: 'Crop Calendar', href: '/crops/calendar', icon: Calendar },
  { name: 'Pest & Disease', href: '/crops/pest-disease', icon: Bug },
  { name: 'Livestock', href: '/livestock', icon: Beef },
  { name: 'Health', href: '/livestock/health', icon: Heart },
  { name: 'Breeding', href: '/livestock/breeding', icon: Baby },
  { name: 'Irrigation', href: '/irrigation', icon: Droplets },
  { name: 'Poultry', href: '/poultry', icon: Egg },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Low Stock', href: '/inventory/low-stock', icon: Package },
  { name: 'Equipment', href: '/equipment', icon: Wrench },
  { name: 'Workers', href: '/workers', icon: Users },
  { name: 'Roster', href: '/roster', icon: CalendarDays },
  { name: 'Tasks', href: '/tasks', icon: ListTodo },
  { name: 'Attendance', href: '/workers/attendance', icon: Clock },
  { name: 'Messages', href: '/messages', icon: FileText },
  { name: 'Correspondence', href: '/correspondence', icon: Mail },
  { name: 'Leave', href: '/hr/leave', icon: Calendar },
  { name: 'Finance', href: '/finance', icon: DollarSign },
  { name: 'Profitability', href: '/finance/profitability', icon: DollarSign },
  { name: 'Contracts', href: '/contracts', icon: FileText },
  { name: 'Marketplace', href: '/marketplace', icon: Store },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Scheduled Reports', href: '/reports/scheduled', icon: BarChart3 },
  { name: 'Weather', href: '/weather', icon: CloudSun },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ open = false, onNavigate }: { open?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const [collapsed, setCollapsed] = useState(false);

  // Visibility comes from the same map AppLayout gates routes with, so the
  // nav can never offer a link the user would be denied on arrival.
  const filteredNav = navigation.filter((item) => {
    const required = requiredPermissionsForPath(item.href);
    return !required || required.length === 0 || required.some((p) => hasPermission(p));
  });

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
        {filteredNav.map((item) => {
          const isActive = item.href === '/'
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
