import { Controller, Get, Req } from '@nestjs/common';
import { RoutingService } from '../../application/services/routing.service';

@Controller('health')
export class HealthController {
  constructor(private readonly routingService: RoutingService) {}

  @Get()
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
    };
  }

  @Get('ready')
  ready() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      routes: this.routingService.getAllRoutes().length,
    };
  }

  @Get('live')
  live() {
    return { status: 'alive' };
  }

  @Get('routes')
  getRoutes() {
    return {
      routes: this.routingService.getAllRoutes(),
    };
  }
}
