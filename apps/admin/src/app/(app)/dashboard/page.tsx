'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import {
  Home,
  Sprout,
  Beef,
  Egg,
  Package,
  Users,
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  DollarSign,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { farmsAPI, cropsAPI, livestockAPI, poultryAPI } from '@/lib/api';
import { useReadOnly } from '@/lib/useReadOnly';

const stats = [
  { name: 'Total Farms', value: '12', change: '+2', changeType: 'up' as const, icon: Home, color: 'bg-blue-500', href: '/farms' },
  { name: 'Active Crops', value: '48', change: '+5', changeType: 'up' as const, icon: Sprout, color: 'bg-green-500', href: '/crops' },
  { name: 'Livestock', value: '1,234', change: '+12', changeType: 'up' as const, icon: Beef, color: 'bg-amber-500', href: '/livestock' },
  { name: 'Poultry Birds', value: '15,670', change: '-3%', changeType: 'down' as const, icon: Egg, color: 'bg-orange-500', href: '/poultry' },
];

const quickActions = [
  { name: 'Add Farm', href: '/farms/new', icon: Home, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  { name: 'New Crop', href: '/crops/new', icon: Sprout, color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
  { name: 'Add Livestock', href: '/livestock/new', icon: Beef, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  { name: 'New Flock', href: '/poultry/flocks/new', icon: Egg, color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
  { name: 'Inventory Item', href: '/inventory/new', icon: Package, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
  { name: 'Add Worker', href: '/workers/new', icon: Users, color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
];

const recentActivity = [
  { id: '1', title: 'New farm added', description: 'Green Valley Farm created', time: '2 hours ago', status: 'success' as const },
  { id: '2', title: 'Crop harvested', description: 'Wheat - Field A (2.5 tons)', time: '4 hours ago', status: 'success' as const },
  { id: '3', title: 'Health alert', description: 'Cow #B-204 needs vaccination', time: '6 hours ago', status: 'warning' as const },
  { id: '4', title: 'Mortality recorded', description: 'Flock #FL-001: 3 birds', time: '8 hours ago', status: 'destructive' as const },
  { id: '5', title: 'Low stock alert', description: 'Chicken feed (45 bags remaining)', time: '12 hours ago', status: 'warning' as const },
  { id: '6', title: 'Task completed', description: 'John Doe completed fence repair', time: '1 day ago', status: 'success' as const },
];

const alerts = [
  { id: '1', title: 'Vaccination Due', description: '50 cattle need vaccination this week', severity: 'warning' as const, action: 'View Schedule', href: '/livestock' },
  { id: '2', title: 'Low Feed Stock', description: 'Chicken feed below minimum threshold', severity: 'destructive' as const, action: 'Order Now', href: '/inventory' },
  { id: '3', title: 'Crop Disease Alert', description: 'Possible rust detected in Field C', severity: 'warning' as const, action: 'Inspect', href: '/crops' },
];

function StatCard({ stat }: { stat: typeof stats[0] }) {
  const Icon = stat.icon;
  const isUp = stat.changeType === 'up';
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
            <div className="flex items-center gap-1 mt-2">
              {isUp ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
              <span className={`text-sm font-medium ${isUp ? 'text-green-600' : 'text-red-600'}`}>{stat.change}</span>
              <span className="text-sm text-muted-foreground">vs last month</span>
            </div>
          </div>
          <div className={`p-3 rounded-xl ${stat.color}`}><Icon className="h-6 w-6 text-white" /></div>
        </div>
        <div className="mt-4">
          <Link href={stat.href} className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 w-full">
            View Details <ArrowUpRight className="ml-1 h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionCard({ action }: { action: typeof quickActions[0] }) {
  const Icon = action.icon;
  return (
    <Link href={action.href} className="group">
      <Card className="h-full transition-all hover:shadow-md cursor-pointer">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center">
          <div className={`p-3 rounded-xl ${action.color} group-hover:scale-110 transition-transform`}>
            <Icon className="h-6 w-6" />
          </div>
          <span className="mt-3 font-medium text-sm">{action.name}</span>
        </CardContent>
      </Card>
    </Link>
  );
}

function ActivityItem({ activity }: { activity: typeof recentActivity[0] }) {
  const iconMap = { success: <CheckCircle className="h-4 w-4 text-green-600" />, warning: <AlertTriangle className="h-4 w-4 text-yellow-600" />, destructive: <AlertTriangle className="h-4 w-4 text-red-600" /> };
  return (
    <div className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors">
      <div className="flex-shrink-0 mt-0.5">{iconMap[activity.status]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{activity.title}</p>
        <p className="text-sm text-muted-foreground">{activity.description}</p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
    </div>
  );
}

function AlertCard({ alert }: { alert: typeof alerts[0] }) {
  const severityColors = {
    warning: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    destructive: 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800',
  };
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${severityColors[alert.severity]}`}>
      <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium">{alert.title}</p>
        <p className="text-sm opacity-90 mt-0.5">{alert.description}</p>
      </div>
      <Link href={alert.href} className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
        {alert.action}
      </Link>
    </div>
  );
}

function DashboardContent() {
  const readOnly = useReadOnly();
  const [statsData, setStatsData] = React.useState(stats);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const [farms, crops, livestock, poultry] = await Promise.allSettled([
          farmsAPI.list({ limit: 1 }),
          cropsAPI.list({ limit: 1 }),
          livestockAPI.list({ limit: 1 }),
          poultryAPI.list({ limit: 1 }),
        ]);
        setStatsData([
          { ...stats[0], value: farms.status === 'fulfilled' ? String(farms.value.data.total || 12) : '12' },
          { ...stats[1], value: crops.status === 'fulfilled' ? String(crops.value.data.total || 48) : '48' },
          { ...stats[2], value: livestock.status === 'fulfilled' ? String(livestock.value.data.total || 1234) : '1,234' },
          { ...stats[3], value: poultry.status === 'fulfilled' ? String(poultry.value.data.total || 15670) : '15,670' },
        ]);
      } catch { /* keep defaults */ } finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your farm operations</p>
        </div>
        {!readOnly && (
          <Link href="/farms/new" className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            <Plus className="mr-2 h-4 w-4" />Add Farm
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-6"><div className="h-20 bg-muted animate-pulse rounded" /></CardContent></Card>)
          : statsData.map((stat) => <StatCard key={stat.name} stat={stat} />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-600" />Alerts</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ArrowUpRight className="h-5 w-5" />Quick Actions</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {quickActions
                  .filter(() => !readOnly)
                  .map((action) => <QuickActionCard key={action.name} action={action} />)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentActivity.map((activity) => <ActivityItem key={activity.id} activity={activity} />)}
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Production Overview</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12" /><span className="ml-3">Chart placeholder</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Financial Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <DollarSign className="h-12 w-12" /><span className="ml-3">Chart placeholder</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><div className="h-8 w-48 bg-muted animate-pulse rounded" /><div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-6 h-32 bg-muted animate-pulse" /></Card>)}</div></div>}>
      <DashboardContent />
    </Suspense>
  );
}
