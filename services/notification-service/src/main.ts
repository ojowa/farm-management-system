import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe());
  app.useWebSocketAdapter(new IoAdapter(app));

  const port = process.env.NOTIFICATION_SERVICE_PORT || 3006;
  await app.listen(port);
  console.log(`Notification Service is running on: http://localhost:${port}`);
}

bootstrap();