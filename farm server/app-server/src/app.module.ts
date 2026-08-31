import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { EventEmitterModule } from '@nestjs/event-emitter';
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

import { GatewayProxyService } from './shared/proxy/http-proxy.service';
import { GatewayProxyController } from './shared/proxy/proxy.controller';
import { HealthController } from './shared/proxy/health.controller';
import { RoutingService } from './shared/proxy/routing.service';
import { RequestIdMiddleware } from './shared/middleware/request-id.middleware';
import { DeviceInfoMiddleware } from './shared/middleware/device-info.middleware';
import { AuthMiddleware } from './shared/middleware/auth.middleware';
import { RequestLoggingInterceptor } from './shared/interceptors/request-logging.interceptor';
import { TimeoutInterceptor } from './shared/interceptors/timeout.interceptor';
import { ResponseTransformInterceptor } from './shared/interceptors/response-transform.interceptor';
import { AuditLogInterceptor } from './shared/interceptors/audit-log.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),
    EventEmitterModule.forRoot(),
    HttpModule.register({ timeout: 30000, maxRedirects: 3 }),

    // Domain modules
    AuthModule,
    RealtimeModule,
    NotificationModule,
    FarmModule,
    CropModule,
    LivestockModule,
    PoultryModule,
    FinanceModule,
    HrModule,
    OrganizationModule,
    PlatformModule,
    ReportingModule,
  ],
  controllers: [GatewayProxyController, HealthController],
  providers: [
    GatewayProxyService,
    RoutingService,
    RequestLoggingInterceptor,
    TimeoutInterceptor,
    ResponseTransformInterceptor,
    AuditLogInterceptor,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
    consumer
      .apply(DeviceInfoMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
