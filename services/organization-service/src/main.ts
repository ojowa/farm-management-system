import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe());
  const port = process.env.ORGANIZATION_SERVICE_PORT || 3010;
  await app.listen(port);
  console.log(`Organization Service is running on: http://localhost:${port}`);
}
bootstrap();
