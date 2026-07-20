import { Controller, Post, Body, Logger, Req, ForbiddenException } from '@nestjs/common';
import { RealtimeGateway, RealtimeEvent } from './realtime.gateway';

@Controller('realtime')
export class RealtimeController {
  private logger = new Logger(RealtimeController.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  @Post('emit')
  handleEmitEvent(@Body() event: RealtimeEvent, @Req() req?: any) {
    // Only platform admins can broadcast events to all connected clients.
    // The proxy middleware sets x-user-role from the verified JWT.
    const role = req?.headers?.['x-user-role'];
    if (role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admins can broadcast realtime events');
    }

    this.logger.log(`Received realtime event: ${event.entity}.${event.action}`);
    this.gateway.broadcastRealtimeEvent(event);
    return { success: true };
  }
}
