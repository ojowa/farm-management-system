import { Home, Sprout, Beef, Egg, Fish, Package, Users, Plus, ArrowUpRight, AlertTriangle, CheckCircle, Clock, ListTodo, BarChart2, AreaChart, PieChart, DollarSign, Activity, Mail } from 'lucide-react';

export type DashboardCardCategory = 'overview' | 'finance' | 'operations' | 'hr' | 'inventory';

export interface DashboardCardMeta {
  id: string;
  title: string;
  category: DashboardCardCategory;
  icon: React.ComponentType<any>;
  requiredPermission?: string;
  defaultEnabled: boolean;
  defaultRoles: string[];
  gridSpan?: { md?: number; lg?: number; xl?: number };
  href?: string;
  description?: string;
}

export interface DashboardCardConfig extends DashboardCardMeta {
  enabled: boolean;
  order: number;
  roles: string[];
}

/**
 * Every card that can appear on the admin dashboard. Visibility, ordering and
 * role access are driven by the organization's dashboard_config (stored in
 * Organization.settings), merged against these defaults.
 *
 * Cards not listed here are never rendered — no hardcoded fallback set.
 */
export const DASHBOARD_CARDS: Record<string, DashboardCardMeta> = {
  'total-farms': {
    id: 'total-farms',
    title: 'Total Farms',
    category: 'overview',
    icon: Home,
    requiredPermission: 'farm.read',
    defaultEnabled: true,
    defaultRoles: [],
    href: '/farms',
    description: 'Count of farms in this organization',
  },
  'total-crops': {
    id: 'total-crops',
    title: 'Total Crops',
    category: 'overview',
    icon: Sprout,
    requiredPermission: 'crop.read',
    defaultEnabled: true,
    defaultRoles: [],
    href: '/crops',
    description: 'Count of crops in this organization',
  },
  'total-livestock': {
    id: 'total-livestock',
    title: 'Livestock',
    category: 'overview',
    icon: Beef,
    requiredPermission: 'livestock.read',
    defaultEnabled: true,
    defaultRoles: [],
    href: '/livestock',
    description: 'Count of livestock in this organization',
  },
  'total-poultry': {
    id: 'total-poultry',
    title: 'Poultry',
    category: 'overview',
    icon: Egg,
    requiredPermission: 'poultry.read',
    defaultEnabled: true,
    defaultRoles: [],
    href: '/poultry',
    description: 'Count of poultry in this organization',
  },
  'total-ponds': {
    id: 'total-ponds',
    title: 'Ponds',
    category: 'overview',
    icon: Fish,
    requiredPermission: 'aquaculture.read',
    defaultEnabled: true,
    defaultRoles: [],
    href: '/aquaculture',
    description: 'Count of ponds in this organization',
  },
  'financial-summary': {
    id: 'financial-summary',
    title: 'Financial Summary',
    category: 'finance',
    icon: DollarSign,
    requiredPermission: 'finance.read',
    defaultEnabled: true,
    defaultRoles: ['owner', 'accountant'],
    href: '/finance',
    description: 'Income, expenses and net profit',
  },
  'profit-trend': {
    id: 'profit-trend',
    title: 'Profit Trend',
    category: 'finance',
    icon: AreaChart,
    requiredPermission: 'finance.read',
    defaultEnabled: true,
    defaultRoles: ['owner', 'accountant'],
    href: '/finance/profitability',
    description: 'Monthly net profit trend',
  },
  'expense-breakdown': {
    id: 'expense-breakdown',
    title: 'Expense Breakdown',
    category: 'finance',
    icon: PieChart,
    requiredPermission: 'finance.read',
    defaultEnabled: true,
    defaultRoles: ['owner', 'accountant'],
    href: '/finance/transactions',
    description: 'Expenses by category',
  },
  "todays-attendance": {
    id: "todays-attendance",
    title: "Today's Attendance",
    category: 'hr',
    icon: Clock,
    requiredPermission: 'hr.read',
    defaultEnabled: true,
    defaultRoles: ['owner', 'manager', 'supervisor'],
    href: '/workers/attendance',
    description: 'Present, absent and late workers today',
  },
  'pending-tasks': {
    id: 'pending-tasks',
    title: 'Pending Tasks',
    category: 'operations',
    icon: ListTodo,
    requiredPermission: 'hr.read',
    defaultEnabled: true,
    defaultRoles: ['owner', 'manager', 'supervisor'],
    href: '/tasks',
    description: 'Tasks awaiting completion',
  },
  'alerts': {
    id: 'alerts',
    title: 'Alerts',
    category: 'operations',
    icon: AlertTriangle,
    requiredPermission: undefined,
    defaultEnabled: true,
    defaultRoles: [],
    href: '/finance',
    description: 'Operational alerts (absences, overspend, pending work)',
  },
  'quick-actions': {
    id: 'quick-actions',
    title: 'Quick Actions',
    category: 'operations',
    icon: ArrowUpRight,
    requiredPermission: undefined,
    defaultEnabled: true,
    defaultRoles: [],
    href: '/farms/new',
    description: 'Create new records across modules',
  },
  'financial-chart': {
    id: 'financial-chart',
    title: 'Financial Summary Chart',
    category: 'finance',
    icon: BarChart2,
    requiredPermission: 'finance.read',
    defaultEnabled: true,
    defaultRoles: ['owner', 'accountant'],
    href: '/finance/profitability',
    description: 'Monthly income vs expenses bar chart',
  },
  'recent-activity': {
    id: 'recent-activity',
    title: 'Recent Activity',
    category: 'operations',
    icon: Mail,
    requiredPermission: undefined,
    defaultEnabled: true,
    defaultRoles: [],
    href: '/notifications',
    description: 'Latest notifications and activity',
  },
};

