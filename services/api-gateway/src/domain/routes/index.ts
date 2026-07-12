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

export const DOMAIN_ROUTES: ServiceRoute[] = [
  // Identity & Access Context
  { path: '/auth', target: 'http://localhost:4001', service: 'auth-service', rewrite: false, public: true },
  { path: '/roles', target: 'http://localhost:4001', service: 'auth-service', rewrite: false },
  { path: '/permissions', target: 'http://localhost:4001', service: 'auth-service', rewrite: false },
  { path: '/admin', target: 'http://localhost:4001', service: 'auth-service', rewrite: false },
  { path: '/org-admin', target: 'http://localhost:4001', service: 'auth-service', rewrite: false },
  { path: '/api-keys', target: 'http://localhost:4001', service: 'auth-service', rewrite: false },

  // Farm Management Context
  { path: '/farms', target: 'http://localhost:4002', service: 'farm-service', rewrite: true },
  { path: '/fields', target: 'http://localhost:4002', service: 'farm-service', rewrite: true },

  // Livestock Management Context
  { path: '/livestock', target: 'http://localhost:4003', service: 'livestock-service', rewrite: true },

  // Poultry Management Context
  { path: '/poultry', target: 'http://localhost:4004', service: 'poultry-service', rewrite: true },
  { path: '/medications', target: 'http://localhost:4004', service: 'poultry-service', rewrite: true },

  // Notification Context
  { path: '/notifications', target: 'http://localhost:4005', service: 'notification-service', rewrite: true },

  // Finance Context
  { path: '/finance', target: 'http://localhost:4006', service: 'finance-service', rewrite: true },

  // Worker Management Context
  { path: '/workers', target: 'http://localhost:4007', service: 'worker-service', rewrite: true },

  // Reporting Context
  { path: '/reporting', target: 'http://localhost:4008', service: 'reporting-service', rewrite: true },

  // Organization Management Context
  { path: '/organizations', target: 'http://localhost:4009', service: 'organization-service', rewrite: true },

  // HR & Workforce Context
  { path: '/tasks', target: 'http://localhost:4012', service: 'hr-service', rewrite: true },
  { path: '/attendance', target: 'http://localhost:4012', service: 'hr-service', rewrite: true },
  { path: '/leave', target: 'http://localhost:4012', service: 'hr-service', rewrite: true },
  { path: '/shifts', target: 'http://localhost:4012', service: 'hr-service', rewrite: true },
  { path: '/shift-assignments', target: 'http://localhost:4012', service: 'hr-service', rewrite: true },
  { path: '/messages', target: 'http://localhost:4012', service: 'hr-service', rewrite: true },
  { path: '/correspondence', target: 'http://localhost:4012', service: 'hr-service', rewrite: true },

  // Platform Administration Context
  { path: '/platform', target: 'http://localhost:4020', service: 'platform-service', rewrite: true },
  { path: '/weather', target: 'http://localhost:4020', service: 'platform-service', rewrite: false },
  { path: '/documents', target: 'http://localhost:4020', service: 'platform-service', rewrite: false },
];

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
