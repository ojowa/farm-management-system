import { loadEnv } from '@farm/env';
loadEnv();
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { Module } from '@nestjs/common';
import { PoultryModule } from '../modules/poultry/poultry.module';
import { rlsMiddleware } from '@farm/database';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),
    PoultryModule,
  ],
})
class PoultryHttpModule {}

async function bootstrap() {
  const port = Number(process.env.POULTRY_SERVICE_PORT) || 4013;
  const app = await NestFactory.create(PoultryHttpModule, { logger: ['warn', 'error'] });
  app.use(cookieParser());
  app.use(helmet());
  app.use(rlsMiddleware);
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',').map(s => s.trim()).filter(Boolean),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(port, process.env.LISTEN_HOST || '0.0.0.0');
  console.log(`Poultry Service running on http://0.0.0.0:${port}`);
}
bootstrap();
