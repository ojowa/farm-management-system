import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeController } from './realtime.controller';
import { RealtimeInternalController } from './realtime-internal.controller';
import { EventBus } from './event-bus';

@Module({
  controllers: [RealtimeController, RealtimeInternalController],
  providers: [RealtimeGateway, EventBus],
  exports: [RealtimeGateway, EventBus],
})
export class RealtimeModule {}