export const DEFAULT_CARD_ORDER: string[] = [
  'total-farms',
  'total-crops',
  'total-livestock',
  'total-poultry',
  'total-ponds',
  'financial-summary',
  'profit-trend',
  'expense-breakdown',
  "todays-attendance",
  'pending-tasks',
  'alerts',
  'quick-actions',
  'financial-chart',
  'recent-activity',
];

export function getCardMeta(cardId: string): DashboardCardMeta | undefined {
  return DASHBOARD_CARDS[cardId];
}

export function getAllCardIds(): string[] {
  return Object.keys(DASHBOARD_CARDS);
}

export function buildDefaultConfig(): Record<string, DashboardCardConfig> {
  const config: Record<string, DashboardCardConfig> = {};
  DEFAULT_CARD_ORDER.forEach((id, index) => {
    const meta = DASHBOARD_CARDS[id];
    if (!meta) return;
    config[id] = {
      ...meta,
      enabled: meta.defaultEnabled,
      order: index,
      roles: [...meta.defaultRoles],
    };
  });
  return config;
}

export function mergeConfigWithDefaults(
  dbConfig: Record<string, any> | null | undefined,
): Record<string, DashboardCardConfig> {
  const defaults = buildDefaultConfig();
  if (!dbConfig || typeof dbConfig !== 'object') return defaults;

  const merged: Record<string, DashboardCardConfig> = { ...defaults };

  Object.entries(dbConfig).forEach(([id, value]) => {
    if (!value || typeof value !== 'object') return;
    const meta = DASHBOARD_CARDS[id];
    if (!meta) return;

    merged[id] = {
      ...defaults[id],
      ...value,
      id,
      enabled: value.enabled !== undefined ? value.enabled : defaults[id].enabled,
      order: value.order !== undefined ? value.order : defaults[id].order,
      roles: Array.isArray(value.roles) ? value.roles : defaults[id].roles,
    };
  });

  return merged;
}

export function getVisibleCards(
  config: Record<string, DashboardCardConfig>,
  userRole: string,
  userPermissions: string[],
  hasPermission: (permission: string) => boolean,
): DashboardCardConfig[] {
  return Object.values(config)
    .filter((card) => {
      if (!card.enabled) return false;
      if (card.requiredPermission && !hasPermission(card.requiredPermission)) return false;
      // Only apply role filtering when a role is actually set; an empty role
      // means "no role information available" and should not hide cards.
      if (userRole && card.defaultRoles.length > 0 && !card.roles.includes(userRole)) return false;
      return true;
    })
    .sort((a, b) => a.order - b.order);
}
