import { loadEnv } from '@farm/env';
import { AllExceptionsFilter } from '../shared/filters/all-exceptions.filter';
loadEnv();
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { Module } from '@nestjs/common';
import { AuthModule } from '../modules/auth/auth.module';
import { FarmModule } from '../modules/farm/farm.module';
import { LivestockModule } from '../modules/livestock/livestock.module';
import { PoultryModule } from '../modules/poultry/poultry.module';
import { FinanceModule } from '../modules/finance/finance.module';
import { HrModule } from '../modules/hr/hr.module';
import { NotificationModule } from '../modules/notification/notification.module';
import { OrganizationModule } from '../modules/organization/organization.module';
import { PlatformModule } from '../modules/platform/platform.module';
import { ReportingModule } from '../modules/reporting/reporting.module';
import { CropModule } from '../modules/crop/crop.module';
import { rlsMiddleware } from '@farm/database';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),
    AuthModule,
    FarmModule,
    LivestockModule,
    PoultryModule,
    FinanceModule,
    HrModule,
    NotificationModule,
    OrganizationModule,
    PlatformModule,
    ReportingModule,
    CropModule,
  ],
})
class DomainsHttpModule {}

async function bootstrap() {
  const port = Number(process.env.DOMAINS_SERVICE_PORT) || 4099;
  const app = await NestFactory.create(DomainsHttpModule, { logger: ['error', 'warn', 'log'] });
  // The gateway forwards the client IP via X-Forwarded-For; without this,
  // req.ip is the gateway's localhost address and every user shares one
  // rate-limit bucket per route.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(cookieParser());
  app.use(helmet());
  app.use(rlsMiddleware);
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',').map(s => s.trim()).filter(Boolean),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(port, process.env.LISTEN_HOST || '0.0.0.0');
  console.log(`Domains Service running on http://${process.env.LISTEN_HOST || '0.0.0.0'}:${port}`);
}
bootstrap();
