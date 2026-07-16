export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs?: number;
  message?: string;
  lastChecked: string;
}

export interface ServiceHealth {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'down';
  version: string;
  uptime: number;
  checks: HealthCheck[];
  lastRestart?: string;
}

export interface HealthSummary {
  overall: 'healthy' | 'degraded' | 'down';
  services: ServiceHealth[];
  timestamp: string;
}
