import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { extractBearerToken, verifyAccessToken, type VerifiedUser } from '@farm/auth';

/**
 * Passport-free JWT guard. Replaces the previous Passport-based version so
 * downstream services can opt into auth without depending on `@nestjs/passport`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: VerifiedUser }>();
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }
    try {
      req.user = verifyAccessToken(token);
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return true;
  }
}
