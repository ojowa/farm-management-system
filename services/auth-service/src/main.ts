import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

function jwtAuthMiddleware(req: any, _res: any, next: () => void) {
  let token: string | null = null;

  if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  } else {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
      }
    }
  }

  if (token) {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET environment variable is required');
      const decoded = jwt.verify(token, secret);
      req.user = decoded;
    } catch {
      // JWT verification failed — continue unauthenticated
    }
  }

  next();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.use(jwtAuthMiddleware);
  app.useGlobalFilters(new AllExceptionsFilter());
  const port = process.env.AUTH_SERVICE_PORT || 4001;
  await app.listen(port);
  console.log(`Auth service is running on: http://localhost:${port}`);
}
bootstrap();
