import { Controller, Get } from '@nestjs/common';

/**
 * Liveness endpoint for the domain services.
 *
 * `PlatformHealthService.checkAll()` probes `<service>/health` for every
 * logical service, but only the gateway ever had a health controller — the
 * domain services answered `404 Cannot GET /health`, so the console's health
 * check could only ever report `degraded`. Registering this module in each
 * service entrypoint gives the probe a real contract to hit.
 *
 * Kept deliberately small (no DB round-trip): the database is probed
 * separately by `PlatformHealthService`.
 */
@Controller()
export class HealthController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: process.env.SERVICE_NAME || 'app-server',
      timestamp: new Date().toISOString(),
      // Seconds — the console renders this as "1h 30m".
      uptime: Math.round(process.uptime()),
      // Resident set size in bytes — stored as SystemHealth.memoryUsage.
      memory: process.memoryUsage().rss,
    };
  }

  @Get('health/ready')
  ready() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      service: process.env.SERVICE_NAME || 'app-server',
    };
  }

  @Get('health/live')
  live() {
    return { status: 'alive' };
  }
}
