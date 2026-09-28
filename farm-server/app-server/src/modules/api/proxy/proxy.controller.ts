import { Controller, All, Req, Res, Next } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { GatewayProxyService } from './http-proxy.service';

@Controller()
export class GatewayProxyController {
  private readonly publicRoutes = new Set([
    'auth/login',
    'auth/register',
    'auth/register-console',
    'auth/refresh',
    'auth/verify-mfa',
    'auth/otp/send',
    'auth/otp/verify',
    'auth/password/forgot',
    'auth/password/reset',
    'auth/biometric/login',
  ]);

  constructor(private readonly proxyService: GatewayProxyService) {}

  @All('*')
  proxyAll(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    const fullPath = req.url.split('?')[0];
    let path = fullPath.replace(/^\/?v1\//, '').replace(/^\/?/, '');

    // The console app namespaces its platform endpoints under /api/*
    // (e.g. /api/platform-users) and relies on the Next rewrite to relay them
    // to `${gatewayUrl}/api/...`. There is no "api" service behind the
    // gateway, so drop the alias prefix whenever the remainder routes to a
    // real service segment.
    const withoutApiAlias = path.replace(/^api\//, '');
    if (withoutApiAlias !== path && this.proxyService.findService(withoutApiAlias)) {
      path = withoutApiAlias;
    }

    const segment = path.split('/')[0];

    if (!segment || !this.proxyService.findService(path)) {
      return next();
    }

    const verifiedUser = (req as any).verifiedUser || null;
    const serviceToken = (req as any).serviceToken || null;

    return this.proxyService
      .proxyRequest(req, res, path, verifiedUser, serviceToken)
      .then(({ status, body, setCookie }) => {
        if (setCookie && setCookie.length) {
          res.setHeader('Set-Cookie', setCookie);
        }
        res.status(status).json(body);
      })
      .catch(next);
  }
}
