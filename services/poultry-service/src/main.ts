import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { rlsMiddleware } from '@farm/database';

import { AllExceptionsFilter } from './filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(rlsMiddleware);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe());
  const port = process.env.POULTRY_SERVICE_PORT || 4004;
  await app.listen(port);
  console.log(`Poultry service is running on: http://localhost:${port}`);
}
bootstrap();
