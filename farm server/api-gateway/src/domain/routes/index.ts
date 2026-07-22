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
  const appServer = resolveTarget('app-server');

  return [
    // All routes go to the App Server (modular monolith)
    { path: '/auth', target: appServer, service: 'app-server', rewrite: false, public: true },
    { path: '/roles', target: appServer, service: 'app-server', rewrite: false },
    { path: '/permissions', target: appServer, service: 'app-server', rewrite: false },
    { path: '/admin', target: appServer, service: 'app-server', rewrite: false },
    { path: '/org-admin', target: appServer, service: 'app-server', rewrite: false },
    { path: '/api-keys', target: appServer, service: 'app-server', rewrite: false },
    { path: '/platform-roles', target: appServer, service: 'app-server', rewrite: false },
    { path: '/platform-permissions', target: appServer, service: 'app-server', rewrite: false },
    { path: '/platform-api-keys', target: appServer, service: 'app-server', rewrite: false },

    // Farm Management Context (unified: farm + crop + livestock + poultry)
    { path: '/farms', target: appServer, service: 'app-server', rewrite: false },
    { path: '/fields', target: appServer, service: 'app-server', rewrite: false },
    { path: '/crops', target: appServer, service: 'app-server', rewrite: false },
    { path: '/crop-cycles', target: appServer, service: 'app-server', rewrite: false },
    { path: '/lifecycle', target: appServer, service: 'app-server', rewrite: false },
    { path: '/irrigation', target: appServer, service: 'app-server', rewrite: false },
    { path: '/pest-disease', target: appServer, service: 'app-server', rewrite: false },
    { path: '/yield', target: appServer, service: 'app-server', rewrite: false },
    { path: '/livestock', target: appServer, service: 'app-server', rewrite: false },
    { path: '/poultry', target: appServer, service: 'app-server', rewrite: false },
    { path: '/medications', target: appServer, service: 'app-server', rewrite: false },

    // Notification Context
    { path: '/notifications', target: appServer, service: 'app-server', rewrite: false },

    // Finance Context
    { path: '/finance', target: appServer, service: 'app-server', rewrite: false },

    // Reporting Context
    { path: '/reporting', target: appServer, service: 'app-server', rewrite: false },

    // Organization Management Context
    { path: '/organizations', target: appServer, service: 'app-server', rewrite: false },

    // HR & Workforce Context (includes workers)
    { path: '/workers', target: appServer, service: 'app-server', rewrite: false },
    { path: '/tasks', target: appServer, service: 'app-server', rewrite: false },
    { path: '/attendance', target: appServer, service: 'app-server', rewrite: false },
    { path: '/leave', target: appServer, service: 'app-server', rewrite: false },
    { path: '/shifts', target: appServer, service: 'app-server', rewrite: false },
    { path: '/shift-assignments', target: appServer, service: 'app-server', rewrite: false },
    { path: '/messages', target: appServer, service: 'app-server', rewrite: false },
    { path: '/correspondence', target: appServer, service: 'app-server', rewrite: false },

    // Platform Administration Context (platform module uses individual @Controller('platform-*'))
    { path: '/platform-features', target: appServer, service: 'app-server', rewrite: false },
    { path: '/platform-subscriptions', target: appServer, service: 'app-server', rewrite: false },
    { path: '/platform-organizations', target: appServer, service: 'app-server', rewrite: false },
    { path: '/platform-options', target: appServer, service: 'app-server', rewrite: false },
    { path: '/platform-health', target: appServer, service: 'app-server', rewrite: false },
    { path: '/platform-broadcasts', target: appServer, service: 'app-server', rewrite: false },
    { path: '/platform-audit', target: appServer, service: 'app-server', rewrite: false },
    { path: '/platform-config', target: appServer, service: 'app-server', rewrite: false },
    { path: '/platform-users', target: appServer, service: 'app-server', rewrite: false },
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
