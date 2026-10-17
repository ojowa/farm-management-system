import { loadEnv } from './kernel/env';
loadEnv();
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

/**
 * Configure the modular monolith without binding a port.
 *
 * Used by the CLI bootstrap below (Render / local `node dist/main.js`) and by
 * `server.js`, the Vercel serverless entrypoint, which wraps the returned
 * Express instance in its own http.Server instead of calling `app.listen()`.
 *
 * Global pipes/filters/interceptors and middleware are registered in
 * AppModule (APP_* tokens + MiddlewareConsumer), so both entrypoints get an
 * identically configured application.
 */
export async function createApp() {
  // rawBody: true keeps the exact request bytes on req.rawBody so the
  // Paystack webhook can verify its x-paystack-signature HMAC over them
  // (re-parsed JSON would not byte-match the signed payload).
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    rawBody: true,
  });

  // Behind Render's load balancer, trust X-Forwarded-For so req.ip (used for
  // rate limiting and audit logs) is the real client instead of the proxy.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Single public surface: controllers are declared unprefixed (as the old
  // domain services were) and the gateway's /v1 prefix is applied here.
  app.setGlobalPrefix('v1');
  app.use(cookieParser());
  app.use(helmet());
  app.useWebSocketAdapter(new IoAdapter(app));

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
    .setTitle(process.env.APP_NAME || 'FMS API')
    .setDescription('Farm Management System — modular monolith API')
    .setVersion('2.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, { swaggerOptions: { persistAuthorization: true } });

  await app.init();
  return app;
}

async function bootstrap() {
  const port = Number(process.env.API_SERVICE_PORT || process.env.PORT) || 4022;
  const app = await createApp();
  await app.listen(port, process.env.LISTEN_HOST || '0.0.0.0');
  console.log(`Farm API (modular monolith) running on port ${port}`);
}

// Only listen when executed directly (`node dist/main.js`);
// `server.js` (Vercel) requires this module and calls createApp() itself.
if (require.main === module) {
  bootstrap();
}