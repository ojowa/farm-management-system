import { Controller, Post, Body, Logger } from '@nestjs/common';
import { RealtimeGateway, RealtimeEvent } from './realtime.gateway';

@Controller('realtime')
export class RealtimeController {
  private logger = new Logger(RealtimeController.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  @Post('emit')
  handleEmitEvent(@Body() event: RealtimeEvent) {
    this.logger.log(`Received realtime event: ${event.entity}.${event.action}`);
    this.gateway.broadcastRealtimeEvent(event);
    return { success: true };
  }
}
