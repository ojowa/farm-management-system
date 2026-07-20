import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeController } from './realtime.controller';
import { EventBus } from './event-bus';

@Module({
  controllers: [RealtimeController],
  providers: [RealtimeGateway, EventBus],
  exports: [RealtimeGateway, EventBus],
})
export class RealtimeModule {}
