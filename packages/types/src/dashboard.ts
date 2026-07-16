export interface DashboardStats {
  totalFarms: number;
  totalCrops: number;
  totalLivestock: number;
  totalWorkers: number;
  activeTasks: number;
  pendingExpenses: number;
  recentAlerts: number;
}

export interface KPIData {
  label: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  unit?: string;
}

export interface FarmOverview {
  farmId: string;
  farmName: string;
  farmType: string;
  totalCrops: number;
  totalLivestock: number;
  totalWorkers: number;
  activeTasks: number;
  healthScore?: number;
}

export interface DashboardData {
  stats: DashboardStats;
  kpis: KPIData[];
  farmOverviews: FarmOverview[];
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  metadata?: Record<string, unknown>;
}
