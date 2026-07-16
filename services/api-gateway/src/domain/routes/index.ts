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

function resolveTarget(serviceName: string, defaultPort: number): string {
  const envKey = serviceName.replace(/-/g, '_').toUpperCase() + '_URL';
  return process.env[envKey] || `http://localhost:${defaultPort}`;
}

function buildRoutes(): ServiceRoute[] {
  const auth = resolveTarget('auth-service', 4001);
  const farm = resolveTarget('farm-service', 4002);
  const livestock = resolveTarget('livestock-service', 4003);
  const poultry = resolveTarget('poultry-service', 4004);
  const notification = resolveTarget('notification-service', 4005);
  const finance = resolveTarget('finance-service', 4006);
  const worker = resolveTarget('worker-service', 4007);
  const reporting = resolveTarget('reporting-service', 4008);
  const organization = resolveTarget('organization-service', 4009);
  const hr = resolveTarget('hr-service', 4012);
  const platform = resolveTarget('platform-service', 4020);

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

    // Farm Management Context
    { path: '/farms', target: farm, service: 'farm-service', rewrite: true },
    { path: '/fields', target: farm, service: 'farm-service', rewrite: true },

    // Livestock Management Context
    { path: '/livestock', target: livestock, service: 'livestock-service', rewrite: true },

    // Poultry Management Context
    { path: '/poultry', target: poultry, service: 'poultry-service', rewrite: true },
    { path: '/medications', target: poultry, service: 'poultry-service', rewrite: true },

    // Notification Context
    { path: '/notifications', target: notification, service: 'notification-service', rewrite: true },

    // Finance Context
    { path: '/finance', target: finance, service: 'finance-service', rewrite: true },

    // Worker Management Context
    { path: '/workers', target: worker, service: 'worker-service', rewrite: true },

    // Reporting Context
    { path: '/reporting', target: reporting, service: 'reporting-service', rewrite: true },

    // Organization Management Context
    { path: '/organizations', target: organization, service: 'organization-service', rewrite: true },

    // HR & Workforce Context
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

export const DOMAIN_ROUTES: ServiceRoute[] = buildRoutes();

export const PUBLIC_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/verify-mfa',
  '/health',
  '/health/ready',
  '/health/live',
  '/docs',
]);

export const DOMAIN_ROUTING_CONFIG: DomainRoutingConfig = {
  services: DOMAIN_ROUTES,
  publicPaths: Array.from(PUBLIC_PATHS),
  healthCheckPath: '/health',
};
