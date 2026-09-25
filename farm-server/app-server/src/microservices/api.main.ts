import { loadEnv } from '@farm/env';
loadEnv();
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { Module } from '@nestjs/common';
import { ApiModule } from '../modules/api/api.module';
import { RealtimeModule } from '../modules/realtime/realtime.module';
import { GatewayExceptionFilter } from '../modules/api/filters/gateway-exception.filter';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),
    ApiModule,
    RealtimeModule,
  ],
})
class ApiHttpModule {}

async function bootstrap() {
  const port = Number(process.env.API_SERVICE_PORT || process.env.PORT) || 4022;
  const app = await NestFactory.create(ApiHttpModule, { logger: ['error', 'warn', 'log', 'debug'] });

  app.setGlobalPrefix('v1');
  app.use(cookieParser());
  app.use(helmet());
  app.useWebSocketAdapter(new IoAdapter(app));
  app.useGlobalFilters(new GatewayExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));

  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 'Authorization', 'X-Request-Id',
      'X-Platform', 'X-App-Version', 'X-Device-Id', 'X-Timeout',
    ],
    exposedHeaders: ['Set-Cookie'],
  });

  const config = new DocumentBuilder()
    .setTitle(process.env.APP_NAME || 'FMS API Router')
    .setDescription('HTTP reverse proxy to microservices')
    .setVersion('2.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, { swaggerOptions: { persistAuthorization: true } });

  await app.listen(port, process.env.LISTEN_HOST || '0.0.0.0');
  console.log(`API Service (HTTP router) running on port ${port}`);
}
bootstrap();
