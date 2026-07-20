import { Controller, Post, Body, Logger, Req, ForbiddenException } from '@nestjs/common';
import { EventBus } from './event-bus';
import { RealtimeEvent } from './realtime.gateway';

@Controller('realtime')
export class RealtimeController {
  private logger = new Logger(RealtimeController.name);

  constructor(private readonly eventBus: EventBus) {}

  @Post('emit')
  handleEmitEvent(@Body() event: RealtimeEvent, @Req() req?: any) {
    const role = req?.headers?.['x-user-role'];
    if (role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admins can broadcast realtime events');
    }

    this.logger.log(`Received realtime event: ${event.entity}.${event.action}`);
    this.eventBus.emitDomainEvent(event.entity, event.action as any, event.data);
    return { success: true };
  }
}
