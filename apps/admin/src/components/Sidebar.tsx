'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { adminAPI } from '@/lib/api';
import { usePermission } from '@/lib/usePermission';
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
  Building2,
  Shield,
  UserCog,
  ChevronDown,
  Check,
  Globe,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, module: null, permission: null },
  { name: 'Organizations', href: '/organizations', icon: Building2, adminOnly: true, module: null, permission: null },
  { name: 'Users', href: '/users', icon: UserCog, adminOnly: true, module: null, permission: 'users.manage' },
  { name: 'Roles', href: '/roles', icon: Shield, adminOnly: true, module: null, permission: null },
  { name: 'Farms', href: '/farms', icon: Home, module: 'farm', permission: 'farm.read' },
  { name: 'Crops', href: '/crops', icon: Sprout, module: 'crop', permission: 'crop.read' },
  { name: 'Livestock', href: '/livestock', icon: Beef, module: 'livestock', permission: 'livestock.read' },
  { name: 'Poultry', href: '/poultry', icon: Egg, module: 'poultry', permission: 'poultry.read' },
  { name: 'Inventory', href: '/inventory', icon: Package, module: 'inventory', permission: 'inventory.read' },
  { name: 'Workers', href: '/workers', icon: Users, module: 'worker', permission: 'worker.read' },
  { name: 'Finance', href: '/finance', icon: DollarSign, module: 'finance', permission: 'finance.read' },
  { name: 'Reports', href: '/reports', icon: BarChart3, module: 'reporting', permission: 'reporting.read' },
  { name: 'Settings', href: '/settings', icon: Settings, module: null, permission: null },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const [collapsed, setCollapsed] = useState(false);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const displayOrgName = isSuperAdmin
    ? organizations.find((o) => o.id === selectedOrgId)?.name || 'All Organizations'
    : user?.organizationName || 'My Organization';

  // Load org list for SUPER_ADMIN
  useEffect(() => {
    if (isSuperAdmin) {
      const stored = localStorage.getItem('admin_selected_org');
      if (stored) setSelectedOrgId(stored);
      loadOrganizations();
    }
  }, [isSuperAdmin]);

  async function loadOrganizations() {
    setLoadingOrgs(true);
    try {
      const { data } = await adminAPI.listOrganizations();
      setOrganizations(data);
    } catch { /* ignore */ }
    finally { setLoadingOrgs(false); }
  }

  function handleOrgSelect(orgId: string | null) {
    setSelectedOrgId(orgId);
    if (orgId) {
      localStorage.setItem('admin_selected_org', orgId);
    } else {
      localStorage.removeItem('admin_selected_org');
    }
    setOrgSwitcherOpen(false);
    router.refresh();
  }

  const filteredNav = navigation.filter((item) => {
    if (item.adminOnly && !isSuperAdmin) return false;
    if (item.module && user?.planFeatures?.modules && !user.planFeatures.modules.includes(item.module)) return false;
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

      {/* Org Context Bar */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          {isSuperAdmin ? (
            <div className="relative">
              <button
                onClick={() => setOrgSwitcherOpen(!orgSwitcherOpen)}
                className="flex items-center gap-2 w-full text-left"
              >
                <Globe className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate flex-1">
                  {displayOrgName}
                </span>
                <ChevronDown className={cn('h-3 w-3 text-gray-400 transition-transform', orgSwitcherOpen && 'rotate-180')} />
              </button>
              {orgSwitcherOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  <button
                    onClick={() => handleOrgSelect(null)}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                      !selectedOrgId && 'bg-green-50 dark:bg-green-900/20'
                    )}
                  >
                    {!selectedOrgId && <Check className="h-3 w-3 text-green-600" />}
                    <span className={!selectedOrgId ? 'font-medium text-green-700' : ''}>All Organizations</span>
                  </button>
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleOrgSelect(org.id)}
                      className={cn(
                        'flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                        selectedOrgId === org.id && 'bg-green-50 dark:bg-green-900/20'
                      )}
                    >
                      {selectedOrgId === org.id && <Check className="h-3 w-3 text-green-600" />}
                      <span className={selectedOrgId === org.id ? 'font-medium text-green-700' : ''}>{org.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                {displayOrgName}
              </span>
            </div>
          )}
        </div>
      )}

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
              {user?.firstName?.[0] || 'U'}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.fullName || 'User'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.role}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
