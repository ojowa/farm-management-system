import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';

import { AuthModule } from './modules/auth/auth.module';
import { FarmModule } from './modules/farm/farm.module';
import { CropModule } from './modules/crop/crop.module';
import { LivestockModule } from './modules/livestock/livestock.module';
import { PoultryModule } from './modules/poultry/poultry.module';
import { FinanceModule } from './modules/finance/finance.module';
import { HrModule } from './modules/hr/hr.module';
import { NotificationModule } from './modules/notification/notification.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { PlatformModule } from './modules/platform/platform.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { RealtimeModule } from './modules/realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),

    // Domain modules
    AuthModule,
    FarmModule,
    CropModule,
    LivestockModule,
    PoultryModule,
    FinanceModule,
    HrModule,
    NotificationModule,
    OrganizationModule,
    PlatformModule,
    ReportingModule,
    RealtimeModule,
  ],
})
export class AppModule {}
