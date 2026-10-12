import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class DeviceInfoMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const userAgent = req.headers['user-agent'] || '';
    const platform = req.headers['x-platform'] || 'unknown';
    const appVersion = req.headers['x-app-version'] || 'unknown';
    const deviceId = req.headers['x-device-id'] || '';

    (req as any).deviceInfo = {
      userAgent,
      platform,
      appVersion,
      deviceId,
    };

    next();
  }
}
