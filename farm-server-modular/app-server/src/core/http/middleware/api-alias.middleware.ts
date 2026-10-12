import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Route `/api/*` and `/v1/api/*` aliases to `/v1/*`.
 *
 * The console (admin Next app) namespaces platform endpoints under `/api/*`
 * and relays them to `${gatewayUrl}/api/...` (e.g. `/api/platform-users`).
 * There is no `api` bounded context — the old gateway stripped the alias
 * prefix before proxying; here we rewrite the URL before Nest routes it.
 */
@Injectable()
export class ApiAliasMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ApiAliasMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction) {
    const url = (req as any).originalUrl || req.url;
    const [path, query] = url.split('?');
    const match = path.match(/^\/(?:v1\/)?api\/(.+)$/);
    if (match) {
      const rewritten = `/v1/${match[1]}${query ? '?' + query : ''}`;
      this.logger.debug(`Rewriting ${path} -> ${rewritten}`);
      (req as any).url = rewritten;
      (req as any).originalUrl = rewritten;
    }
    next();
  }
}