export type DashboardCardCategory = 'overview' | 'finance' | 'operations' | 'hr' | 'inventory';

export interface DashboardCardMeta {
  id: string;
  title: string;
  category: DashboardCardCategory;
  icon: string;
  requiredPermission?: string;
  defaultEnabled: boolean;
  defaultRoles: string[];
  route?: string;
  description?: string;
}

export interface DashboardCardConfig extends DashboardCardMeta {
  enabled: boolean;
  order: number;
  roles: string[];
}

/**
 * Every card that can appear on the mobile dashboard. Visibility, ordering and
 * role access are driven by the organization's dashboard_config (stored in
 * Organization.settings), merged against these defaults.
 *
 * Cards not listed here are never rendered — no hardcoded fallback set.
 */
export const DASHBOARD_CARDS: Record<string, DashboardCardMeta> = {
  'overview': {
    id: 'overview',
    title: 'Overview',
    category: 'overview',
    icon: '📊',
    requiredPermission: undefined,
    defaultEnabled: true,
    defaultRoles: [],
    description: 'Farm, crop, livestock, poultry and pond counts',
  },
  'financial-summary': {
    id: 'financial-summary',
    title: 'Financial Summary',
    category: 'finance',
    icon: '💰',
    requiredPermission: 'finance.read',
    defaultEnabled: true,
    defaultRoles: ['owner', 'accountant'],
    route: '/finance',
    description: 'Income, expenses and net profit',
  },
  'alerts': {
    id: 'alerts',
    title: 'Alerts',
    category: 'operations',
    icon: '⚠️',
    requiredPermission: undefined,
    defaultEnabled: true,
    defaultRoles: [],
    description: 'Operational alerts (absences, overspend, pending work)',
  },
  'todays-attendance': {
    id: 'todays-attendance',
    title: "Today's Attendance",
    category: 'hr',
    icon: '👥',
    requiredPermission: 'hr.read',
    defaultEnabled: true,
    defaultRoles: ['owner', 'manager', 'supervisor'],
    route: '/attendance',
    description: 'Present, absent and late workers today',
  },
  'pending-tasks': {
    id: 'pending-tasks',
    title: 'Pending Tasks',
    category: 'operations',
    icon: '📋',
    requiredPermission: 'hr.read',
    defaultEnabled: true,
    defaultRoles: ['owner', 'manager', 'supervisor'],
    route: '/tasks',
    description: 'Tasks awaiting completion',
  },
  'quick-actions': {
    id: 'quick-actions',
    title: 'Quick Actions',
    category: 'operations',
    icon: '⚡',
    requiredPermission: undefined,
    defaultEnabled: true,
    defaultRoles: [],
    route: '/farms/add',
    description: 'Create new records across modules',
  },
  'recent-activity': {
    id: 'recent-activity',
    title: 'Recent Activity',
    category: 'operations',
    icon: '📬',
    requiredPermission: undefined,
    defaultEnabled: true,
    defaultRoles: [],
    route: '/notifications',
    description: 'Latest notifications and activity',
  },
};

export const DEFAULT_CARD_ORDER: string[] = [
  'overview',
  'financial-summary',
  'alerts',
  'todays-attendance',
  'pending-tasks',
  'quick-actions',
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
      if (userRole && card.defaultRoles.length > 0 && !card.roles.includes(userRole)) return false;
      return true;
    })
    .sort((a, b) => a.order - b.order);
}
