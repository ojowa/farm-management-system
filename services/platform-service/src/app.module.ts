import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlatformAuthModule } from './modules/platform-auth/platform-auth.module';
import { PlatformUsersModule } from './modules/platform-users/platform-users.module';
import { PlatformOrganizationsModule } from './modules/platform-organizations/platform-organizations.module';
import { PlatformFeaturesModule } from './modules/platform-features/platform-features.module';
import { PlatformSubscriptionsModule } from './modules/platform-subscriptions/platform-subscriptions.module';
import { PlatformHealthModule } from './modules/platform-health/platform-health.module';
import { PlatformAuditModule } from './modules/platform-audit/platform-audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PlatformAuthModule,
    PlatformUsersModule,
    PlatformOrganizationsModule,
    PlatformFeaturesModule,
    PlatformSubscriptionsModule,
    PlatformHealthModule,
    PlatformAuditModule,
  ],
})
export class AppModule {}
