import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { GatewayProxyService } from './proxy/http-proxy.service';
import { GatewayProxyController } from './proxy/proxy.controller';
import { HealthController } from './proxy/health.controller';
import { RoutingService } from './proxy/routing.service';
import { RequestIdMiddleware } from './middleware/request-id.middleware';
import { DeviceInfoMiddleware } from './middleware/device-info.middleware';
import { AuthMiddleware } from './middleware/auth.middleware';
import { RequestLoggingInterceptor } from './interceptors/request-logging.interceptor';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';
import { ResponseTransformInterceptor } from './interceptors/response-transform.interceptor';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

@Module({
  controllers: [HealthController, GatewayProxyController],
  providers: [
    GatewayProxyService,
    RoutingService,
    RequestLoggingInterceptor,
    TimeoutInterceptor,
    ResponseTransformInterceptor,
    AuditLogInterceptor,
  ],
  exports: [GatewayProxyService, RoutingService],
})
export class ApiModule {
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
