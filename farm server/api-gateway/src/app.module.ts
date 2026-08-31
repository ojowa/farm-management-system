import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { GatewayProxyService } from '../infrastructure/routing/http-proxy.service';
import { GatewayProxyController } from '../presentation/controllers/proxy.controller';
import { HealthController } from '../presentation/controllers/health.controller';
import { RequestIdMiddleware } from '../middleware/request-id.middleware';
import { DeviceInfoMiddleware } from '../middleware/device-info.middleware';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { RequestLoggingInterceptor } from '../interceptors/request-logging.interceptor';
import { TimeoutInterceptor } from '../interceptors/timeout.interceptor';
import { ResponseTransformInterceptor } from '../interceptors/response-transform.interceptor';
import { AuditLogInterceptor } from '../interceptors/audit-log.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '..', '.env') }),
    HttpModule.register({ timeout: 30000, maxRedirects: 3 }),
    RealtimeModule,
  ],
  controllers: [GatewayProxyController, HealthController],
  providers: [
    GatewayProxyService,
    RequestLoggingInterceptor,
    TimeoutInterceptor,
    ResponseTransformInterceptor,
    AuditLogInterceptor,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply middleware in order: request-id → device-info → auth
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
