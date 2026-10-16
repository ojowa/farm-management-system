import { Module, MiddlewareConsumer, NestModule, RequestMethod, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';

// ---- Bounded contexts (each exposes its public API via modules/<name>) ----
import { AuthModule } from './modules/auth';
import { FarmModule } from './modules/farm';
import { CropModule } from './modules/crop';
import { LivestockModule } from './modules/livestock';
import { PoultryModule } from './modules/poultry';
import { FinanceModule } from './modules/finance';
import { HrModule } from './modules/hr';
import { NotificationModule } from './modules/notification';
import { OrganizationModule } from './modules/organization';
import { PlatformModule } from './modules/platform';
import { ReportingModule } from './modules/reporting';
import { RealtimeModule } from './modules/realtime';
import { WeatherModule } from './modules/weather';

// ---- Application core (HTTP pipeline shared by all modules) ----
import { HealthController } from './core/http/health.controller';
import { ApiAliasMiddleware } from './core/http/middleware/api-alias.middleware';
import { RequestIdMiddleware } from './core/http/middleware/request-id.middleware';
import { DeviceInfoMiddleware } from './core/http/middleware/device-info.middleware';
import { AuthMiddleware } from './core/http/middleware/auth.middleware';
import { RlsContextMiddleware } from './core/http/middleware/rls-context.middleware';
import { EnvelopeInterceptor } from './core/http/interceptors/envelope.interceptor';
import { ApiExceptionFilter } from './core/http/filters/api-exception.filter';

/**
 * Root composition of the modular monolith.
 *
 * Every bounded context runs in one process and one HTTP surface:
 *  - cross-cutting HTTP behaviour lives in `core/http` and is applied
 *    globally here (pipes, filters, interceptors, middleware);
 *  - feature code lives in `modules/<context>` and is only ever reached
 *    through each module's public `index.ts`;
 *  - modules never import each other's internals — cross-module reactions
 *    go through the in-process EventBus (modules/realtime).
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '.env') }),
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
    WeatherModule,
  ],
  controllers: [HealthController],
  providers: [
    // Same ValidationPipe configuration the old domain services used.
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, transform: true }),
    },
    // Single error shape: `{ success:false, data/error:{statusCode,...} }` —
    // supersedes the old gateway filter + per-service filter pair.
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    // Replicates the old gateway's response envelope
    // (`{ success, data, timestamp, requestId }`) for every JSON response.
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        ApiAliasMiddleware,   // /api/* and /v1/api/* → /v1/* (console Next rewrites)
        RequestIdMiddleware,  // X-Request-Id propagation
        DeviceInfoMiddleware, // req.deviceInfo from X-Platform/X-App-Version/X-Device-Id
        AuthMiddleware,       // verify access token → req.verifiedUser (+401 on non-public paths)
        RlsContextMiddleware, // verifiedUser → Prisma RLS AsyncLocalStorage context
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}