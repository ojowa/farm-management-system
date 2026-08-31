import { loadEnv } from '@farm/env';
loadEnv();
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { Module } from '@nestjs/common';
import { RealtimeModule } from '../modules/realtime/realtime.module';
import { rlsMiddleware } from '@farm/database';
import cookieParser from 'cookie-parser';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),
    RealtimeModule,
  ],
})
class RealtimeHttpModule {}

async function bootstrap() {
  const port = Number(process.env.REALTIME_SERVICE_PORT) || 4021;
  const app = await NestFactory.create(RealtimeHttpModule, { logger: ['warn', 'error'] });
  app.use(cookieParser());
  app.use(rlsMiddleware);
  app.useWebSocketAdapter(new IoAdapter(app));
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',').map(s => s.trim()).filter(Boolean),
    credentials: true,
  });
  await app.listen(port);
  console.log(`Realtime Service (HTTP) running on port ${port}`);
}
bootstrap();
