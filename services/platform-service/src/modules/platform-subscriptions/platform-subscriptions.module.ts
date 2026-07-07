import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlatformSubscriptionsController } from './platform-subscriptions.controller';
import { PlatformSubscriptionsService } from './platform-subscriptions.service';
import { PlatformAdminGuard } from '../../guards/platform-admin.guard';

@Module({
  imports: [ConfigModule],
  controllers: [PlatformSubscriptionsController],
  providers: [PlatformSubscriptionsService, PlatformAdminGuard],
})
export class PlatformSubscriptionsModule {}
