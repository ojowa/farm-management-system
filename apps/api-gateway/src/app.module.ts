import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { AuthModule } from './modules/auth/auth.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ProxyMiddleware } from './modules/proxy/proxy.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),
    AuthModule,
    RealtimeModule,
  ],
  controllers: [],
  providers: [ProxyMiddleware],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ProxyMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
