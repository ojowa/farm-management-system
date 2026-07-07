import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { rlsMiddleware } from '@farm/database';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(rlsMiddleware);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe());
  const port = process.env.REPORTING_SERVICE_PORT || 4008;
  await app.listen(port);
  console.log(`Reporting service is running on: http://localhost:${port}`);
}
bootstrap();
