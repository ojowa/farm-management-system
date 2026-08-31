import { loadEnv } from '@farm/env';
loadEnv();
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { Module } from '@nestjs/common';
import { ReportingModule } from '../modules/reporting/reporting.module';
import { rlsMiddleware } from '@farm/database';
import cookieParser from 'cookie-parser';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),
    ReportingModule,
  ],
})
class ReportingHttpModule {}

async function bootstrap() {
  const port = Number(process.env.REPORTING_SERVICE_PORT) || 4019;
  const app = await NestFactory.create(ReportingHttpModule, { logger: ['warn', 'error'] });
  app.use(cookieParser());
  app.use(rlsMiddleware);
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',').map(s => s.trim()).filter(Boolean),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(port);
  console.log(`Reporting Service (HTTP) running on port ${port}`);
}
bootstrap();
