import { loadEnv } from '@farm/env';

loadEnv();

export interface ServiceRoute {
  path: string;
  target: string;
  service: string;
  rewrite?: boolean;
  public?: boolean;
}

export interface DomainRoutingConfig {
  services: ServiceRoute[];
  publicPaths: string[];
  healthCheckPath: string;
}

function resolveTarget(serviceName: string): string {
  const envKey = serviceName.replace(/-/g, '_').toUpperCase() + '_URL';
  const target = process.env[envKey];
  if (!target) {
    throw new Error(`Environment variable ${envKey} is required but not set`);
  }
  return target;
}

// Routes are built lazily on first access so that env vars (loaded by
// @farm/env's loadEnv()) are guaranteed to be present. Building them at
// module-eval time would run BEFORE loadEnv() due to ES import hoisting.
let cachedRoutes: ServiceRoute[] | null = null;

function buildRoutes(): ServiceRoute[] {
  const auth = resolveTarget('auth-service');
  const farm = resolveTarget('farm-service');
  const notification = resolveTarget('notification-service');
  const finance = resolveTarget('finance-service');
  const reporting = resolveTarget('reporting-service');
  const organization = resolveTarget('organization-service');
  const hr = resolveTarget('hr-service');
  const platform = resolveTarget('platform-service');

  return [
    // Identity & Access Context
    { path: '/auth', target: auth, service: 'auth-service', rewrite: false, public: true },
    { path: '/roles', target: auth, service: 'auth-service', rewrite: false },
    { path: '/permissions', target: auth, service: 'auth-service', rewrite: false },
    { path: '/admin', target: auth, service: 'auth-service', rewrite: false },
    { path: '/org-admin', target: auth, service: 'auth-service', rewrite: false },
    { path: '/api-keys', target: auth, service: 'auth-service', rewrite: false },
    { path: '/platform-roles', target: auth, service: 'auth-service', rewrite: false },
    { path: '/platform-permissions', target: auth, service: 'auth-service', rewrite: false },
    { path: '/platform-api-keys', target: auth, service: 'auth-service', rewrite: false },

    // Farm Management Context (unified: farm + crop + livestock + poultry)
    { path: '/farms', target: farm, service: 'farm-service', rewrite: true },
    { path: '/fields', target: farm, service: 'farm-service', rewrite: true },
    { path: '/crops', target: farm, service: 'farm-service', rewrite: true },
    { path: '/crop-cycles', target: farm, service: 'farm-service', rewrite: true },
    { path: '/lifecycle', target: farm, service: 'farm-service', rewrite: true },
    { path: '/irrigation', target: farm, service: 'farm-service', rewrite: true },
    { path: '/pest-disease', target: farm, service: 'farm-service', rewrite: true },
    { path: '/yield', target: farm, service: 'farm-service', rewrite: true },
    { path: '/livestock', target: farm, service: 'farm-service', rewrite: true },
    { path: '/poultry', target: farm, service: 'farm-service', rewrite: true },
    { path: '/medications', target: farm, service: 'farm-service', rewrite: true },

    // Notification Context
    { path: '/notifications', target: notification, service: 'notification-service', rewrite: true },

    // Finance Context
    { path: '/finance', target: finance, service: 'finance-service', rewrite: true },

    // Reporting Context
    { path: '/reporting', target: reporting, service: 'reporting-service', rewrite: true },

    // Organization Management Context
    { path: '/organizations', target: organization, service: 'organization-service', rewrite: true },

    // HR & Workforce Context (includes workers)
    { path: '/workers', target: hr, service: 'hr-service', rewrite: true },
    { path: '/tasks', target: hr, service: 'hr-service', rewrite: true },
    { path: '/attendance', target: hr, service: 'hr-service', rewrite: true },
    { path: '/leave', target: hr, service: 'hr-service', rewrite: true },
    { path: '/shifts', target: hr, service: 'hr-service', rewrite: true },
    { path: '/shift-assignments', target: hr, service: 'hr-service', rewrite: true },
    { path: '/messages', target: hr, service: 'hr-service', rewrite: true },
    { path: '/correspondence', target: hr, service: 'hr-service', rewrite: true },

    // Platform Administration Context (platform-service uses /api global prefix)
    { path: '/api', target: platform, service: 'platform-service', rewrite: false },
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

export const DOMAIN_ROUTING_CONFIG: DomainRoutingConfig = {
  get services() {
    return getRoutes();
  },
  publicPaths: Array.from(PUBLIC_PATHS),
  healthCheckPath: '/health',
};
