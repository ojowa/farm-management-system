import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { PlatformFeaturesController } from './presentation/controllers/platform-features.controller';
import { PlatformSubscriptionsController } from './presentation/controllers/platform-subscriptions.controller';
import { PlatformAuditController } from './presentation/controllers/platform-audit.controller';
import { PlatformHealthController } from './presentation/controllers/platform-health.controller';
import { PlatformUsersController } from './presentation/controllers/platform-users.controller';
import { PlatformOrganizationsController } from './presentation/controllers/platform-organizations.controller';
import { PlatformBroadcastsController } from './presentation/controllers/platform-broadcasts.controller';
import { PlatformConfigController } from './presentation/controllers/platform-config.controller';
import { PlatformOptionsController } from './presentation/controllers/platform-options.controller';
import {
  PlatformFeatureFlagService,
  PlatformSubscriptionService,
  PlatformAuditService,
  PlatformHealthService,
  PlatformUserService,
  PlatformOrganizationService,
  PlatformBroadcastService,
  PlatformConfigService,
  PlatformOptionsService,
} from './application/services/platform.service';
import {
  PrismaFeatureFlagRepository,
  PrismaFeatureFlagOverrideRepository,
  PrismaSubscriptionPlanRepository,
  PrismaAuditLogRepository,
  PrismaSystemHealthRepository,
  PrismaBroadcastRepository,
  PrismaPlatformConfigRepository,
} from './infrastructure/persistence/prisma-platform.repository';
import { PlatformAdminGuard } from './guards/platform-admin.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '..', '.env') }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
  ],
  controllers: [
    PlatformFeaturesController,
    PlatformSubscriptionsController,
    PlatformAuditController,
    PlatformHealthController,
    PlatformUsersController,
    PlatformOrganizationsController,
    PlatformBroadcastsController,
    PlatformConfigController,
    PlatformOptionsController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    PlatformFeatureFlagService,
    PlatformSubscriptionService,
    PlatformAuditService,
    PlatformHealthService,
    PlatformUserService,
    PlatformOrganizationService,
    PlatformBroadcastService,
    PlatformConfigService,
    PlatformOptionsService,
    PlatformAdminGuard,
    { provide: 'FeatureFlagRepository', useClass: PrismaFeatureFlagRepository },
    { provide: 'FeatureFlagOverrideRepository', useClass: PrismaFeatureFlagOverrideRepository },
    { provide: 'SubscriptionPlanRepository', useClass: PrismaSubscriptionPlanRepository },
    { provide: 'AuditLogRepository', useClass: PrismaAuditLogRepository },
    { provide: 'SystemHealthRepository', useClass: PrismaSystemHealthRepository },
    { provide: 'BroadcastRepository', useClass: PrismaBroadcastRepository },
    { provide: 'PlatformConfigRepository', useClass: PrismaPlatformConfigRepository },
  ],
})
export class AppModule {}
