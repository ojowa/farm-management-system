import { loadEnv } from '@farm/env';

loadEnv();

export interface ServiceRoute {
  path: string;
  service: string;
  port: number;
  baseUrl: string;
  public?: boolean;
}

function resolvePort(serviceName: string, defaultPort: number): number {
  const envKey = serviceName.replace(/-/g, '_').toUpperCase() + '_PORT';
  return Number(process.env[envKey]) || defaultPort;
}

function resolveBaseUrl(serviceName: string, defaultPort: number): string {
  const port = resolvePort(serviceName, defaultPort);
  const envKey = serviceName.replace(/-/g, '_').toUpperCase() + '_URL';
  return process.env[envKey] || `http://localhost:${port}`;
}

let cachedRoutes: ServiceRoute[] | null = null;

function buildRoutes(): ServiceRoute[] {
  return [
    // Auth Context
    { path: '/auth', service: 'auth-service', port: resolvePort('auth-service', 4010), baseUrl: resolveBaseUrl('auth-service', 4010), public: true },
    { path: '/roles', service: 'auth-service', port: resolvePort('auth-service', 4010), baseUrl: resolveBaseUrl('auth-service', 4010) },
    { path: '/permissions', service: 'auth-service', port: resolvePort('auth-service', 4010), baseUrl: resolveBaseUrl('auth-service', 4010) },
    { path: '/admin', service: 'auth-service', port: resolvePort('auth-service', 4010), baseUrl: resolveBaseUrl('auth-service', 4010) },
    { path: '/org-admin', service: 'auth-service', port: resolvePort('auth-service', 4010), baseUrl: resolveBaseUrl('auth-service', 4010) },
    { path: '/api-keys', service: 'auth-service', port: resolvePort('auth-service', 4010), baseUrl: resolveBaseUrl('auth-service', 4010) },
    { path: '/platform-roles', service: 'auth-service', port: resolvePort('auth-service', 4010), baseUrl: resolveBaseUrl('auth-service', 4010) },
    { path: '/platform-permissions', service: 'auth-service', port: resolvePort('auth-service', 4010), baseUrl: resolveBaseUrl('auth-service', 4010) },
    { path: '/platform-api-keys', service: 'auth-service', port: resolvePort('auth-service', 4010), baseUrl: resolveBaseUrl('auth-service', 4010) },

    // Farm Management Context
    { path: '/farms', service: 'farm-service', port: resolvePort('farm-service', 4011), baseUrl: resolveBaseUrl('farm-service', 4011) },
    { path: '/fields', service: 'farm-service', port: resolvePort('farm-service', 4011), baseUrl: resolveBaseUrl('farm-service', 4011) },
    { path: '/crops', service: 'crop-service', port: resolvePort('crop-service', 4020), baseUrl: resolveBaseUrl('crop-service', 4020) },
    { path: '/crop-cycles', service: 'crop-service', port: resolvePort('crop-service', 4020), baseUrl: resolveBaseUrl('crop-service', 4020) },
    { path: '/lifecycle', service: 'crop-service', port: resolvePort('crop-service', 4020), baseUrl: resolveBaseUrl('crop-service', 4020) },
    { path: '/irrigation', service: 'crop-service', port: resolvePort('crop-service', 4020), baseUrl: resolveBaseUrl('crop-service', 4020) },
    { path: '/pest-disease', service: 'crop-service', port: resolvePort('crop-service', 4020), baseUrl: resolveBaseUrl('crop-service', 4020) },
    { path: '/yield', service: 'crop-service', port: resolvePort('crop-service', 4020), baseUrl: resolveBaseUrl('crop-service', 4020) },

    // Livestock Context
    { path: '/livestock', service: 'livestock-service', port: resolvePort('livestock-service', 4012), baseUrl: resolveBaseUrl('livestock-service', 4012) },
    { path: '/health', service: 'livestock-service', port: resolvePort('livestock-service', 4012), baseUrl: resolveBaseUrl('livestock-service', 4012) },
    { path: '/breeding', service: 'livestock-service', port: resolvePort('livestock-service', 4012), baseUrl: resolveBaseUrl('livestock-service', 4012) },
    { path: '/weight', service: 'livestock-service', port: resolvePort('livestock-service', 4012), baseUrl: resolveBaseUrl('livestock-service', 4012) },

    // Poultry Context
    { path: '/poultry', service: 'poultry-service', port: resolvePort('poultry-service', 4013), baseUrl: resolveBaseUrl('poultry-service', 4013) },
    { path: '/medications', service: 'poultry-service', port: resolvePort('poultry-service', 4013), baseUrl: resolveBaseUrl('poultry-service', 4013) },

    // Finance Context
    { path: '/finance', service: 'finance-service', port: resolvePort('finance-service', 4014), baseUrl: resolveBaseUrl('finance-service', 4014) },
    { path: '/expenses', service: 'finance-service', port: resolvePort('finance-service', 4014), baseUrl: resolveBaseUrl('finance-service', 4014) },
    { path: '/sales', service: 'finance-service', port: resolvePort('finance-service', 4014), baseUrl: resolveBaseUrl('finance-service', 4014) },
    { path: '/contracts', service: 'finance-service', port: resolvePort('finance-service', 4014), baseUrl: resolveBaseUrl('finance-service', 4014) },
    { path: '/marketplace', service: 'finance-service', port: resolvePort('finance-service', 4014), baseUrl: resolveBaseUrl('finance-service', 4014) },
    { path: '/profitability', service: 'finance-service', port: resolvePort('finance-service', 4014), baseUrl: resolveBaseUrl('finance-service', 4014) },

    // HR Context
    { path: '/workers', service: 'hr-service', port: resolvePort('hr-service', 4015), baseUrl: resolveBaseUrl('hr-service', 4015) },
    { path: '/tasks', service: 'hr-service', port: resolvePort('hr-service', 4015), baseUrl: resolveBaseUrl('hr-service', 4015) },
    { path: '/attendance', service: 'hr-service', port: resolvePort('hr-service', 4015), baseUrl: resolveBaseUrl('hr-service', 4015) },
    { path: '/leave', service: 'hr-service', port: resolvePort('hr-service', 4015), baseUrl: resolveBaseUrl('hr-service', 4015) },
    { path: '/shifts', service: 'hr-service', port: resolvePort('hr-service', 4015), baseUrl: resolveBaseUrl('hr-service', 4015) },
    { path: '/shift-assignments', service: 'hr-service', port: resolvePort('hr-service', 4015), baseUrl: resolveBaseUrl('hr-service', 4015) },
    { path: '/messages', service: 'hr-service', port: resolvePort('hr-service', 4015), baseUrl: resolveBaseUrl('hr-service', 4015) },
    { path: '/correspondence', service: 'hr-service', port: resolvePort('hr-service', 4015), baseUrl: resolveBaseUrl('hr-service', 4015) },

    // Notification Context
    { path: '/notifications', service: 'notification-service', port: resolvePort('notification-service', 4016), baseUrl: resolveBaseUrl('notification-service', 4016) },
    { path: '/devices', service: 'notification-service', port: resolvePort('notification-service', 4016), baseUrl: resolveBaseUrl('notification-service', 4016) },

    // Organization Context
    { path: '/organizations', service: 'organization-service', port: resolvePort('organization-service', 4017), baseUrl: resolveBaseUrl('organization-service', 4017) },

    // Platform Context
    { path: '/platform-features', service: 'platform-service', port: resolvePort('platform-service', 4018), baseUrl: resolveBaseUrl('platform-service', 4018) },
    { path: '/platform-subscriptions', service: 'platform-service', port: resolvePort('platform-service', 4018), baseUrl: resolveBaseUrl('platform-service', 4018) },
    { path: '/platform-organizations', service: 'platform-service', port: resolvePort('platform-service', 4018), baseUrl: resolveBaseUrl('platform-service', 4018) },
    { path: '/platform-options', service: 'platform-service', port: resolvePort('platform-service', 4018), baseUrl: resolveBaseUrl('platform-service', 4018) },
    { path: '/platform-health', service: 'platform-service', port: resolvePort('platform-service', 4018), baseUrl: resolveBaseUrl('platform-service', 4018) },
    { path: '/platform-broadcasts', service: 'platform-service', port: resolvePort('platform-service', 4018), baseUrl: resolveBaseUrl('platform-service', 4018) },
    { path: '/platform-audit', service: 'platform-service', port: resolvePort('platform-service', 4018), baseUrl: resolveBaseUrl('platform-service', 4018) },
    { path: '/platform-config', service: 'platform-service', port: resolvePort('platform-service', 4018), baseUrl: resolveBaseUrl('platform-service', 4018) },
    { path: '/platform-users', service: 'platform-service', port: resolvePort('platform-service', 4018), baseUrl: resolveBaseUrl('platform-service', 4018) },

    // Reporting Context
    { path: '/reports', service: 'reporting-service', port: resolvePort('reporting-service', 4019), baseUrl: resolveBaseUrl('reporting-service', 4019) },
    { path: '/schedule', service: 'reporting-service', port: resolvePort('reporting-service', 4019), baseUrl: resolveBaseUrl('reporting-service', 4019) },
  ];
}

export function getRoutes(): ServiceRoute[] {
  if (!cachedRoutes) {
    cachedRoutes = buildRoutes();
  }
  return cachedRoutes;
}

export const PUBLIC_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/register-console',
  '/auth/refresh',
  '/auth/verify-mfa',
  '/health',
  '/health/ready',
  '/health/live',
  '/docs',
]);
