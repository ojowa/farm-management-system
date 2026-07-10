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
  Heart,
  Baby,
  Droplets,
  Bug,
  CloudSun,
  MapPin,
  Wrench,
  FileText,
  Store,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, module: null, permission: null },
  { name: 'Users', href: '/users', icon: UserCog, adminOnly: true, module: null, permission: 'users.manage' },
  { name: 'Roles', href: '/roles', icon: Shield, adminOnly: true, module: null, permission: null },
  { name: 'Farms', href: '/farms', icon: Home, module: 'farm', permission: 'farm.read' },
  { name: 'Farm Map', href: '/farms/map', icon: MapPin, module: 'farm', permission: 'farm.read' },
  { name: 'Crops', href: '/crops', icon: Sprout, module: 'crop', permission: 'crop.read' },
  { name: 'Crop Calendar', href: '/crops/calendar', icon: Calendar, module: 'crop', permission: 'crop.read' },
  { name: 'Pest & Disease', href: '/crops/pest-disease', icon: Bug, module: 'crop', permission: 'crop.read' },
  { name: 'Livestock', href: '/livestock', icon: Beef, module: 'livestock', permission: 'livestock.read' },
  { name: 'Health', href: '/livestock/health', icon: Heart, module: 'livestock', permission: 'livestock.read' },
  { name: 'Breeding', href: '/livestock/breeding', icon: Baby, module: 'livestock', permission: 'livestock.read' },
  { name: 'Irrigation', href: '/irrigation', icon: Droplets, module: 'crop', permission: 'crop.read' },
  { name: 'Poultry', href: '/poultry', icon: Egg, module: 'poultry', permission: 'poultry.read' },
  { name: 'Inventory', href: '/inventory', icon: Package, module: 'inventory', permission: 'inventory.read' },
  { name: 'Low Stock', href: '/inventory/low-stock', icon: Package, module: 'inventory', permission: 'inventory.read' },
  { name: 'Equipment', href: '/equipment', icon: Wrench, module: 'inventory', permission: 'inventory.read' },
  { name: 'Workers', href: '/workers', icon: Users, module: 'worker', permission: 'worker.read' },
  { name: 'Tasks', href: '/tasks', icon: ListTodo, module: 'worker', permission: 'worker.read' },
  { name: 'Attendance', href: '/workers/attendance', icon: Clock, module: 'worker', permission: 'worker.read' },
  { name: 'Finance', href: '/finance', icon: DollarSign, module: 'finance', permission: 'finance.read' },
  { name: 'Profitability', href: '/finance/profitability', icon: DollarSign, module: 'finance', permission: 'finance.read' },
  { name: 'Contracts', href: '/contracts', icon: FileText, module: 'finance', permission: 'finance.read' },
  { name: 'Marketplace', href: '/marketplace', icon: Store, module: 'finance', permission: 'finance.read' },
  { name: 'Messages', href: '/messages', icon: FileText, module: 'communication', permission: 'communication.read' },
  { name: 'Reports', href: '/reports', icon: BarChart3, module: 'reporting', permission: 'reporting.read' },
  { name: 'Scheduled Reports', href: '/reports/scheduled', icon: BarChart3, module: 'reporting', permission: 'reporting.read' },
  { name: 'Weather', href: '/weather', icon: CloudSun, module: null, permission: null },
  { name: 'Settings', href: '/settings', icon: Settings, module: null, permission: null },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const [collapsed, setCollapsed] = useState(false);

  const isSuperAdmin = user?.role?.name === 'SUPER_ADMIN';

  const filteredNav = navigation.filter((item) => {
    if (item.adminOnly && !isSuperAdmin) return false;
    if (item.module && user?.role?.permissions) {
      const modules = user.role.permissions.flatMap((p: any) => p.permission?.map((pp: any) => pp.name?.split('.')[0]) || []);
      if (modules.length > 0 && !modules.includes(item.module)) return false;
    }
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  });

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
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
