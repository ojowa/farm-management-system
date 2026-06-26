import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { extractBearerToken, verifyAccessToken, userHasAnyRole } from '@farm/auth';

/**
 * @deprecated Prefer `JwtAuthGuard` + `AuthorizationGuard` from `@farm/auth`.
 * Retained because the existing `auth.controller.ts` references it.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: { id: string; role: string } }>();

    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }
    try {
      req.user = verifyAccessToken(token);
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (!userHasAnyRole(req.user.role, requiredRoles)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
