import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Nest/Express only parse JSON and urlencoded bodies, so multipart uploads
 * arrive as an unconsumed stream. Buffer them here so the gateway proxy can
 * relay the payload downstream byte-for-byte (with the original boundary).
 */
@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RawBodyMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction) {
    const contentType = String(req.headers['content-type'] || '');
    if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
      return next();
    }
    if ((req as any).rawBody !== undefined) {
      return next();
    }

    const chunks: Buffer[] = [];
    let finished = false;

    const done = (err?: Error) => {
      if (finished) return;
      finished = true;
      if (err) {
        this.logger.error(`Failed to buffer multipart body: ${err.message}`);
        return next(err);
      }
      (req as any).rawBody = Buffer.concat(chunks);
      next();
    };

    req.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => done());
    req.on('error', done);
    req.on('aborted', () => done(new Error('Request aborted')));
  }
}
