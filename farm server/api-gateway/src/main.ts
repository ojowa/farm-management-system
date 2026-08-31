import { loadEnv } from '@farm/env';
loadEnv();
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GatewayExceptionFilter } from './filters/gateway-exception.filter';
import { RequestIdMiddleware } from './middleware/request-id.middleware';
import { DeviceInfoMiddleware } from './middleware/device-info.middleware';
import { AuthMiddleware } from './middleware/auth.middleware';
import { RequestLoggingInterceptor } from './interceptors/request-logging.interceptor';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';
import { ResponseTransformInterceptor } from './interceptors/response-transform.interceptor';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  app.setGlobalPrefix('v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GatewayExceptionFilter());
  app.useGlobalInterceptors(
    app.get(RequestLoggingInterceptor),
    app.get(TimeoutInterceptor),
    app.get(ResponseTransformInterceptor),
    app.get(AuditLogInterceptor),
  );

  app.use(cookieParser());

  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'X-Platform',
      'X-App-Version',
      'X-Device-Id',
      'X-Timeout',
    ],
    exposedHeaders: ['Set-Cookie'],
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  app.useWebSocketAdapter(new IoAdapter(app));

  const config = new DocumentBuilder()
    .setTitle('Farm Management API Gateway')
    .setDescription('FMS API Gateway — HTTP Reverse Proxy to Microservices')
    .setVersion('2.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication → auth-service:4010')
    .addTag('farms', 'Farm management → farm-service:4011')
    .addTag('livestock', 'Livestock → livestock-service:4012')
    .addTag('poultry', 'Poultry → poultry-service:4013')
    .addTag('finance', 'Finance → finance-service:4014')
    .addTag('hr', 'HR & workers → hr-service:4015')
    .addTag('notifications', 'Notifications → notification-service:4016')
    .addTag('organizations', 'Organizations → organization-service:4017')
    .addTag('platform', 'Platform admin → platform-service:4018')
    .addTag('reports', 'Reporting → reporting-service:4019')
    .addTag('crops', 'Crop lifecycle → crop-service:4020')
    .addTag('realtime', 'WebSocket realtime → realtime-service:4021')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.API_GATEWAY_PORT || 4000;
  await app.listen(port, '0.0.0.0');
  new Logger('ApiGateway').log(`API Gateway running on port ${port} (0.0.0.0)`);
  new Logger('ApiGateway').log(
    `Microservices: auth:4010, farm:4011, livestock:4012, poultry:4013, finance:4014, hr:4015, notification:4016, organization:4017, platform:4018, reporting:4019, crop:4020, realtime:4021`,
  );
}
bootstrap();
