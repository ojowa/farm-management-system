import { loadEnv } from '@farm/env';
loadEnv();
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { rlsMiddleware } from '@farm/database';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['warn', 'error'] });

  app.use(cookieParser());
  app.use(helmet());

  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Requested-With', 'Authorization'],
    exposedHeaders: ['Set-Cookie'],
  });

  app.use(rlsMiddleware);
  app.useWebSocketAdapter(new IoAdapter(app));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.APP_SERVER_PORT) || 4001;
  await app.listen(port);
  console.log(`App Server (modular monolith) is running on: http://localhost:${port}`);
}
bootstrap();
