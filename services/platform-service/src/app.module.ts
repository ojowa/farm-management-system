import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { PlatformFeaturesController } from './presentation/controllers/platform-features.controller';
import { PlatformSubscriptionsController } from './presentation/controllers/platform-subscriptions.controller';
import { PlatformAuditController } from './presentation/controllers/platform-audit.controller';
import { PlatformHealthController } from './presentation/controllers/platform-health.controller';
import {
  PlatformFeatureFlagService,
  PlatformSubscriptionService,
  PlatformAuditService,
  PlatformHealthService,
} from './application/services/platform.service';
import {
  PrismaFeatureFlagRepository,
  PrismaFeatureFlagOverrideRepository,
  PrismaSubscriptionPlanRepository,
  PrismaAuditLogRepository,
  PrismaSystemHealthRepository,
} from './infrastructure/persistence/prisma-platform.repository';
import { PlatformAdminGuard } from './guards/platform-admin.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  controllers: [
    PlatformFeaturesController,
    PlatformSubscriptionsController,
    PlatformAuditController,
    PlatformHealthController,
  ],
  providers: [
    PlatformFeatureFlagService,
    PlatformSubscriptionService,
    PlatformAuditService,
    PlatformHealthService,
    PlatformAdminGuard,
    { provide: 'FeatureFlagRepository', useClass: PrismaFeatureFlagRepository },
    { provide: 'FeatureFlagOverrideRepository', useClass: PrismaFeatureFlagOverrideRepository },
    { provide: 'SubscriptionPlanRepository', useClass: PrismaSubscriptionPlanRepository },
    { provide: 'AuditLogRepository', useClass: PrismaAuditLogRepository },
    { provide: 'SystemHealthRepository', useClass: PrismaSystemHealthRepository },
  ],
})
export class AppModule {}
