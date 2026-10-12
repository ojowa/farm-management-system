import { Controller, Get } from '@nestjs/common';

/**
 * Liveness/readiness endpoints (formerly served by the gateway's
 * proxy/health.controller.ts). Kept envelope-free — the `RAW_PATH_PREFIXES`
 * list in EnvelopeInterceptor matches the old gateway behaviour where these
 * were returned unwrapped.
 */
@Controller('health')
export class HealthController {
  @Get()
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'farm-server-modular',
    };
  }

  @Get('ready')
  ready() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      topology: 'modular-monolith',
    };
  }

  @Get('live')
  live() {
    return { status: 'alive' };
  }
}