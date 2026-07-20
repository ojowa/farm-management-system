import { Module } from '@nestjs/common';
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
import { PlatformAdminGuard } from './presentation/guards/platform-admin.guard';

@Module({
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
  exports: [PlatformUserService, PlatformOrganizationService, PlatformAdminGuard],
})
export class PlatformModule {}
