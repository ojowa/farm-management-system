import { Controller, All, Req, Res, Next } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { GatewayProxyService } from '../infrastructure/routing/http-proxy.service';

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
    const path = fullPath.replace(/^\/?v1\//, '').replace(/^\/?/, '');
    const segment = path.split('/')[0];

    if (!segment || !this.proxyService.findService(path)) {
      return next();
    }

    const verifiedUser = (req as any).verifiedUser || null;
    const serviceToken = (req as any).serviceToken || null;

    return this.proxyService
      .proxyRequest(req, res, path, verifiedUser, serviceToken)
      .then((data) => res.json(data))
      .catch(next);
  }
}
