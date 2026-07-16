import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { join } from 'path';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { RoutingService } from './application/services/routing.service';
import { ProxyMiddleware } from './infrastructure/routing/proxy.middleware';
import { HealthController } from './presentation/controllers/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),
    HttpModule,
    RealtimeModule,
  ],
  controllers: [HealthController],
  providers: [RoutingService, ProxyMiddleware],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ProxyMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
