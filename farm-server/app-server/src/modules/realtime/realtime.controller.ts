import { Controller, Post, Body, Logger, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard } from '@farm/auth-server/nestjs';
import { PlatformAdminGuard } from '../platform/presentation/guards/platform-admin.guard';
import { EventBus } from './event-bus';
import { RealtimeEvent } from './realtime.gateway';

// Broadcasting a realtime event to every connected client is a platform-wide
// action. The previous check compared the JWT's role *name* to 'PLATFORM_ADMIN',
// which no canonical role is named (ROLES = SUPER_ADMIN/SUPPORT_ADMIN/…), so
// the route was permanently 403 for everyone. PlatformAdminGuard reads the
// DB-backed `role.isPlatformAdmin` flag — the same check the other platform
// controllers use.
@UseGuards(JwtAuthGuard, AuthorizationGuard, PlatformAdminGuard)
@Controller('realtime')
export class RealtimeController {
  private logger = new Logger(RealtimeController.name);

  constructor(private readonly eventBus: EventBus) {}

  @Post('emit')
  handleEmitEvent(@Body() event: RealtimeEvent, @Req() req: any) {
    this.logger.log(`Received realtime event: ${event.entity}.${event.action}`);
    this.eventBus.emitDomainEvent(event.entity, event.action as any, event.data);
    return { success: true };
  }
}
